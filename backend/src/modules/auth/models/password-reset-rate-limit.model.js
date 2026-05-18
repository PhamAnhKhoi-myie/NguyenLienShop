const mongoose = require('mongoose');

const passwordResetRateLimitSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, index: true },
    window_started_at: { type: Date, required: true },
    request_count: { type: Number, required: true, default: 0 },
    last_requested_at: { type: Date, required: true },
    expires_at: { type: Date, required: true }
}, { timestamps: true });

passwordResetRateLimitSchema.index(
    { expires_at: 1 },
    { expireAfterSeconds: 0 }
);

module.exports = mongoose.model('PasswordResetRateLimit', passwordResetRateLimitSchema);
