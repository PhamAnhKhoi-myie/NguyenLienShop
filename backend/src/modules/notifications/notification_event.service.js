const NotificationService = require('./notification.service');
const logger = require('../../utils/logger.util');

const ORDER_STATUS_NOTIFICATIONS = {
    PROCESSING: {
        title: "Order is being processed",
        event: 'ORDER_PROCESSING',
        priority: 'medium',
        message: (label) => `${label} is being processed.`,
    },
    SHIPPED: {
        title: "Order is being delivered",
        event: 'ORDER_SHIPPED',
        priority: 'medium',
        message: (label) => `${label} is being delivered.`,
    },
    DELIVERED: {
        title: "Successfully delivered",
        event: 'ORDER_DELIVERED',
        priority: 'medium',
        message: (label) => `${label} has been delivered successfully.`,
    },
    CANCELED: {
        title: "Order has been canceled",
        event: 'ORDER_CANCELED',
        priority: 'high',
        message: (label) => `${label} has been cancelled.`,
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
    return orderCode ? `Order ${orderCode}` : "Your order";
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
            title: "Account created successfully",
            message: `Welcome ${displayName} has successfully created an account.`,
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
            title: "Password changed successfully",
            message: "Your account password has been changed successfully.",
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
            title: "Order successful",
            message: `${label} was created successfully.`,
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
            title: "Successful payment",
            message: `Payment for ${label.toLowerCase()} was successful.`,
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
            title: "Payment failed",
            message: `Payment for ${label.toLowerCase()} failed. Please try again or choose another method.`,
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
            message: notification.message(label),
            priority: notification.priority,
            data: getOrderData(order, notification.event, {
                status,
            }),
        });
    }
}

module.exports = NotificationEventService;
