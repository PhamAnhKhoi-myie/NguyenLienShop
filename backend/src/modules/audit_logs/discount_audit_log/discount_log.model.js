const mongoose = require('mongoose');
const { AUDIT_ACTIONS, AUDIT_LEVELS } = require('../../../constants/audit');

const DISCOUNT_ACTIONS = [
    AUDIT_ACTIONS.CREATE_DISCOUNT,
    AUDIT_ACTIONS.BULK_IMPORT_DISCOUNTS,
    AUDIT_ACTIONS.UPDATE_DISCOUNT,
    AUDIT_ACTIONS.DELETE_DISCOUNT_SOFT,
    AUDIT_ACTIONS.REVOKE_DISCOUNT,
    AUDIT_ACTIONS.DUPLICATE_DISCOUNT,
    AUDIT_ACTIONS.REDEEM_DISCOUNT,
];

const ACTOR_TYPES = ['USER', 'INTERNAL', 'SYSTEM'];

const schema = new mongoose.Schema({
    actor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    actor_type: { type: String, enum: ACTOR_TYPES, default: 'USER' },

    action: { type: String, enum: DISCOUNT_ACTIONS, required: true },

    level: { type: String, enum: AUDIT_LEVELS, required: true },

    discount_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Discount', default: null },

    source_discount_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Discount', default: null },

    order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },

    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

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

schema.index({ discount_id: 1, created_at: -1 });
schema.index({ source_discount_id: 1, created_at: -1 });
schema.index({ order_id: 1, created_at: -1 });
schema.index({ user_id: 1, created_at: -1 });
schema.index({ actor_id: 1, created_at: -1 });
schema.index({ action: 1, created_at: -1 });
schema.index({ level: 1, created_at: -1 });
schema.index({ actor_type: 1, created_at: -1 });
schema.index({ discount_code: 1, created_at: -1 });

module.exports = mongoose.model('DiscountAuditLog', schema);
