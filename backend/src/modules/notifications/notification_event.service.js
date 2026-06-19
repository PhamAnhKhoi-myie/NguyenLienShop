const NotificationService = require('./notification.service');
const logger = require('../../utils/logger.util');

const ORDER_STATUS_NOTIFICATIONS = {
    PROCESSING: {
        title: "Đơn hàng đang xử lý",
        title_key: 'notification.order.processing.title',
        message_key: 'notification.order.processing.message',
        event: 'ORDER_PROCESSING',
        priority: 'medium',
        message: (label) => `${label} đang được xử lý.`,
    },
    SHIPPED: {
        title: "Đơn hàng đang giao",
        title_key: 'notification.order.shipped.title',
        message_key: 'notification.order.shipped.message',
        event: 'ORDER_SHIPPED',
        priority: 'medium',
        message: (label) => `${label} đang được giao.`,
    },
    DELIVERED: {
        title: "Giao hàng thành công",
        title_key: 'notification.order.delivered.title',
        message_key: 'notification.order.delivered.message',
        event: 'ORDER_DELIVERED',
        priority: 'medium',
        message: (label) => `${label} đã được giao thành công.`,
    },
    CANCELED: {
        title: "Đơn hàng đã hủy",
        title_key: 'notification.order.canceled.title',
        message_key: 'notification.order.canceled.message',
        event: 'ORDER_CANCELED',
        priority: 'high',
        message: (label) => `${label} đã được hủy.`,
    },
};

function getId(value) {
    if (!value) {
        return null;
    }

    if (value._id) {
        return value._id;
    }

    if (value.id) {
        return value.id;
    }

    return value;
}

function getPlain(value) {
    return value?.toObject ? value.toObject() : value;
}

function getUserId(user) {
    return getId(user);
}

function getOrderUserId(order, fallback = null) {
    const doc = getPlain(order);
    return getId(doc?.user_id) || getId(fallback?.user_id);
}

function getOrderId(order, fallback = null) {
    const doc = getPlain(order);
    return getId(doc) || getId(fallback?.order_id);
}

function getOrderCode(order) {
    const doc = getPlain(order);
    return doc?.order_code || null;
}

function getOrderLabel(order) {
    const orderCode = getOrderCode(order);
    return orderCode ? `Đơn hàng ${orderCode}` : "Đơn hàng của bạn";
}

function getOrderMessageParams(order) {
    return {
        orderCode: getOrderCode(order),
    };
}

function getUserDisplayName(user) {
    const doc = getPlain(user);
    return (
        doc?.profile?.full_name ||
        doc?.full_name ||
        doc?.name ||
        doc?.email ||
        doc?.profile?.phone_number ||
        "you"
    );
}

function getOrderData(order, event, extra = {}) {
    const { payment, ...metadata } = extra;

    return {
        ref_type: 'order',
        ref_id: getOrderId(order, payment || null),
        extra: {
            event,
            order_code: getOrderCode(order),
            ...metadata,
        },
    };
}

class NotificationEventService {
    static async _create(sourceEvent, data) {
        if (!data.user_id) {
            logger.warn({
                event: 'notification_event_skipped',
                source_event: sourceEvent,
                reason: 'missing_user_id',
            });

            return null;
        }

        try {
            return await NotificationService.createNotification(data);
        } catch (error) {
            logger.warn({
                event: 'notification_event_failed',
                source_event: sourceEvent,
                user_id: data.user_id?.toString?.() || data.user_id,
                error: error.message,
            });

            return null;
        }
    }

    static async accountCreated(user) {
        const displayName = getUserDisplayName(user);

        return this._create('REGISTER_SUCCESS', {
            user_id: getUserId(user),
            type: 'system',
            title: "Tạo tài khoản thành công",
            title_key: 'notification.account.created.title',
            message: `Chào ${displayName}, tài khoản của bạn đã được tạo thành công.`,
            message_key: 'notification.account.created.message',
            message_params: { displayName },
            priority: 'low',
            data: {
                ref_type: null,
                ref_id: null,
                extra: {
                    event: 'REGISTER_SUCCESS',
                },
            },
        });
    }

