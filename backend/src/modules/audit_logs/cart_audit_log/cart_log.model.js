const mongoose = require('mongoose');
const { AUDIT_ACTIONS, AUDIT_LEVELS } = require('../../../constants/audit');

const CART_ACTIONS = [
    AUDIT_ACTIONS.APPLY_CART_DISCOUNT,
    AUDIT_ACTIONS.REMOVE_CART_DISCOUNT,
    AUDIT_ACTIONS.MERGE_CART,
    AUDIT_ACTIONS.CHECKOUT_CART,
    AUDIT_ACTIONS.CLEAR_CART,
];

const ACTOR_TYPES = ['USER', 'GUEST', 'SYSTEM', 'INTERNAL'];
const CART_STATUSES = ['ACTIVE', 'ABANDONED', 'CHECKED_OUT', null];

const schema = new mongoose.Schema({
    actor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    actor_type: { type: String, enum: ACTOR_TYPES, default: 'USER' },

    action: { type: String, enum: CART_ACTIONS, required: true },

    level: { type: String, enum: AUDIT_LEVELS, required: true },

    cart_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Cart', required: true },

    source_cart_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Cart', default: null },

    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    session_key: { type: String, default: null },

    source_session_key: { type: String, default: null },

    status: { type: String, enum: CART_STATUSES, default: null },

    discount_code: { type: String, default: null },

    changes: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
    },

    ip_address: { type: String, default: null },
    user_agent: { type: String, default: null },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: false },
});

schema.index({ cart_id: 1, created_at: -1 });
schema.index({ source_cart_id: 1, created_at: -1 });
schema.index({ user_id: 1, created_at: -1 });
schema.index({ actor_id: 1, created_at: -1 });
schema.index({ action: 1, created_at: -1 });
schema.index({ level: 1, created_at: -1 });
schema.index({ status: 1, created_at: -1 });
schema.index({ session_key: 1, created_at: -1 });
schema.index({ source_session_key: 1, created_at: -1 });
schema.index({ discount_code: 1, created_at: -1 });

module.exports = mongoose.model('CartAuditLog', schema);
