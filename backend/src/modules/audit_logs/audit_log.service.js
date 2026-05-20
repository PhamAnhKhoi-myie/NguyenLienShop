const UserAuditLog = require('./user_audit_log/user_audit_log.model');
const UserAddressAuditLog = require('./user_address_audit_log/user_address_log.model');
const CategoryAuditLog = require('./category_audit_log/category_log.model');
const AuthAuditLog = require('./auth_audit_log/auth_log.model');
const PaymentAuditLog = require('./payment_audit_log/payment_log.model');
const OrderAuditLog = require('./order_audit_log/order_log.model');
const ShipmentAuditLog = require('./shipment_audit_log/shipment_log.model');
const ProductAuditLog = require('./product_audit_log/product_log.model');
const DiscountAuditLog = require('./discount_audit_log/discount_log.model');
const ReviewAuditLog = require('./review_audit_log/review_log.model');
const ShopContentAuditLog = require('./shop_content_audit_log/content_log.model');
const CartAuditLog = require('./cart_audit_log/cart_log.model');
const EmailAuditLog = require('./email_audit_log/email_log.model');
const NotificationAuditLog = require('./notification_audit_log/notification_log.model');

const AppError = require('../../utils/appError.util');

const DOMAIN_MODELS = [
    { name: 'USER', model: UserAuditLog },
    { name: 'USER_ADDRESS', model: UserAddressAuditLog },
    { name: 'AUTH', model: AuthAuditLog },
    { name: 'CATEGORY', model: CategoryAuditLog },
    { name: 'PAYMENT', model: PaymentAuditLog },
    { name: 'ORDER', model: OrderAuditLog },
    { name: 'SHIPMENT', model: ShipmentAuditLog },
    { name: 'PRODUCT', model: ProductAuditLog },
    { name: 'DISCOUNT', model: DiscountAuditLog },
    { name: 'REVIEW', model: ReviewAuditLog },
    { name: 'SHOP_CONTENT', model: ShopContentAuditLog },
    { name: 'CART', model: CartAuditLog },
    { name: 'NOTIFICATION', model: NotificationAuditLog },
    { name: 'EMAIL', model: EmailAuditLog }
];

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
    static async getAllLogs({ domain, action, level, actor_id, page = 1, limit = 20 }) {
        const skip = (page - 1) * limit;
        const domainConfig = DOMAIN_MODELS.find(d => d.name === domain);

        if (!domainConfig) {
            throw new AppError(
                'Audit log domain is required',
                400,
                'AUDIT_DOMAIN_REQUIRED'
            );
        }

        const filter = {};

        if (action) {
            filter.action = action;
        }
        if (actor_id) filter.actor_id = actor_id;
        if (level) filter.level = level;

        const [logs, total] = await Promise.all([
            domainConfig.model.find(filter)
                .sort({ created_at: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            domainConfig.model.countDocuments(filter)
        ]);

        const data = logs.map(log => ({
            ...log,
            domain: domainConfig.name
        }));

        return {
            data,
            pagination: {
                current_page: page,
                total_pages: Math.ceil(total / limit),
                total_items: total,
                per_page: limit,
            },
        };
    }

    static async getLogById(id) {
        const results = await Promise.all(
            DOMAIN_MODELS.map(d =>
                d.model.findById(id).lean().then(log => log && { ...log, domain: d.name })
            )
        );

        const found = results.find(Boolean);
        if (found) return found;

        throw new AppError('Log not found', 404, 'LOG_NOT_FOUND');
    }
}

module.exports = {
    AuditLogService,
    DOMAIN_MODELS,
    DOMAIN_ACTION_MAP
};
