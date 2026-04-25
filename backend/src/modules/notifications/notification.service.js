const Notification = require('./notification.model');
const NotificationMapper = require('./notification.mapper');
const AppError = require('../../utils/appError.util');
const logger = require('../../utils/logger.util');

const ERROR_CODES = {
    NOTIFICATION_NOT_FOUND: 'NOTIFICATION_NOT_FOUND',
    INVALID_INPUT: 'INVALID_INPUT',
    DATABASE_ERROR: 'DATABASE_ERROR'
};

class NotificationService {
    /**
     * Create notification (system/admin only)
     * @param {Object} data - Notification payload
     * @returns {Object} DTO
     */
    static async createNotification(data) {
        try {
            const notification = new Notification({
                user_id: data.user_id,
                type: data.type,
                title: data.title,
                message: data.message,
                data: data.data || null,
                priority: data.priority || 'low',
                delivered_at: new Date(),
                expire_at: data.expire_at || null
            });

            const saved = await notification.save();

            logger.info({
                event: 'notification_created',
                notification_id: saved._id.toString(),
                user_id: data.user_id.toString(),
                type: data.type,
                priority: data.priority
            });

            return NotificationMapper.toDTO(saved);
        } catch (error) {
            logger.error({
                event: 'notification_creation_failed',
                error: error.message,
                user_id: data.user_id
            });

            throw new AppError(
                'Failed to create notification',
                500,
                ERROR_CODES.DATABASE_ERROR
            );
        }
    }

