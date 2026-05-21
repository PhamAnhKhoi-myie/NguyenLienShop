const mongoose = require('mongoose');
const { AUDIT_ACTIONS, AUDIT_LEVELS, ENTITY_TYPES } = require('../../constants/audit');

const AUDIT_DOMAINS = Object.values(ENTITY_TYPES);
const AUDIT_ACTION_VALUES = Object.values(AUDIT_ACTIONS);

const auditLogSchema = new mongoose.Schema(
    {
        domain: {
            type: String,
            enum: AUDIT_DOMAINS,
            required: true,
            index: true,
        },

        actor_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },

        actor_type: {
            type: String,
            enum: ['USER', 'ADMIN', 'MANAGER', 'SYSTEM', 'GUEST', 'INTERNAL', null],
            default: null,
        },

        action: {
            type: String,
            enum: AUDIT_ACTION_VALUES,
            required: true,
            index: true,
        },

        level: {
            type: String,
            enum: AUDIT_LEVELS,
            required: true,
            index: true,
        },

        target_type: {
            type: String,
            default: null,
            index: true,
        },

        target_id: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
            index: true,
        },

        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
            index: true,
        },

        order_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order',
            default: null,
            index: true,
        },

        payment_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Payment',
            default: null,
        },

        shipment_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Shipment',
            default: null,
        },

        product_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            default: null,
        },

        variant_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Variant',
            default: null,
        },

        unit_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'VariantUnit',
            default: null,
        },

        cart_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Cart',
            default: null,
        },

        category_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            default: null,
        },

        discount_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Discount',
            default: null,
        },

        review_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Review',
            default: null,
        },

        notification_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Notification',
            default: null,
        },

        notification_ids: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Notification',
        }],

        email_job_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'EmailJob',
            default: null,
        },

        address_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'UserAddress',
            default: null,
        },

        banner_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Banner',
            default: null,
        },

        announcement_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Announcement',
            default: null,
        },

        shop_info_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ShopInfo',
            default: null,
        },

        source_cart_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Cart',
            default: null,
        },

        source_discount_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Discount',
            default: null,
        },

        order_code: { type: String, default: null },
        status: { type: String, default: null },
        provider: { type: String, default: null },
        carrier: { type: String, default: null },
        tracking_code: { type: String, default: null },
        sku: { type: String, default: null },
        discount_code: { type: String, default: null },
        session_key: { type: String, default: null },
        source_session_key: { type: String, default: null },
        template: { type: String, default: null },
        recipient_count: { type: Number, default: 0 },
        recipients: [{ type: String }],
        notification_type: { type: String, default: null },
        priority: { type: String, default: null },
        moderation_status: { type: String, default: null },
        display_name: { type: String, default: null },
        public_status: { type: String, default: null },

        changes: {
            type: mongoose.Schema.Types.Mixed,
            required: true,
        },

        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },

        ip_address: { type: String, default: null },
        user_agent: { type: String, default: null },
    },
    {
        timestamps: { createdAt: 'created_at', updatedAt: false },
    }
);

auditLogSchema.index({ created_at: -1 });
auditLogSchema.index({ domain: 1, created_at: -1 });
auditLogSchema.index({ action: 1, created_at: -1 });
auditLogSchema.index({ level: 1, created_at: -1 });
auditLogSchema.index({ actor_id: 1, created_at: -1 });
auditLogSchema.index({ user_id: 1, created_at: -1 });
auditLogSchema.index({ order_id: 1, created_at: -1 });
auditLogSchema.index({ target_type: 1, target_id: 1, created_at: -1 });
auditLogSchema.index({ domain: 1, action: 1, created_at: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema, 'audit_logs');
