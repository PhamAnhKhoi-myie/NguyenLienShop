const mongoose = require('mongoose');
const { AUDIT_ACTIONS, AUDIT_LEVELS } = require('../../../constants/audit');

const ORDER_ACTIONS = [
    AUDIT_ACTIONS.CREATE_ORDER,
    AUDIT_ACTIONS.CANCEL_ORDER,
    AUDIT_ACTIONS.ADMIN_UPDATE_ORDER_STATUS,
    AUDIT_ACTIONS.ADMIN_UPDATE_ORDER,
    AUDIT_ACTIONS.ADMIN_COMPLETE_ORDER_REFUND,
    AUDIT_ACTIONS.FULFILL_ORDER_ITEMS,
    AUDIT_ACTIONS.RECORD_ORDER_SHIPMENT,
    AUDIT_ACTIONS.CONFIRM_ORDER_DELIVERY,
];

const ORDER_STATUSES = [
    'PENDING',
    'PAID',
    'PROCESSING',
    'SHIPPED',
    'DELIVERED',
    'FAILED',
    'CANCELED',
    null,
];

const schema = new mongoose.Schema({
    actor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    action: { type: String, enum: ORDER_ACTIONS, required: true },

    level: { type: String, enum: AUDIT_LEVELS, required: true },

    order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },

    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    order_code: { type: String, default: null },

    status: { type: String, enum: ORDER_STATUSES, default: null },

    changes: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
    },

    ip_address: { type: String, default: null },
    user_agent: { type: String, default: null },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: false },
});

schema.index({ order_id: 1, created_at: -1 });
schema.index({ user_id: 1, created_at: -1 });
schema.index({ actor_id: 1, created_at: -1 });
schema.index({ action: 1, created_at: -1 });
schema.index({ level: 1, created_at: -1 });
schema.index({ status: 1, created_at: -1 });
schema.index({ order_code: 1, created_at: -1 });

module.exports = mongoose.model('OrderAuditLog', schema);
