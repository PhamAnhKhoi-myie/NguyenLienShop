const EmailJob = require('./email.model');
const createTransporter = require('../../config/mail');
const nodemailer = require('nodemailer');
const logger = require('../../utils/logger.util');

class EmailService {
    static transporter = null;

    static async _getTransporter() {
        if (!this.transporter) {
            this.transporter = await createTransporter();
        }
        return this.transporter;
    }

    /**
     * WORKER: Chọn 1 job và xử lý (Atomic)
     */
    static async processOneJob() {
        const job = await EmailJob.findOneAndUpdate(
            {
                status: { $in: ['pending', 'failed'] },
                $expr: { $lt: ["$retry_count", "$max_retries"] },
                scheduled_at: { $lte: new Date() }
            },
            { status: 'processing' },
            { new: true, sort: { scheduled_at: 1 } }
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
            logger.info({ event: 'email_sent', job_id: job._id, preview: testUrl || 'SMTP' });

        } catch (error) {
            job.status = 'failed';
            job.retry_count += 1;
            job.error_message = error.message;

            // Exponential Backoff: 5p, 10p, 20p...
            const delayInMinutes = Math.pow(2, job.retry_count) * 5;
            job.scheduled_at = new Date(Date.now() + delayInMinutes * 60000);

            await job.save();
            logger.error({ event: 'email_job_failed', job_id: job._id, error: error.message });
        }
    }

    static _getSubject(job) {
        const subjects = {
            ORDER_CONFIRMATION: `Xác nhận đơn hàng #${job.payload.order_id}`,
            ORDER_DELIVERED: `Đơn hàng #${job.payload.order_id} đã được giao`,
            REGISTER_SUCCESS: 'Chào mừng bạn đến với NguyenLien Shop'
        };
        return subjects[job.template] || 'Thông báo từ NguyenLien Shop';
    }

    static _renderHtml(job) {
        // Tạm thời dùng string literal, sau này sẽ chuyển sang Handlebars
        const { payload } = job;
        if (job.template === 'ORDER_CONFIRMATION') {
            return `<h1>Chào ${payload.user_name}</h1><p>Đơn hàng <b>${payload.order_id}</b> trị giá <b>${payload.total_amount}đ</b> đã đặt thành công!</p>`;
        }
        return `<h3>Thông báo từ hệ thống</h3><p>Payload: ${JSON.stringify(payload)}</p>`;
    }
}

module.exports = EmailService;