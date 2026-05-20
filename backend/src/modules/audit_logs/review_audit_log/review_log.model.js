const mongoose = require('mongoose');
const { AUDIT_ACTIONS, AUDIT_LEVELS } = require('../../../constants/audit');

const REVIEW_ACTIONS = [
    AUDIT_ACTIONS.CREATE_REVIEW,
    AUDIT_ACTIONS.UPDATE_REVIEW,
    AUDIT_ACTIONS.DELETE_REVIEW_SOFT,
    AUDIT_ACTIONS.FLAG_REVIEW,
    AUDIT_ACTIONS.APPROVE_REVIEW,
    AUDIT_ACTIONS.REJECT_REVIEW,
];

const ACTOR_TYPES = ['USER', 'ADMIN', 'INTERNAL', 'SYSTEM'];

const schema = new mongoose.Schema({
    actor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    actor_type: { type: String, enum: ACTOR_TYPES, default: 'USER' },

    action: { type: String, enum: REVIEW_ACTIONS, required: true },

    level: { type: String, enum: AUDIT_LEVELS, required: true },

    review_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Review', required: true },

    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },

    variant_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Variant', default: null },

    order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },

    moderation_status: { type: String, default: null },

    changes: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
    },

    ip_address: { type: String, default: null },
    user_agent: { type: String, default: null },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: false },
});

schema.index({ review_id: 1, created_at: -1 });
schema.index({ user_id: 1, created_at: -1 });
schema.index({ product_id: 1, created_at: -1 });
schema.index({ variant_id: 1, created_at: -1 });
schema.index({ order_id: 1, created_at: -1 });
schema.index({ actor_id: 1, created_at: -1 });
schema.index({ actor_type: 1, created_at: -1 });
schema.index({ action: 1, created_at: -1 });
schema.index({ level: 1, created_at: -1 });
schema.index({ moderation_status: 1, created_at: -1 });

module.exports = mongoose.model('ReviewAuditLog', schema);
