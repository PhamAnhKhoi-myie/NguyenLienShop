const mongoose = require('mongoose');

const phoneOtpSchema = new mongoose.Schema(
    {
        phone_number: {
            type: String,
            required: true,
            trim: true,
        },
        purpose: {
            type: String,
            enum: ['REGISTER', 'PASSWORD_RESET'],
            required: true,
        },
        otp_hash: {
            type: String,
            required: true,
        },
        otp_expires_at: {
            type: Date,
            required: true,
        },
        attempt_count: {
            type: Number,
            default: 0,
        },
        request_count: {
            type: Number,
            default: 1,
        },
        window_started_at: {
            type: Date,
            required: true,
        },
        last_requested_at: {
            type: Date,
            required: true,
        },
        expires_at: {
            type: Date,
            required: true,
        },
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        },
    }
);

phoneOtpSchema.index(
    { phone_number: 1, purpose: 1 },
    { unique: true }
);
phoneOtpSchema.index(
    { expires_at: 1 },
    { expireAfterSeconds: 0 }
);

module.exports = mongoose.model('PhoneOtp', phoneOtpSchema);