    /**
     * Get paginated notifications for user
     * @param {String} userId - User ID
     * @param {Object} filters - Filter options
     * @returns {Object} { data, pagination }
     */
    static async getNotifications(userId, filters = {}) {
        const {
            page = 1,
            limit = 10,
            type,
            priority,
            unread_only = false
        } = filters;

        const skip = (page - 1) * limit;

        try {
            // ✅ Build query (ownership check)
            const query = { user_id: userId };

            if (type) query.type = type;
            if (priority) query.priority = priority;
            if (unread_only) query.read_at = null;

            // ✅ Fetch notifications (latest first)
            const [notifications, total] = await Promise.all([
                Notification.find(query)
                    .sort({ created_at: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),

                Notification.countDocuments(query)
            ]);

            const mapped = NotificationMapper.toPaginatedResponse(
                notifications,
                page,
                limit,
                total
            );

            logger.info({
                event: 'notifications_fetched',
                user_id: userId,
                count: notifications.length,
                filters: { type, priority, unread_only }
            });

            return mapped;
        } catch (error) {
            logger.error({
                event: 'notifications_fetch_failed',
                user_id: userId,
                error: error.message
            });

            throw new AppError(
                'Failed to fetch notifications',
                500,
                ERROR_CODES.DATABASE_ERROR
            );
        }
    }

    /**
     * Get unread count for user
     * @param {String} userId - User ID
     * @returns {Number} Unread count
     */
    static async getUnreadCount(userId) {
        try {
            const count = await Notification.countDocuments({
                user_id: userId,
                read_at: null
            });

            return count;
        } catch (error) {
            logger.error({
                event: 'unread_count_fetch_failed',
                user_id: userId,
                error: error.message
            });

            throw new AppError(
                'Failed to fetch unread count',
                500,
                ERROR_CODES.DATABASE_ERROR
            );
        }
    }

    /**
     * Mark single notification as read
     * @param {String} notificationId - Notification ID
     * @param {String} userId - User ID (ownership check)
     * @returns {Object} DTO
     */
    static async markAsRead(notificationId, userId) {
        try {
            // ✅ Ownership check
            const notification = await Notification.findOne({
                _id: notificationId,
                user_id: userId
            });

            if (!notification) {
                throw new AppError(
                    'Notification not found',
                    404,
                    ERROR_CODES.NOTIFICATION_NOT_FOUND
                );
            }

            // ✅ Already read → return as-is
            if (notification.read_at) {
                return NotificationMapper.toDTO(notification);
            }

            // ✅ Mark as read
            notification.read_at = new Date();
            const updated = await notification.save();

            logger.info({
                event: 'notification_marked_read',
                notification_id: notificationId,
                user_id: userId
            });

            return NotificationMapper.toDTO(updated);
        } catch (error) {
            if (error instanceof AppError) throw error;

            logger.error({
                event: 'notification_mark_read_failed',
                notification_id: notificationId,
                user_id: userId,
                error: error.message
            });

            throw new AppError(
                'Failed to mark notification as read',
                500,
                ERROR_CODES.DATABASE_ERROR
            );
        }
    }

    /**
     * Mark multiple notifications as read
     * @param {Array} notificationIds - Notification IDs
     * @param {String} userId - User ID (ownership check)
     * @returns {Object} { marked_count }
     */
    static async markBulkAsRead(notificationIds, userId) {
        try {
            // ✅ Bulk atomic update with ownership check
            const result = await Notification.updateMany(
                {
                    _id: { $in: notificationIds },
                    user_id: userId,
                    read_at: null
                },
                {
                    read_at: new Date()
                }
            );

            logger.info({
                event: 'notifications_marked_bulk_read',
                user_id: userId,
                marked_count: result.modifiedCount,
                requested_count: notificationIds.length
            });

            return {
                marked_count: result.modifiedCount
            };
        } catch (error) {
            logger.error({
                event: 'bulk_mark_read_failed',
                user_id: userId,
                error: error.message
            });

            throw new AppError(
                'Failed to mark notifications as read',
                500,
                ERROR_CODES.DATABASE_ERROR
            );
        }
    }

    /**
     * Mark all user notifications as read
     * @param {String} userId - User ID
     * @returns {Object} { marked_count }
     */
    static async markAllAsRead(userId) {
        try {
            const result = await Notification.updateMany(
                {
                    user_id: userId,
                    read_at: null
                },
                {
                    read_at: new Date()
                }
            );

            logger.info({
                event: 'all_notifications_marked_read',
                user_id: userId,
                marked_count: result.modifiedCount
            });

            return {
                marked_count: result.modifiedCount
            };
        } catch (error) {
            logger.error({
                event: 'mark_all_read_failed',
                user_id: userId,
                error: error.message
            });

            throw new AppError(
                'Failed to mark all notifications as read',
                500,
                ERROR_CODES.DATABASE_ERROR
            );
        }
    }

    /**
     * Delete notification (soft delete)
     * @param {String} notificationId - Notification ID
     * @param {String} userId - User ID (ownership check)
     * @returns {void}
     */
    static async deleteNotification(notificationId, userId) {
        try {
            // ✅ Soft delete with ownership check
            const result = await Notification.updateOne(
                {
                    _id: notificationId,
                    user_id: userId
                },
                {
                    deleted_at: new Date()
                }
            );

            if (result.matchedCount === 0) {
                throw new AppError(
                    'Notification not found',
                    404,
                    ERROR_CODES.NOTIFICATION_NOT_FOUND
                );
            }

            logger.info({
                event: 'notification_deleted',
                notification_id: notificationId,
                user_id: userId
            });
        } catch (error) {
            if (error instanceof AppError) throw error;

            logger.error({
                event: 'notification_delete_failed',
                notification_id: notificationId,
                user_id: userId,
                error: error.message
            });

            throw new AppError(
                'Failed to delete notification',
                500,
                ERROR_CODES.DATABASE_ERROR
            );
        }
    }

    /**
     * Delete all user notifications (soft delete)
     * @param {String} userId - User ID
     * @returns {Object} { deleted_count }
     */
    static async deleteAllNotifications(userId) {
        try {
            const result = await Notification.updateMany(
                { user_id: userId },
                { deleted_at: new Date() }
            );

            logger.info({
                event: 'all_notifications_deleted',
                user_id: userId,
                deleted_count: result.modifiedCount
            });

            return {
                deleted_count: result.modifiedCount
            };
        } catch (error) {
            logger.error({
                event: 'delete_all_notifications_failed',
                user_id: userId,
                error: error.message
            });

            throw new AppError(
                'Failed to delete all notifications',
                500,
                ERROR_CODES.DATABASE_ERROR
            );
        }
    }

    /**
     * Get single notification
     * @param {String} notificationId - Notification ID
     * @param {String} userId - User ID (ownership check)
     * @returns {Object} DTO
     */
    static async getNotificationById(notificationId, userId) {
        try {
            // ✅ Ownership check
            const notification = await Notification.findOne({
                _id: notificationId,
                user_id: userId
            });

            if (!notification) {
                throw new AppError(
                    'Notification not found',
                    404,
                    ERROR_CODES.NOTIFICATION_NOT_FOUND
                );
            }

            return NotificationMapper.toDTO(notification);
        } catch (error) {
            if (error instanceof AppError) throw error;

            logger.error({
                event: 'notification_fetch_by_id_failed',
                notification_id: notificationId,
                user_id: userId,
                error: error.message
            });

            throw new AppError(
                'Failed to fetch notification',
                500,
                ERROR_CODES.DATABASE_ERROR
            );
        }
    }
}

module.exports = NotificationService;