    static async passwordChanged(user) {
        return this._create('PASSWORD_CHANGED', {
            user_id: getUserId(user),
            type: 'system',
            title: "Đổi mật khẩu thành công",
            title_key: 'notification.account.password_changed.title',
            message: "Mật khẩu tài khoản của bạn đã được thay đổi thành công.",
            message_key: 'notification.account.password_changed.message',
            message_params: {},
            priority: 'low',
            data: {
                ref_type: null,
                ref_id: null,
                extra: {
                    event: 'PASSWORD_CHANGED',
                },
            },
        });
    }

    static async orderCreated(order) {
        const label = getOrderLabel(order);

        return this._create('ORDER_CREATED', {
            user_id: getOrderUserId(order),
            type: 'order',
            title: "Đặt hàng thành công",
            title_key: 'notification.order.created.title',
            message: `${label} đã được tạo thành công.`,
            message_key: 'notification.order.created.message',
            message_params: getOrderMessageParams(order),
            priority: 'low',
            data: getOrderData(order, 'ORDER_CREATED', {
                status: 'PENDING',
            }),
        });
    }

    static async paymentSucceeded(order, payment = null) {
        const label = getOrderLabel(order);

        return this._create('PAYMENT_SUCCESS', {
            user_id: getOrderUserId(order, payment),
            type: 'order',
            title: "Thanh toán thành công",
            title_key: 'notification.payment.success.title',
            message: `Thanh toán cho ${label} đã thành công.`,
            message_key: 'notification.payment.success.message',
            message_params: getOrderMessageParams(order),
            priority: 'medium',
            data: getOrderData(order, 'PAYMENT_SUCCESS', {
                status: 'PAID',
                payment_id: getId(payment),
                payment,
            }),
        });
    }

    static async paymentFailed(order, payment = null, failure = {}) {
        const label = getOrderLabel(order);

        return this._create('PAYMENT_FAILED', {
            user_id: getOrderUserId(order, payment),
            type: 'order',
            title: "Thanh toán thất bại",
            title_key: 'notification.payment.failed.title',
            message: `Thanh toán cho ${label} thất bại. Vui lòng thử lại hoặc chọn phương thức khác.`,
            message_key: 'notification.payment.failed.message',
            message_params: getOrderMessageParams(order),
            priority: 'high',
            data: getOrderData(order, 'PAYMENT_FAILED', {
                status: 'FAILED',
                payment_id: getId(payment),
                failure_code: failure.failure_code || null,
                failure_reason: failure.failure_reason || null,
                payment,
            }),
        });
    }

    static async orderStatusChanged(order, status) {
        const notification = ORDER_STATUS_NOTIFICATIONS[status];

        if (!notification) {
            return null;
        }

        const label = getOrderLabel(order);

        return this._create(notification.event, {
            user_id: getOrderUserId(order),
            type: 'order',
            title: notification.title,
            title_key: notification.title_key,
            message: notification.message(label),
            message_key: notification.message_key,
            message_params: getOrderMessageParams(order),
            priority: notification.priority,
            data: getOrderData(order, notification.event, {
                status,
            }),
        });
    }

    static async reviewReminder(order, reviewWindow = {}) {
        const label = getOrderLabel(order);

        return this._create('ORDER_REVIEW_REMINDER', {
            user_id: getOrderUserId(order),
            type: 'order',
            title: "\u0110\u00e1nh gi\u00e1 s\u1ea3n ph\u1ea9m",
            title_key: 'notification.order.review_reminder.title',
            message: `${label} \u0111\u00e3 \u0111\u01b0\u1ee3c x\u00e1c nh\u1eadn nh\u1eadn h\u00e0ng. H\u00e3y \u0111\u00e1nh gi\u00e1 s\u1ea3n ph\u1ea9m trong 3 ng\u00e0y \u0111\u1ec3 chia s\u1ebb tr\u1ea3i nghi\u1ec7m c\u1ee7a b\u1ea1n.`,
            message_key: 'notification.order.review_reminder.message',
            message_params: getOrderMessageParams(order),
            priority: 'medium',
            data: getOrderData(order, 'ORDER_REVIEW_REMINDER', {
                status: 'DELIVERED',
                review_expires_at: reviewWindow.expires_at || null,
            }),
        });
    }
}

module.exports = NotificationEventService;
