const crypto = require('crypto');
const mongoose = require('mongoose');
const EmailJob = require('./email.model');
const createTransporter = require('../../config/mail');
const nodemailer = require('nodemailer');
const logger = require('../../utils/logger.util');
const AppError = require('../../utils/appError.util');
const EmailAuditLogService = require('../audit_logs/email_audit_log/email_log.service');
const { AUDIT_ACTIONS } = require('../../constants/audit');

class EmailService {
    static transporter = null;
    static LOCK_TTL_MS = 10 * 60 * 1000;
    static LOCK_RENEW_MS = 60 * 1000;

    static async _getTransporter() {
        if (!this.transporter) {
            this.transporter = await createTransporter();
        }
        return this.transporter;
    }

    static async verifyTransporter() {
        const transporter = await this._getTransporter();
        await transporter.verify();
    }

    static _startLockHeartbeat(jobId, lockToken) {
        const heartbeat = setInterval(() => {
            EmailJob.updateOne(
                { _id: jobId, status: 'processing', lock_token: lockToken },
                { $set: { locked_until: new Date(Date.now() + this.LOCK_TTL_MS) } }
            ).catch(error => {
                logger.error({ event: 'email_lock_heartbeat_failed', job_id: jobId, error: error.message });
            });
        }, this.LOCK_RENEW_MS);

        if (typeof heartbeat.unref === 'function') {
            heartbeat.unref();
        }

        return heartbeat;
    }

    static async processOneJob() {
        const now = new Date();
        const lockToken = crypto.randomUUID();
        const lockUntil = new Date(Date.now() + this.LOCK_TTL_MS);
        const legacyProcessingTimeout = new Date(Date.now() - this.LOCK_TTL_MS);

        const job = await EmailJob.findOneAndUpdate(
            {
                $and: [
                    {
                        $or: [
                            { status: { $in: ['pending', 'failed'] } },
                            { status: 'processing', locked_until: { $lte: now } },
                            {
                                status: 'processing',
                                locked_until: { $exists: false },
                                updatedAt: { $lt: legacyProcessingTimeout }
                            }
                        ]
                    },
                    { $expr: { $lt: ["$retry_count", "$max_retries"] } },
                    { scheduled_at: { $lte: now } }
                ]
            },
            {
                $set: {
                    status: 'processing',
                    lock_token: lockToken,
                    locked_until: lockUntil,
                    processing_started_at: now
                }
            },
            {
                new: true,
                sort: { scheduled_at: 1 },
                runValidators: true
            }
        );

        if (!job) return;

        let markedSent = null;
        const heartbeat = this._startLockHeartbeat(job._id, lockToken);

        try {
            const transporter = await this._getTransporter();

            markedSent = await EmailJob.findOneAndUpdate(
                { _id: job._id, status: 'processing', lock_token: lockToken },
                {
                    $set: {
                        status: 'sent',
                        sent_at: new Date(),
                        error_message: null
                    },
                    $unset: {
                        lock_token: "",
                        locked_until: "",
                        processing_started_at: ""
                    }
                },
                { new: true, runValidators: true }
            );

            clearInterval(heartbeat);

            if (!markedSent) return;

            const info = await transporter.sendMail({
                from: `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM_ADDRESS}>`,
                to: markedSent.to.join(','),
                subject: this._getSubject(markedSent),
                html: this._renderHtml(markedSent)
            });

            const testUrl = nodemailer.getTestMessageUrl(info);

            logger.info({
                event: 'email_sent',
                job_id: markedSent._id,
                template: markedSent.template,
                to: markedSent.to,
                preview: testUrl || null
            });

            await this._createEmailAuditLog({
                action: AUDIT_ACTIONS.EMAIL_SEND_SUCCESS,
                job: markedSent,
                actorType: 'SYSTEM',
                changes: {
                    status: {
                        from: 'processing',
                        to: 'sent'
                    },
                    sent_at: {
                        from: null,
                        to: markedSent.sent_at
                    },
                    transport: {
                        from: null,
                        to: {
                            preview_available: Boolean(testUrl)
                        }
                    }
                }
            });

        } catch (error) {
            const retryCount = job.retry_count + 1;
            const delayInMinutes = Math.min(
                Math.pow(2, retryCount) * 5,
                60
            );

            const filter = markedSent
                ? { _id: job._id, status: 'sent' }
                : { _id: job._id, status: 'processing', lock_token: lockToken };

            const update = {
                $set: {
                    status: 'failed',
                    retry_count: retryCount,
                    error_message: error.message,
                    scheduled_at: new Date(Date.now() + delayInMinutes * 60000)
                },
                $unset: {
                    lock_token: "",
                    locked_until: "",
                    processing_started_at: ""
                }
            };

            if (markedSent) {
                update.$unset.sent_at = "";
            }

            const failedJob = await EmailJob.findOneAndUpdate(
                filter,
                update,
                { new: true, runValidators: true }
            );

            if (failedJob) {
                await this._createEmailAuditLog({
                    action: AUDIT_ACTIONS.EMAIL_SEND_FAILED,
                    job: failedJob,
                    actorType: 'SYSTEM',
                    changes: {
                        status: {
                            from: markedSent ? 'sent' : 'processing',
                            to: failedJob.status
                        },
                        retry_count: {
                            from: job.retry_count,
                            to: failedJob.retry_count
                        },
                        next_retry_at: {
                            from: job.scheduled_at || null,
                            to: failedJob.scheduled_at || null
                        },
                        will_retry: {
                            from: null,
                            to: failedJob.retry_count < failedJob.max_retries
                        },
                        error: {
                            from: null,
                            to: this._summarizeError(error)
                        }
                    }
                });
            }

            logger.error({ event: 'email_job_failed', job_id: job._id, error: error.message });
        } finally {
            clearInterval(heartbeat);
        }
    }

