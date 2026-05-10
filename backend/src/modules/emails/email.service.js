const EmailJob = require('./email.model');
const createTransporter = require('../../config/mail');
const nodemailer = require('nodemailer');
const logger = require('../../utils/logger.util');
const AppError = require('../../utils/appError.util');

class EmailService {
    static transporter = null;

    static async _getTransporter() {
        if (!this.transporter) {
            this.transporter = await createTransporter();
        }
        return this.transporter;
    }

    static async processOneJob() {
        const now = new Date();
        const processingTimeout = new Date(Date.now() - 5 * 60 * 1000);

        const job = await EmailJob.findOneAndUpdate(
            {
                $and: [
                    {
                        $or: [
                            { status: { $in: ['pending', 'failed'] } },
                            { status: 'processing', updatedAt: { $lt: processingTimeout } }
                        ]
                    },
                    { $expr: { $lt: ["$retry_count", "$max_retries"] } },
                    { scheduled_at: { $lte: now } }
                ]
            },
            {
                $set: { status: 'processing' }
            },
            {
                new: true,
                sort: { scheduled_at: 1 }
            }
        );

        if (!job) return;

        try {
            const transporter = await this._getTransporter();
            const info = await transporter.sendMail({
                from: `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM_ADDRESS}>`,
                to: job.to.join(','),
                subject: this._getSubject(job),
                html: this._renderHtml(job)
            });

            job.status = 'sent';
            job.sent_at = new Date();
            await job.save();

            // Nếu là Ethereal, log link preview
            const testUrl = nodemailer.getTestMessageUrl(info);

            logger.info({
                event: 'email_sent',
                job_id: job._id,
                template: job.template,
                to: job.to,
                preview: testUrl || null
            });

        } catch (error) {
            job.status = 'failed';
            job.retry_count += 1;
            job.error_message = error.message;

            // Exponential Backoff: 5p, 10p, 20p...
            const delayInMinutes = Math.min(
                Math.pow(2, job.retry_count) * 5,
                60
            );
            job.scheduled_at = new Date(Date.now() + delayInMinutes * 60000);

            await job.save();
            logger.error({ event: 'email_job_failed', job_id: job._id, error: error.message });
        }
    }

    static async enqueueEmail({ to, template, payload, scheduledAt = null }) {
        if (template === 'RESET_PASSWORD_LINK' && !payload.reset_url) {
            throw new AppError('reset_url is required', 400, 'INVALID_EMAIL_PAYLOAD');
        }

        if (template === 'FORGOT_PASSWORD_OTP') {
            if (!payload.otp || !payload.email || !payload.expires_in) {
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

    static _getSubject(job) {
        const subjects = {
            ORDER_CONFIRMATION: `Xác nhận đơn hàng #${job.payload.order_id}`,
            ORDER_DELIVERED: `Đơn hàng #${job.payload.order_id} đã được giao`,
            REGISTER_SUCCESS: 'Chào mừng bạn đến với NguyenLien Shop',
            FORGOT_PASSWORD_OTP: 'Mã xác nhận đặt lại mật khẩu',
            RESET_PASSWORD_LINK: 'Yêu cầu đặt lại mật khẩu'
        };
        return subjects[job.template] || 'Thông báo từ NguyenLien Shop';
    }

    static _renderHtml(job) {
        // Tạm thời dùng string literal, sau này sẽ chuyển sang Handlebars
        const { payload } = job;
        if (job.template === 'ORDER_CONFIRMATION') {
            return `<h1>Chào ${payload.user_name}</h1><p>Đơn hàng <b>${payload.order_id}</b> trị giá <b>${payload.total_amount}đ</b> đã đặt thành công!</p>`;
        }
        if (job.template === 'RESET_PASSWORD_LINK') {
            return `
        <p>Click vào link bên dưới để đặt lại mật khẩu:</p>
        <a href="${payload.reset_url}">Reset Password</a>
    `;
        }
        if (job.template === 'FORGOT_PASSWORD_OTP') {
            const escapeHtml = (s) =>
                String(s).replace(/[&<>"']/g, (c) => ({
                    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
                }[c]));
            return `
        <h2>Đặt lại mật khẩu</h2>
        <p>Chào ${escapeHtml(payload.email)},</p>
        <p>Mã OTP của bạn là:</p>
<h1>${payload.otp}</h1>
        <p>Mã có hiệu lực trong ${payload.expires_in} phút.</p>
        <p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
    `;
        }
        return `<h3>Thông báo từ hệ thống</h3><p>Payload: ${JSON.stringify(payload)}</p>`;
    }
}

module.exports = EmailService;