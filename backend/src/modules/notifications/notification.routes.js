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

// ✅ CRITICAL: Apply authentication middleware to ALL routes
router.use(authenticate);

/**
 * @route GET /api/v1/notifications/unread-count
 * @desc Get unread notification count
 * @access Private (authenticated)
 */
router.get('/unread-count', NotificationController.getUnreadCount);

/**
 * @route PATCH /api/v1/notifications/mark-all-read
 * @desc Mark all notifications as read
 * @access Private (authenticated)
 */
router.patch(
    '/mark-all-read',
    NotificationController.markAllAsRead
);

/**
 * @route PATCH /api/v1/notifications/bulk/mark-read
 * @desc Mark multiple notifications as read
 * @access Private (authenticated)
 */
router.patch(
    '/bulk/mark-read',
    validate(markBulkAsReadSchema, 'body'),
    NotificationController.markBulkAsRead
);

/**
 * @route GET /api/v1/notifications/:notificationId
 * @desc Get single notification
 * @access Private (authenticated)
 */
router.get(
    '/:notificationId',
    validate(deleteNotificationSchema, 'params'),
    NotificationController.getNotificationById
);

/**
 * @route PATCH /api/v1/notifications/:notificationId/read
 * @desc Mark single notification as read
 * @access Private (authenticated)
 */
router.patch(
    '/:notificationId/read',
    validate(markAsReadSchema, 'params'),
    NotificationController.markAsRead
);

/**
 * @route DELETE /api/v1/notifications/:notificationId
 * @desc Delete single notification
 * @access Private (authenticated)
 */
router.delete(
    '/:notificationId',
    validate(deleteNotificationSchema, 'params'),
    NotificationController.deleteNotification
);

/**
 * @route GET /api/v1/notifications
 * @desc Get paginated notifications (LIST - LAST)
 * @access Private (authenticated)
 */
router.get(
    '/',
    validate(getNotificationsSchema, 'query'),
    NotificationController.getNotifications
);

/**
 * @route DELETE /api/v1/notifications
 * @desc Delete all notifications
 * @access Private (authenticated)
 */
router.delete('/', NotificationController.deleteAllNotifications);

module.exports = router;