    static async enqueueEmail({
        to,
        template,
        payload,
        scheduledAt = null,
        actorId = null,
        actorType = 'USER',
        userId = null,
        orderId = null,
        auditMetadata = {}
    }, options = {}) {
        if (template === 'RESET_PASSWORD_LINK' && !payload?.reset_url) {
            throw new AppError('reset_url is required', 400, 'INVALID_EMAIL_PAYLOAD');
        }

        if (template === 'RESET_PASSWORD_LINK') {
            this._normalizeHttpUrl(payload.reset_url);
        }

        if (template === 'FORGOT_PASSWORD_OTP') {
            if (!payload?.otp || !payload.email || !payload.expires_in) {
                throw new AppError('Invalid OTP payload', 400, 'INVALID_EMAIL_PAYLOAD');
            }
        }
        const jobPayload = {
            to,
            template,
            payload,
            user_id: userId || null,
            order_id: orderId || null,
            scheduled_at: scheduledAt || new Date()
        };

        const job = options.session
            ? (await EmailJob.create([jobPayload], { session: options.session }))[0]
            : await EmailJob.create(jobPayload);

        await this._createEmailAuditLog({
            action: AUDIT_ACTIONS.ENQUEUE_EMAIL,
            job,
            actorId,
            actorType,
            metadata: auditMetadata,
            changes: {
                job: {
                    from: null,
                    to: this._summarizeJob(job)
                },
                status: {
                    from: null,
                    to: job.status
                },
                scheduled_at: {
                    from: null,
                    to: job.scheduled_at
                }
            }
        }, options);

        return job;
    }

