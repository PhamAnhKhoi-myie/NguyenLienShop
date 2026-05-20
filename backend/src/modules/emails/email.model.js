const mongoose = require('mongoose');

const emailJobSchema = new mongoose.Schema({
    to: [{ type: String, required: true }],
    template: {
        type: String,
        enum: ['REGISTER_SUCCESS', 'ORDER_CONFIRMATION', 'ORDER_DELIVERED', 'RESET_PASSWORD_LINK', 'FORGOT_PASSWORD_OTP'],
        required: true
    },
    payload: { type: Object, required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    status: {
        type: String,
        enum: ['pending', 'processing', 'sent', 'failed'],
        default: 'pending'
    },
    retry_count: { type: Number, default: 0 },
    max_retries: { type: Number, default: 3 },
    error_message: String,
    lock_token: String,
    locked_until: Date,
    processing_started_at: Date,
    scheduled_at: { type: Date, default: Date.now },
    sent_at: Date
}, { timestamps: true });

emailJobSchema.index({
    status: 1,
    scheduled_at: 1,
    locked_until: 1,
    retry_count: 1
});
emailJobSchema.index({ user_id: 1, createdAt: -1 });
emailJobSchema.index({ order_id: 1, createdAt: -1 });

module.exports = mongoose.model('EmailJob', emailJobSchema);
