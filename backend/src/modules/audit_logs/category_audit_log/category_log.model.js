const mongoose = require('mongoose');
const { AUDIT_ACTIONS, AUDIT_LEVELS } = require('../../../constants/audit');

const CATEGORY_ACTIONS = [
    AUDIT_ACTIONS.CREATE_CATEGORY,
    AUDIT_ACTIONS.UPDATE_CATEGORY,
    AUDIT_ACTIONS.DELETE_CATEGORY_SOFT,
    AUDIT_ACTIONS.DELETE_CATEGORY_HARD,
    AUDIT_ACTIONS.RESTORE_CATEGORY,
];

const schema = new mongoose.Schema({
    actor_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },

    action: {
        type: String,
        enum: CATEGORY_ACTIONS,
        required: true,
    },

    level: {
        type: String,
        enum: AUDIT_LEVELS,
        required: true,
    },

    category_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true,
    },

    changes: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
    },

    ip_address: { type: String, default: null },
    user_agent: { type: String, default: null },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: false },
});

schema.index({ category_id: 1, created_at: -1 });
schema.index({ actor_id: 1, created_at: -1 });

module.exports = mongoose.model('CategoryAuditLog', schema);