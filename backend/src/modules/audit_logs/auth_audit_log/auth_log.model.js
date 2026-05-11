const mongoose = require('mongoose');
const { AUDIT_ACTIONS, AUDIT_LEVELS } = require('../../../constants/audit');

const AUTH_ACTIONS = [
    AUDIT_ACTIONS.AUTH_LOGIN,
    AUDIT_ACTIONS.AUTH_CHANGE_PASSWORD,
    AUDIT_ACTIONS.AUTH_FORGOT_PASSWORD,
    AUDIT_ACTIONS.AUTH_RESET_PASSWORD,
    AUDIT_ACTIONS.AUTH_REGISTER,
];

const schema = new mongoose.Schema({
    actor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    action: { type: String, enum: AUTH_ACTIONS, required: true },

    level: { type: String, enum: AUDIT_LEVELS, required: true },

    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    changes: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
    },

    ip_address: { type: String, default: null },
    user_agent: { type: String, default: null },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: false },
});

schema.index({ user_id: 1, created_at: -1 });
schema.index({ action: 1, created_at: -1 });

module.exports = mongoose.model('AuthAuditLog', schema);