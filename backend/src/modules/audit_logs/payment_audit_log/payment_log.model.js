const mongoose = require('mongoose');
const { AUDIT_ACTIONS, AUDIT_LEVELS } = require('../../../constants/audit');

const PAYMENT_ACTIONS = [
    AUDIT_ACTIONS.CREATE_PAYMENT,
    AUDIT_ACTIONS.RETRY_PAYMENT,
    AUDIT_ACTIONS.CANCEL_PAYMENT,
    AUDIT_ACTIONS.ADMIN_VERIFY_PAYMENT,
    AUDIT_ACTIONS.DELETE_PAYMENT_SOFT,
    AUDIT_ACTIONS.VNPAY_WEBHOOK_PAYMENT,
    AUDIT_ACTIONS.STRIPE_WEBHOOK_PAYMENT,
    AUDIT_ACTIONS.PAYPAL_WEBHOOK_PAYMENT,
    AUDIT_ACTIONS.PAYOS_WEBHOOK_PAYMENT,
    AUDIT_ACTIONS.PAYMENT_WEBHOOK_AMOUNT_MISMATCH,
    AUDIT_ACTIONS.PAYMENT_WEBHOOK_REJECTED,
];

const schema = new mongoose.Schema({
    actor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    action: { type: String, enum: PAYMENT_ACTIONS, required: true },

    level: { type: String, enum: AUDIT_LEVELS, required: true },

    payment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },

    order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },

    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    provider: { type: String, enum: ['vnpay', 'stripe', 'paypal', 'payos', null], default: null },

    changes: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
    },

    ip_address: { type: String, default: null },
    user_agent: { type: String, default: null },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: false },
});

schema.index({ payment_id: 1, created_at: -1 });
schema.index({ order_id: 1, created_at: -1 });
schema.index({ actor_id: 1, created_at: -1 });
schema.index({ action: 1, created_at: -1 });
schema.index({ level: 1, created_at: -1 });
schema.index({ provider: 1, created_at: -1 });

module.exports = mongoose.model('PaymentAuditLog', schema);
