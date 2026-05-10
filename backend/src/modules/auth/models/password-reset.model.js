const mongoose = require('mongoose');

const passwordResetSchema = new mongoose.Schema({
    email: { type: String, required: true, index: true },
    otp_hash: { type: String, required: true },
    expires_at: { type: Date, required: true },
    attempt_count: { type: Number, default: 0 },
}, { timestamps: true });

// TTL index (auto delete sau expire)
// TTL
passwordResetSchema.index(
    { expires_at: 1 },
    { expireAfterSeconds: 0 }
);

// Query optimization
passwordResetSchema.index(
    { email: 1, expires_at: 1 }
);

module.exports = mongoose.model('PasswordReset', passwordResetSchema);