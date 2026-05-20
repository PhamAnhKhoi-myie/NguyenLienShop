const mongoose = require('mongoose');
const { AUDIT_ACTIONS, AUDIT_LEVELS } = require('../../../constants/audit');

const NOTIFICATION_ACTIONS = [
    AUDIT_ACTIONS.MARK_NOTIFICATION_READ,
    AUDIT_ACTIONS.MARK_BULK_NOTIFICATIONS_READ,
    AUDIT_ACTIONS.MARK_ALL_NOTIFICATIONS_READ,
    AUDIT_ACTIONS.DELETE_NOTIFICATION_SOFT,
    AUDIT_ACTIONS.DELETE_ALL_NOTIFICATIONS_SOFT,
];

const ACTOR_TYPES = ['USER', 'ADMIN', 'SYSTEM', 'INTERNAL'];

const schema = new mongoose.Schema({
    actor_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },

    actor_type: {
        type: String,
        enum: ACTOR_TYPES,
        default: 'USER',
    },

    action: {
        type: String,
        enum: NOTIFICATION_ACTIONS,
        required: true,
    },

    level: {
        type: String,
        enum: AUDIT_LEVELS,
        required: true,
    },

    notification_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Notification',
        default: null,
    },

    notification_ids: {
        type: [mongoose.Schema.Types.ObjectId],
        default: [],
    },

    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },

    notification_type: {
        type: String,
        enum: ['order', 'system', 'promotion', null],
        default: null,
    },

    priority: {
        type: String,
        enum: ['low', 'medium', 'high', null],
        default: null,
    },

    changes: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
    },

    ip_address: {
        type: String,
        default: null,
    },

    user_agent: {
        type: String,
        default: null,
    },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: false },
});

schema.index({ notification_id: 1, created_at: -1 });
schema.index({ user_id: 1, created_at: -1 });
schema.index({ actor_id: 1, created_at: -1 });
schema.index({ action: 1, created_at: -1 });
schema.index({ level: 1, created_at: -1 });
schema.index({ notification_type: 1, created_at: -1 });
schema.index({ priority: 1, created_at: -1 });

module.exports = mongoose.model('NotificationAuditLog', schema);