const mongoose = require('mongoose');
const { AUDIT_ACTIONS, AUDIT_LEVELS } = require('../../../constants/audit');

const EMAIL_ACTIONS = [
    AUDIT_ACTIONS.ENQUEUE_EMAIL,
    AUDIT_ACTIONS.EMAIL_SEND_SUCCESS,
    AUDIT_ACTIONS.EMAIL_SEND_FAILED,
];

const EMAIL_TEMPLATES = [
    'REGISTER_SUCCESS',
    'ORDER_CONFIRMATION',
    'ORDER_DELIVERED',
    'RESET_PASSWORD_LINK',
    'FORGOT_PASSWORD_OTP',
];

const EMAIL_STATUSES = ['pending', 'processing', 'sent', 'failed', null];
const ACTOR_TYPES = ['USER', 'SYSTEM', 'INTERNAL'];

const schema = new mongoose.Schema({
    actor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    actor_type: { type: String, enum: ACTOR_TYPES, default: 'SYSTEM' },

    action: { type: String, enum: EMAIL_ACTIONS, required: true },

    level: { type: String, enum: AUDIT_LEVELS, required: true },

    email_job_id: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailJob', required: true },

    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },

    template: { type: String, enum: EMAIL_TEMPLATES, required: true },

    status: { type: String, enum: EMAIL_STATUSES, default: null },

    recipient_count: { type: Number, default: 0 },

    recipients: [{ type: String }],

    changes: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
    },

    ip_address: { type: String, default: null },
    user_agent: { type: String, default: null },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: false },
});

schema.index({ email_job_id: 1, created_at: -1 });
schema.index({ user_id: 1, created_at: -1 });
schema.index({ order_id: 1, created_at: -1 });
schema.index({ actor_id: 1, created_at: -1 });
schema.index({ action: 1, created_at: -1 });
schema.index({ level: 1, created_at: -1 });
schema.index({ template: 1, created_at: -1 });
schema.index({ status: 1, created_at: -1 });

module.exports = mongoose.model('EmailAuditLog', schema);