    static _escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, (char) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char]));
    }

    static _normalizeHttpUrl(value) {
        try {
            const url = new URL(String(value));
            if (!['http:', 'https:'].includes(url.protocol)) {
                throw new Error('Unsupported URL protocol');
            }
            return url.toString();
        } catch (error) {
            throw new AppError('reset_url is invalid', 400, 'INVALID_EMAIL_PAYLOAD');
        }
    }

    static _sanitizeSubjectValue(value) {
        return String(value ?? '').replace(/[\r\n]+/g, ' ').trim();
    }

    static _getSubject(job) {
        const orderId = this._sanitizeSubjectValue(job.payload.order_id);
        const subjects = {
            ORDER_CONFIRMATION: `Xác nhận đơn hàng #${orderId}`,
            ORDER_DELIVERED: `Đơn hàng #${orderId} đã được giao`,
            REGISTER_SUCCESS: 'Chào mừng bạn đến với NguyenLien Shop',
            FORGOT_PASSWORD_OTP: 'Mã xác nhận đặt lại mật khẩu',
            RESET_PASSWORD_LINK: 'Yêu cầu đặt lại mật khẩu'
        };
        return subjects[job.template] || 'Thông báo từ NguyenLien Shop';
    }

    static _renderHtml(job) {
        const { payload } = job;
        if (job.template === 'ORDER_CONFIRMATION') {
            const userName = this._escapeHtml(payload.user_name);
            const orderId = this._escapeHtml(payload.order_id);
            const totalAmount = this._escapeHtml(payload.total_amount);
            return `<h1>Chào ${userName}</h1><p>Đơn hàng <b>${orderId}</b> trị giá <b>${totalAmount}đ</b> đã đặt thành công!</p>`;
        }
        if (job.template === 'RESET_PASSWORD_LINK') {
            const resetUrl = this._escapeHtml(this._normalizeHttpUrl(payload.reset_url));
            return `
        <p>Click vào link bên dưới để đặt lại mật khẩu:</p>
        <a href="${resetUrl}">Reset Password</a>
    `;
        }
        if (job.template === 'FORGOT_PASSWORD_OTP') {
            const email = this._escapeHtml(payload.email);
            const otp = this._escapeHtml(payload.otp);
            const expiresIn = this._escapeHtml(payload.expires_in);
            return `
        <h2>Đặt lại mật khẩu</h2>
        <p>Chào ${email},</p>
        <p>Mã OTP của bạn là:</p>
<h1>${otp}</h1>
        <p>Mã có hiệu lực trong ${expiresIn} phút.</p>
        <p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
    `;
        }
        return `<h3>Thông báo từ hệ thống</h3><p>Payload: ${this._escapeHtml(JSON.stringify(payload))}</p>`;
    }

    static _maskEmail(value) {
        const email = String(value || '').trim().toLowerCase();
        const [local, domain] = email.split('@');

        if (!local || !domain) {
            return null;
        }

        const visible = local.slice(0, Math.min(2, local.length));
        return `${visible}${'*'.repeat(Math.max(local.length - visible.length, 1))}@${domain}`;
    }

    static _summarizeJob(job) {
        return {
            job_id: job._id,
            template: job.template,
            status: job.status,
            user_id: job.user_id || null,
            order_id: job.order_id || null,
            recipient_count: Array.isArray(job.to) ? job.to.length : 0,
            recipients: Array.isArray(job.to)
                ? job.to.map(email => this._maskEmail(email)).filter(Boolean)
                : [],
            retry_count: job.retry_count || 0,
            max_retries: job.max_retries || 0,
            scheduled_at: job.scheduled_at || null,
            sent_at: job.sent_at || null
        };
    }

    static _summarizeError(error) {
        return {
            name: error?.name || 'Error',
            message: String(error?.message || 'Email send failed').slice(0, 250)
        };
    }

    static _toAuditValue(value) {
        if (value === undefined || value === null) {
            return null;
        }
        if (value instanceof Date) {
            return value.toISOString();
        }
        if (value instanceof mongoose.Types.ObjectId) {
            return value.toString();
        }
        if (Array.isArray(value)) {
            return value.map(item => this._toAuditValue(item));
        }
        if (value?.toObject) {
            return this._toAuditValue(value.toObject());
        }
        if (typeof value === 'object') {
            return Object.fromEntries(
                Object.entries(value).map(([key, item]) => [
                    key,
                    this._toAuditValue(item),
                ])
            );
        }

        return value;
    }

    static async _createEmailAuditLog({
        action,
        job,
        actorId = null,
        actorType = 'USER',
        metadata = {},
        changes = {}
    }, options = {}) {
        await EmailAuditLogService.createLog({
            actor_id: actorId,
            actor_type: actorType,
            action,
            email_job_id: job._id,
            user_id: job.user_id || actorId || null,
            order_id: job.order_id || null,
            template: job.template,
            status: job.status || null,
            recipient_count: Array.isArray(job.to) ? job.to.length : 0,
            recipients: Array.isArray(job.to)
                ? job.to.map(email => this._maskEmail(email)).filter(Boolean)
                : [],
            changes: this._toAuditValue(changes),
            ip_address: metadata.ip || null,
            user_agent: metadata.userAgent || null
        }, options);
    }
}

module.exports = EmailService;
