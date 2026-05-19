const mongoose = require('mongoose');
const { AUDIT_ACTIONS, AUDIT_LEVELS } = require('../../../constants/audit');

const SHIPMENT_ACTIONS = [
    AUDIT_ACTIONS.CREATE_SHIPMENT,
    AUDIT_ACTIONS.SHIPMENT_WEBHOOK_STATUS,
    AUDIT_ACTIONS.SHIPMENT_WEBHOOK_REJECTED,
    AUDIT_ACTIONS.UPDATE_SHIPMENT_STATUS,
    AUDIT_ACTIONS.RECORD_SHIPMENT_FAILURE,
    AUDIT_ACTIONS.CANCEL_SHIPMENT,
    AUDIT_ACTIONS.RETRY_SHIPMENT,
    AUDIT_ACTIONS.CONFIRM_SHIPMENT_DELIVERY,
    AUDIT_ACTIONS.ADMIN_UPDATE_SHIPMENT,
    AUDIT_ACTIONS.DELETE_SHIPMENT_SOFT,
];

const SHIPMENT_STATUSES = [
    'pending',
    'picked_up',
    'in_transit',
    'at_destination',
    'delivered',
    'failed',
    'cancelled',
    'returned',
    null,
];

const CARRIERS = ['GHN', 'GHTK', 'JT', 'GRAB', 'BEST', 'OTHER', null];

const schema = new mongoose.Schema({
    actor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    action: { type: String, enum: SHIPMENT_ACTIONS, required: true },

    level: { type: String, enum: AUDIT_LEVELS, required: true },

    shipment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment', default: null },

    order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },

    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    carrier: { type: String, enum: CARRIERS, default: null },

    tracking_code: { type: String, default: null },

    status: { type: String, enum: SHIPMENT_STATUSES, default: null },

    changes: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
    },

    ip_address: { type: String, default: null },
    user_agent: { type: String, default: null },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: false },
});

schema.index({ shipment_id: 1, created_at: -1 });
schema.index({ order_id: 1, created_at: -1 });
schema.index({ user_id: 1, created_at: -1 });
schema.index({ actor_id: 1, created_at: -1 });
schema.index({ action: 1, created_at: -1 });
schema.index({ level: 1, created_at: -1 });
schema.index({ carrier: 1, created_at: -1 });
schema.index({ tracking_code: 1, created_at: -1 });
schema.index({ status: 1, created_at: -1 });

module.exports = mongoose.model('ShipmentAuditLog', schema);
