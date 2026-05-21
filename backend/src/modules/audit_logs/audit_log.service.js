const AuditLog = require('./audit_log.model');
const AppError = require('../../utils/appError.util');
const { ENTITY_TYPES } = require('../../constants/audit');

const DOMAIN_MODELS = Object.values(ENTITY_TYPES).map((name) => ({
    name,
    model: AuditLog,
}));

const DOMAIN_ACTION_MAP = {
    USER: [
        'UPDATE_USER_PROFILE',
        'UPDATE_USER_ROLES',
        'UPDATE_USER_STATUS',
        'DELETE_USER_SOFT'
    ],
    USER_ADDRESS: [
        'CREATE_USER_ADDRESS',
        'UPDATE_USER_ADDRESS',
        'DELETE_USER_ADDRESS',
        'SET_DEFAULT_USER_ADDRESS'
    ],
    AUTH: [
        'AUTH_LOGIN',
        'AUTH_CHANGE_PASSWORD',
        'AUTH_FORGOT_PASSWORD',
        'AUTH_RESET_PASSWORD',
        'AUTH_REGISTER'
    ],
    CATEGORY: [
        'CREATE_CATEGORY',
        'UPDATE_CATEGORY',
        'DELETE_CATEGORY_SOFT',
        'DELETE_CATEGORY_HARD',
        'RESTORE_CATEGORY'
    ],
    PAYMENT: [
        'CREATE_PAYMENT',
        'RETRY_PAYMENT',
        'CANCEL_PAYMENT',
        'ADMIN_VERIFY_PAYMENT',
        'DELETE_PAYMENT_SOFT',
        'VNPAY_WEBHOOK_PAYMENT',
        'STRIPE_WEBHOOK_PAYMENT',
        'PAYPAL_WEBHOOK_PAYMENT',
        'PAYMENT_WEBHOOK_AMOUNT_MISMATCH',
        'PAYMENT_WEBHOOK_REJECTED'
    ],
    ORDER: [
        'CREATE_ORDER',
        'CANCEL_ORDER',
        'ADMIN_UPDATE_ORDER_STATUS',
        'ADMIN_UPDATE_ORDER',
        'FULFILL_ORDER_ITEMS',
        'RECORD_ORDER_SHIPMENT',
        'CONFIRM_ORDER_DELIVERY'
    ],
    SHIPMENT: [
        'CREATE_SHIPMENT',
        'SHIPMENT_WEBHOOK_STATUS',
        'SHIPMENT_WEBHOOK_REJECTED',
        'UPDATE_SHIPMENT_STATUS',
        'RECORD_SHIPMENT_FAILURE',
        'CANCEL_SHIPMENT',
        'RETRY_SHIPMENT',
        'CONFIRM_SHIPMENT_DELIVERY',
        'ADMIN_UPDATE_SHIPMENT',
        'DELETE_SHIPMENT_SOFT'
    ],
    PRODUCT: [
        'CREATE_PRODUCT',
        'UPDATE_PRODUCT',
        'DELETE_PRODUCT_SOFT',
        'CREATE_VARIANT',
        'UPDATE_VARIANT',
        'DELETE_VARIANT_SOFT',
        'CREATE_VARIANT_UNIT',
        'UPDATE_VARIANT_UNIT',
        'DELETE_VARIANT_UNIT',
        'RESERVE_VARIANT_STOCK',
        'COMPLETE_VARIANT_SALE',
        'RELEASE_VARIANT_STOCK'
    ],
    DISCOUNT: [
        'CREATE_DISCOUNT',
        'BULK_IMPORT_DISCOUNTS',
        'UPDATE_DISCOUNT',
        'DELETE_DISCOUNT_SOFT',
        'REVOKE_DISCOUNT',
        'DUPLICATE_DISCOUNT',
        'REDEEM_DISCOUNT'
    ],
    REVIEW: [
        'CREATE_REVIEW',
        'UPDATE_REVIEW',
        'DELETE_REVIEW_SOFT',
        'FLAG_REVIEW',
        'APPROVE_REVIEW',
        'REJECT_REVIEW'
    ],
    SHOP_CONTENT: [
        'CREATE_BANNER',
        'UPDATE_BANNER',
        'DELETE_BANNER_SOFT',
        'RESTORE_BANNER',
        'CREATE_ANNOUNCEMENT',
        'UPDATE_ANNOUNCEMENT',
        'DELETE_ANNOUNCEMENT_SOFT',
        'RESTORE_ANNOUNCEMENT',
        'CREATE_SHOP_INFO',
        'UPDATE_SHOP_INFO',
        'UPDATE_SHOP_INFO_STATUS'
    ],
    CART: [
        'ADD_CART_ITEM',
        'UPDATE_CART_ITEM_QUANTITY',
        'REMOVE_CART_ITEM',
        'APPLY_CART_DISCOUNT',
        'REMOVE_CART_DISCOUNT',
        'MERGE_CART',
        'CHECKOUT_CART',
        'CLEAR_CART'
    ],
    NOTIFICATION: [
        'MARK_NOTIFICATION_READ',
        'MARK_BULK_NOTIFICATIONS_READ',
        'MARK_ALL_NOTIFICATIONS_READ',
        'DELETE_NOTIFICATION_SOFT',
        'DELETE_ALL_NOTIFICATIONS_SOFT',
    ],
    EMAIL: [
        'ENQUEUE_EMAIL',
        'EMAIL_SEND_SUCCESS',
        'EMAIL_SEND_FAILED'
    ]
};

class AuditLogService {
    static buildFilter({
        domain,
        action,
        level,
        actor_id,
        user_id,
        order_id,
        target_type,
        target_id,
    }) {
        const filter = {};

        if (domain) filter.domain = domain;
        if (action) filter.action = action;
        if (level) filter.level = level;
        if (actor_id) filter.actor_id = actor_id;
        if (user_id) filter.user_id = user_id;
        if (order_id) filter.order_id = order_id;
        if (target_type) filter.target_type = target_type;
        if (target_id) filter.target_id = target_id;

        return filter;
    }

    static async getAllLogs({
        domain,
        action,
        level,
        actor_id,
        user_id,
        order_id,
        target_type,
        target_id,
        page = 1,
        limit = 20,
    }) {
        const pageNumber = Number(page);
        const limitNumber = Number(limit);
        const skip = (pageNumber - 1) * limitNumber;

        if (domain && !DOMAIN_ACTION_MAP[domain]) {
            throw new AppError(
                'Invalid audit log domain',
                400,
                'INVALID_AUDIT_DOMAIN'
            );
        }

        const filter = this.buildFilter({
            domain,
            action,
            level,
            actor_id,
            user_id,
            order_id,
            target_type,
            target_id,
        });

        const [logs, total] = await Promise.all([
            AuditLog.find(filter)
                .sort({ created_at: -1 })
                .skip(skip)
                .limit(limitNumber)
                .lean(),
            AuditLog.countDocuments(filter),
        ]);

        return {
            data: logs,
            pagination: {
                current_page: pageNumber,
                total_pages: Math.ceil(total / limitNumber),
                total_items: total,
                per_page: limitNumber,
            },
        };
    }

    static async getLogById(id) {
        const log = await AuditLog.findById(id).lean();

        if (!log) {
            throw new AppError('Log not found', 404, 'LOG_NOT_FOUND');
        }

        return log;
    }
}

module.exports = {
    AuditLogService,
    DOMAIN_MODELS,
    DOMAIN_ACTION_MAP,
};