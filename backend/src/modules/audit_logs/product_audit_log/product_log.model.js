const mongoose = require('mongoose');
const { AUDIT_ACTIONS, AUDIT_LEVELS } = require('../../../constants/audit');

const PRODUCT_ACTIONS = [
    AUDIT_ACTIONS.CREATE_PRODUCT,
    AUDIT_ACTIONS.UPDATE_PRODUCT,
    AUDIT_ACTIONS.DELETE_PRODUCT_SOFT,
    AUDIT_ACTIONS.CREATE_VARIANT,
    AUDIT_ACTIONS.UPDATE_VARIANT,
    AUDIT_ACTIONS.DELETE_VARIANT_SOFT,
    AUDIT_ACTIONS.CREATE_VARIANT_UNIT,
    AUDIT_ACTIONS.UPDATE_VARIANT_UNIT,
    AUDIT_ACTIONS.DELETE_VARIANT_UNIT,
    AUDIT_ACTIONS.RESERVE_VARIANT_STOCK,
    AUDIT_ACTIONS.COMPLETE_VARIANT_SALE,
    AUDIT_ACTIONS.RELEASE_VARIANT_STOCK,
];

const TARGET_TYPES = ['PRODUCT', 'VARIANT', 'VARIANT_UNIT', 'STOCK'];
const ACTOR_TYPES = ['USER', 'INTERNAL', 'SYSTEM'];

const schema = new mongoose.Schema({
    actor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    actor_type: { type: String, enum: ACTOR_TYPES, default: 'USER' },

    action: { type: String, enum: PRODUCT_ACTIONS, required: true },

    level: { type: String, enum: AUDIT_LEVELS, required: true },

    target_type: { type: String, enum: TARGET_TYPES, required: true },

    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },

    variant_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Variant', default: null },

    unit_id: { type: mongoose.Schema.Types.ObjectId, ref: 'VariantUnit', default: null },

    sku: { type: String, default: null },

    changes: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
    },

    ip_address: { type: String, default: null },
    user_agent: { type: String, default: null },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: false },
});

schema.index({ product_id: 1, created_at: -1 });
schema.index({ variant_id: 1, created_at: -1 });
schema.index({ unit_id: 1, created_at: -1 });
schema.index({ actor_id: 1, created_at: -1 });
schema.index({ action: 1, created_at: -1 });
schema.index({ level: 1, created_at: -1 });
schema.index({ target_type: 1, created_at: -1 });
schema.index({ actor_type: 1, created_at: -1 });
schema.index({ sku: 1, created_at: -1 });

module.exports = mongoose.model('ProductAuditLog', schema);
