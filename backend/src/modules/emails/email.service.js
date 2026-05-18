const crypto = require('crypto');
const EmailJob = require('./email.model');
const createTransporter = require('../../config/mail');
const nodemailer = require('nodemailer');
const logger = require('../../utils/logger.util');
const AppError = require('../../utils/appError.util');

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

            await EmailJob.updateOne(filter, update, { runValidators: true });
            logger.error({ event: 'email_job_failed', job_id: job._id, error: error.message });
        } finally {
            clearInterval(heartbeat);
        }
    }

    static async enqueueEmail({ to, template, payload, scheduledAt = null }) {
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
        return EmailJob.create({
            to,
            template,
            payload,
            scheduled_at: scheduledAt || new Date()
        });
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
}

module.exports = EmailService;
