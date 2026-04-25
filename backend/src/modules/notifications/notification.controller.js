const asyncHandler = require('../../utils/asyncHandler.util');
const NotificationService = require('./notification.service');
const logger = require('../../utils/logger.util');

class NotificationController {
    /**
     * Get paginated notifications for authenticated user
     * GET /api/v1/notifications
     */
    static getNotifications = asyncHandler(async (req, res) => {
        const { page, limit, type, priority, unread_only } = req.query;

        const result = await NotificationService.getNotifications(
            req.user.id,
            {
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 10,
                type,
                priority,
                unread_only: unread_only === 'true'
            }
        );

        logger.info({
            event: 'notifications_fetched',
            user_id: req.user.id,
            count: result.data.length,
            page: result.pagination.page,
            total: result.pagination.total
        });

        res.status(200).json({
            success: true,
            data: result.data,
            pagination: result.pagination
        });
    });

    /**
     * Get unread notification count
     * GET /api/v1/notifications/unread-count
     */
    static getUnreadCount = asyncHandler(async (req, res) => {
        const count = await NotificationService.getUnreadCount(req.user.id);

        res.status(200).json({
            success: true,
            data: {
                unread_count: count
            }
        });
    });

    /**
     * Get single notification by ID
     * GET /api/v1/notifications/:notificationId
     */
    static getNotificationById = asyncHandler(async (req, res) => {
        const notification = await NotificationService.getNotificationById(
            req.params.notificationId,
            req.user.id
        );

        logger.info({
            event: 'notification_fetched',
            notification_id: req.params.notificationId,
            user_id: req.user.id
        });

        res.status(200).json({
            success: true,
            data: notification
        });
    });

    /**
     * Mark single notification as read
     * PATCH /api/v1/notifications/:notificationId/read
     */
    static markAsRead = asyncHandler(async (req, res) => {
        const notification = await NotificationService.markAsRead(
            req.params.notificationId,
            req.user.id
        );

        res.status(200).json({
            success: true,
            data: notification
        });
    });

    /**
     * Mark multiple notifications as read
     * PATCH /api/v1/notifications/bulk/mark-read
     */
    static markBulkAsRead = asyncHandler(async (req, res) => {
        const { notification_ids } = req.body;

        const result = await NotificationService.markBulkAsRead(
            notification_ids,
            req.user.id
        );

        logger.info({
            event: 'notifications_marked_bulk_read',
            user_id: req.user.id,
            marked_count: result.marked_count
        });

        res.status(200).json({
            success: true,
            data: result
        });
    });

    /**
     * Mark all notifications as read
     * PATCH /api/v1/notifications/mark-all-read
     */
    static markAllAsRead = asyncHandler(async (req, res) => {
        const result = await NotificationService.markAllAsRead(req.user.id);

        logger.info({
            event: 'all_notifications_marked_read',
            user_id: req.user.id,
            marked_count: result.marked_count
        });

        res.status(200).json({
            success: true,
            data: result
        });
    });

    /**
     * Delete single notification
     * DELETE /api/v1/notifications/:notificationId
     */
    static deleteNotification = asyncHandler(async (req, res) => {
        await NotificationService.deleteNotification(
            req.params.notificationId,
            req.user.id
        );

        logger.info({
            event: 'notification_deleted',
            notification_id: req.params.notificationId,
            user_id: req.user.id
        });

        res.status(200).json({
            success: true,
            message: 'Notification deleted successfully'
        });
    });

    /**
     * Delete all notifications for user
     * DELETE /api/v1/notifications
     */
    static deleteAllNotifications = asyncHandler(async (req, res) => {
        const result = await NotificationService.deleteAllNotifications(
            req.user.id
        );

        logger.info({
            event: 'all_notifications_deleted',
            user_id: req.user.id,
            deleted_count: result.deleted_count
        });

        res.status(200).json({
            success: true,
            data: result
        });
    });
}

module.exports = NotificationController;