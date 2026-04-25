const mongoose = require('mongoose');

const emailJobSchema = new mongoose.Schema({
    to: [{ type: String, required: true }],
    template: {
        type: String,
        enum: ['REGISTER_SUCCESS', 'ORDER_CONFIRMATION', 'ORDER_DELIVERED'],
        required: true
    },
    payload: { type: Object, required: true },
    status: {
        type: String,
        enum: ['pending', 'processing', 'sent', 'failed'],
        default: 'pending'
    },
    retry_count: { type: Number, default: 0 },
    max_retries: { type: Number, default: 3 },
    error_message: String,
    scheduled_at: { type: Date, default: Date.now },
    sent_at: Date
}, { timestamps: true });

// CRITICAL: Index để Worker quét jobs nhanh và chính xác
emailJobSchema.index({ status: 1, scheduled_at: 1 });

module.exports = mongoose.model('EmailJob', emailJobSchema);