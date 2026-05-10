const mongoose = require('mongoose');
const { AUDIT_ACTIONS } = require('../../../constants/audit');

const LEVELS = ['INFO', 'IMPORTANT', 'SECURITY'];

const schema = new mongoose.Schema(
    {
        actor_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        action: {
            type: String,
            enum: Object.values(AUDIT_ACTIONS),
            required: true,
        },
        level: {
            type: String,
            enum: LEVELS,
            required: true,
        },
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        changes: {
            type: mongoose.Schema.Types.Mixed,
            required: true,
        },
        ip_address: { type: String, default: null },
        user_agent: { type: String, default: null },
    },
    {
        timestamps: { createdAt: 'created_at', updatedAt: false },
    }
);

schema.index({ user_id: 1, created_at: -1 });
schema.index({ actor_id: 1, created_at: -1 });
schema.index({ action: 1, created_at: -1 });
schema.index({ level: 1, created_at: -1 });

module.exports = mongoose.model('UserAuditLog', schema);