const mongoose = require("mongoose");

const tokenSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        jti: {
            type: String,
            required: true,
            unique: true,
        },
        token_hash: {
            type: String,
            required: true,
            unique: true,
        },
        user_agent: String,
        ip_address: String,

        is_revoked: {
            type: Boolean,
            default: false,
        },
        revoked_at: Date,
        revoked_reason: String,
        replaced_by_jti: String,

        expires_at: {
            type: Date,
            required: true,
            expires: 0,
        },
    },
    { timestamps: true }
);

tokenSchema.index({ user_id: 1, createdAt: -1 });
tokenSchema.index({ user_id: 1, is_revoked: 1 });

module.exports = mongoose.model("RefreshToken", tokenSchema);