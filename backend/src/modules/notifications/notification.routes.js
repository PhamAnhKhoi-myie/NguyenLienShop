const express = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const NotificationController = require('./notification.controller');

const {
    getNotificationsSchema,
    markAsReadSchema,
    markBulkAsReadSchema,
    deleteNotificationSchema
} = require('./notification.validator');

const router = express.Router();

router.use(authenticate);

router.get('/unread-count', NotificationController.getUnreadCount);

router.patch(
    '/mark-all-read',
    NotificationController.markAllAsRead
);

router.patch(
    '/bulk/mark-read',
    validate({ body: markBulkAsReadSchema }),
    NotificationController.markBulkAsRead
);

router.get(
    '/:notificationId',
    validate({ params: deleteNotificationSchema }),
    NotificationController.getNotificationById
);

router.patch(
    '/:notificationId/read',
    validate({ params: markAsReadSchema }),
    NotificationController.markAsRead
);

router.delete(
    '/:notificationId',
    validate({ params: deleteNotificationSchema }),
    NotificationController.deleteNotification
);

router.get(
    '/',
    validate({ query: getNotificationsSchema }),
    NotificationController.getNotifications
);

router.delete('/', NotificationController.deleteAllNotifications);

module.exports = router;
