const Notification = require('./notification.model');
const NotificationMapper = require('./notification.mapper');
const AppError = require('../../utils/appError.util');
const NotificationAuditLogService = require('../audit_logs/notification_audit_log/notification_log.service');
const { AUDIT_ACTIONS } = require('../../constants/audit');
const logger = require('../../utils/logger.util');

const ERROR_CODES = {
    NOTIFICATION_NOT_FOUND: 'NOTIFICATION_NOT_FOUND',
    INVALID_INPUT: 'INVALID_INPUT',
    DATABASE_ERROR: 'DATABASE_ERROR'
};

class NotificationService {
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
            const query = { user_id: userId, deleted_at: null };

            if (type) query.type = type;
            if (priority) query.priority = priority;
            if (unread_only) query.read_at = null;

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

    static async getUnreadCount(userId) {
        try {
            const count = await Notification.countDocuments({
                user_id: userId,
                read_at: null,
                deleted_at: null
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

    static async markAsRead(notificationId, userId, metadata = {}) {
        try {
            const notification = await Notification.findOne({
                _id: notificationId,
                user_id: userId,
                deleted_at: null
            });

            if (!notification) {
                throw new AppError(
                    'Notification not found',
                    404,
                    ERROR_CODES.NOTIFICATION_NOT_FOUND
                );
            }

            if (notification.read_at) {
                return NotificationMapper.toDTO(notification);
            }

            const before = {
                read_at: notification.read_at
            };

            notification.read_at = new Date();
            const updated = await notification.save();

            await this._createNotificationAuditLog({
                action: AUDIT_ACTIONS.MARK_NOTIFICATION_READ,
                notification: updated,
                actorId: userId,
                metadata,
                changes: {
                    before,
                    after: {
                        read_at: updated.read_at
                    }
                }
            });

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

    static async markBulkAsRead(notificationIds, userId, metadata = {}) {
        try {
            const targetNotifications = await Notification.find({
                _id: { $in: notificationIds },
                user_id: userId,
                read_at: null,
                deleted_at: null
            }).select('_id type priority read_at');

            const result = await Notification.updateMany(
                {
                    _id: { $in: notificationIds },
                    user_id: userId,
                    read_at: null,
                    deleted_at: null
                },
                {
                    read_at: new Date()
                }
            );

            await this._createNotificationAuditLog({
                action: AUDIT_ACTIONS.MARK_BULK_NOTIFICATIONS_READ,
                userId,
                actorId: userId,
                notificationIds: targetNotifications.map(item => item._id),
                metadata,
                changes: {
                    requested_ids: notificationIds,
                    matched_ids: targetNotifications.map(item => item._id),
                    requested_count: notificationIds.length,
                    matched_count: targetNotifications.length,
                    marked_count: result.modifiedCount
                }
            });

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

    static async markAllAsRead(userId, metadata = {}) {
        try {
            const result = await Notification.updateMany(
                {
                    user_id: userId,
                    read_at: null,
                    deleted_at: null
                },
                {
                    read_at: new Date()
                }
            );

            await this._createNotificationAuditLog({
                action: AUDIT_ACTIONS.MARK_ALL_NOTIFICATIONS_READ,
                userId,
                actorId: userId,
                metadata,
                changes: {
                    marked_count: result.modifiedCount
                }
            });

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

    static async deleteNotification(notificationId, userId, metadata = {}) {
        try {
            const notification = await Notification.findOne({
                _id: notificationId,
                user_id: userId,
                deleted_at: null
            });

            if (!notification) {
                throw new AppError(
                    'Notification not found',
                    404,
                    ERROR_CODES.NOTIFICATION_NOT_FOUND
                );
            }

            notification.deleted_at = new Date();
            await notification.save();

            await this._createNotificationAuditLog({
                action: AUDIT_ACTIONS.DELETE_NOTIFICATION_SOFT,
                notification,
                actorId: userId,
                metadata,
                changes: {
                    before: {
                        deleted_at: null
                    },
                    after: {
                        deleted_at: notification.deleted_at
                    }
                }
            });

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

    static async deleteAllNotifications(userId, metadata = {}) {
        try {
            const result = await Notification.updateMany(
                {
                    user_id: userId,
                    deleted_at: null
                },
                {
                    deleted_at: new Date()
                }
            );

            await this._createNotificationAuditLog({
                action: AUDIT_ACTIONS.DELETE_ALL_NOTIFICATIONS_SOFT,
                userId,
                actorId: userId,
                metadata,
                changes: {
                    deleted_count: result.modifiedCount
                }
            });

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

    static async getNotificationById(notificationId, userId) {
        try {
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

    static _toAuditValue(value) {
        if (value == null) return value;

        if (value instanceof Date) {
            return value.toISOString();
        }

        if (value?._bsontype === 'ObjectId') {
            return value.toString();
        }

        if (Array.isArray(value)) {
            return value.map((item) => this._toAuditValue(item));
        }

        if (value?.toObject) {
            return this._toAuditValue(value.toObject());
        }

        if (typeof value === 'object') {
            return Object.fromEntries(
                Object.entries(value).map(([key, item]) => [
                    key,
                    this._toAuditValue(item),
                ])
            );
        }

        return value;
    }

    static async _createNotificationAuditLog({
        action,
        notification = null,
        userId = null,
        actorId = null,
        actorType = 'USER',
        notificationIds = [],
        metadata = {},
        changes = {},
    }) {
        await NotificationAuditLogService.createLog({
            actor_id: actorId,
            actor_type: actorType,
            action,
            notification_id: notification?._id || null,
            notification_ids: notificationIds,
            user_id: notification?.user_id || userId || actorId,
            notification_type: notification?.type || null,
            priority: notification?.priority || null,
            changes: this._toAuditValue(changes),
            ip_address: metadata.ip || null,
            user_agent: metadata.userAgent || null,
        });
    }
}

module.exports = NotificationService;
