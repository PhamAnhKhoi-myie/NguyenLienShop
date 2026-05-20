const Announcement = require('./announcement.model');
const AnnouncementMapper = require('./announcement.mapper');
const AppError = require('../../utils/appError.util');
const logger = require('../../utils/logger.util');
const ShopContentAuditLogService = require('../audit_logs/shop_content_audit_log/content_log.service');
const { AUDIT_ACTIONS } = require('../../constants/audit');

class AnnouncementService {
    static writableFields = [
        'title',
        'content',
        'priority',
        'target',
        'type',
        'is_dismissible',
        'start_at',
        'end_at'
    ];

    static sanitizeAnnouncementData(data = {}) {
        return this.writableFields.reduce((payload, field) => {
            if (Object.prototype.hasOwnProperty.call(data, field)) {
                payload[field] = data[field];
            }

            return payload;
        }, {});
    }

    static normalizeRoles(user) {
        return Array.isArray(user?.roles)
            ? user.roles.map((role) => String(role).toUpperCase())
            : [];
    }

    static isAdmin(user) {
        return this.normalizeRoles(user).includes('ADMIN');
    }

    static isActive(announcement, now = new Date()) {
        return announcement.start_at <= now && now < announcement.end_at;
    }

    static assertCanViewTarget(target, user) {
        if (!target || target === 'all' || target === 'guest') {
            return;
        }

        if (target === 'admin' && this.isAdmin(user)) {
            return;
        }

        if (target === 'user' && user?.id) {
            return;
        }

        throw new AppError(
            'You do not have permission to view this announcement target',
            403,
            'ANNOUNCEMENT_TARGET_FORBIDDEN'
        );
    }

    static canViewAnnouncement(announcement, user, now = new Date()) {
        if (this.isAdmin(user)) {
            return true;
        }

        if (!this.isActive(announcement, now)) {
            return false;
        }

        if (announcement.target === 'all') {
            return true;
        }

        if (announcement.target === 'guest') {
            return !user?.id;
        }

        if (announcement.target === 'user') {
            return Boolean(user?.id);
        }

        return false;
    }

    static async getActive(target = null, user = null) {
        const now = new Date();

        this.assertCanViewTarget(target, user);

        const query = {
            is_deleted: false,
            start_at: { $lte: now },
            end_at: { $gt: now }
        };

        if (target) {
            query.$or = [{ target: 'all' }, { target }];
        } else {
            query.target = 'all';
        }

        const announcements = await Announcement.find(query)
            .sort({ priority: -1, start_at: -1 })
            .exec();

        return AnnouncementMapper.toDTOList(announcements);
    }

    static async getAll(filters = {}) {
        const query = { is_deleted: false };

        if (filters.target) {
            query.target = filters.target;
        }

        if (filters.type) {
            query.type = filters.type;
        }

        if (filters.activeOnly) {
            const now = new Date();
            query.start_at = { $lte: now };
            query.end_at = { $gt: now };
        }

        const announcements = await Announcement.find(query)
            .sort({ priority: -1, start_at: -1 })
            .exec();

        return AnnouncementMapper.toDTOList(announcements);
    }

    static async getAnnouncementById(announcementId, user = null) {
        const announcement = await Announcement.findById(announcementId);

        if (!announcement) {
            throw new AppError(
                'Announcement not found',
                404,
                'ANNOUNCEMENT_NOT_FOUND'
            );
        }

        if (!this.canViewAnnouncement(announcement, user)) {
            throw new AppError(
                'Announcement not found',
                404,
                'ANNOUNCEMENT_NOT_FOUND'
            );
        }

        return AnnouncementMapper.toDTO(announcement);
    }

    static async createAnnouncement(data, userId, metadata = {}) {
        const announcement = new Announcement({
            ...this.sanitizeAnnouncementData(data),
            created_by: userId
        });

        await announcement.save();

        await this._createAnnouncementAuditLog({
            action: AUDIT_ACTIONS.CREATE_ANNOUNCEMENT,
            announcement,
            actorId: userId,
            metadata,
            changes: ShopContentAuditLogService.buildCreatedChanges(
                announcement,
                [...this.writableFields, 'is_deleted']
            ),
        });

        logger.info({
            event: 'announcement_created',
            announcement_id: announcement._id.toString(),
            title: announcement.title,
            target: announcement.target,
            priority: announcement.priority,
            created_by: userId
        });

        return AnnouncementMapper.toDTO(announcement);
    }

    static async updateAnnouncement(announcementId, data, userId, metadata = {}) {
        const announcement = await Announcement.findById(announcementId);

        if (!announcement) {
            throw new AppError(
                'Announcement not found',
                404,
                'ANNOUNCEMENT_NOT_FOUND'
            );
        }

        const updateData = this.sanitizeAnnouncementData(data);
        const before = announcement.toObject();

        Object.assign(announcement, updateData, { updated_by: userId });

        await announcement.save();

        await this._createAnnouncementAuditLog({
            action: AUDIT_ACTIONS.UPDATE_ANNOUNCEMENT,
            announcement,
            actorId: userId,
            metadata,
            changes: ShopContentAuditLogService.buildUpdatedChanges(
                before,
                announcement,
                [...Object.keys(updateData), 'updated_by']
            ),
        });

        logger.info({
            event: 'announcement_updated',
            announcement_id: announcementId,
            updated_by: userId,
            updated_fields: Object.keys(updateData)
        });

        return AnnouncementMapper.toDTO(announcement);
    }

    static async deleteAnnouncement(announcementId, userId, metadata = {}) {
        const before = await Announcement.findById(announcementId)
            .setOptions({ includeDeleted: true });

        if (!before) {
            throw new AppError(
                'Announcement not found',
                404,
                'ANNOUNCEMENT_NOT_FOUND'
            );
        }

        const result = await Announcement.updateOne(
            { _id: announcementId },
            {
                is_deleted: true,
                deleted_at: new Date(),
                updated_by: userId
            }
        );

        if (result.matchedCount === 0) {
            throw new AppError(
                'Announcement not found',
                404,
                'ANNOUNCEMENT_NOT_FOUND'
            );
        }

        const announcement = await Announcement.findById(announcementId)
            .setOptions({ includeDeleted: true });

        await this._createAnnouncementAuditLog({
            action: AUDIT_ACTIONS.DELETE_ANNOUNCEMENT_SOFT,
            announcement,
            actorId: userId,
            metadata,
            changes: ShopContentAuditLogService.buildUpdatedChanges(
                before,
                announcement,
                ['is_deleted', 'deleted_at', 'updated_by']
            ),
        });

        logger.info({
            event: 'announcement_deleted',
            announcement_id: announcementId,
            deleted_by: userId
        });
    }

    static async restoreAnnouncement(announcementId, userId, metadata = {}) {
        const before = await Announcement.findById(announcementId)
            .setOptions({ includeDeleted: true });

        if (!before) {
            throw new AppError(
                'Announcement not found',
                404,
                'ANNOUNCEMENT_NOT_FOUND'
            );
        }

        const result = await Announcement.updateOne(
            { _id: announcementId },
            {
                is_deleted: false,
                deleted_at: null,
                updated_by: userId
            }
        );

        if (result.matchedCount === 0) {
            throw new AppError(
                'Announcement not found',
                404,
                'ANNOUNCEMENT_NOT_FOUND'
            );
        }

        const announcement = await Announcement.findById(announcementId)
            .setOptions({ includeDeleted: true });

        await this._createAnnouncementAuditLog({
            action: AUDIT_ACTIONS.RESTORE_ANNOUNCEMENT,
            announcement,
            actorId: userId,
            metadata,
            changes: ShopContentAuditLogService.buildUpdatedChanges(
                before,
                announcement,
                ['is_deleted', 'deleted_at', 'updated_by']
            ),
        });

        logger.info({
            event: 'announcement_restored',
            announcement_id: announcementId,
            restored_by: userId
        });

        return AnnouncementMapper.toDTO(announcement);
    }

    static async getDeletedAnnouncements() {
        const announcements = await Announcement.find(
            { is_deleted: true },
            null,
            { includeDeleted: true }
        )
            .sort({ deleted_at: -1 })
            .exec();

        return AnnouncementMapper.toDTOList(announcements);
    }

    static async getScheduledAnnouncements() {
        const now = new Date();

        const announcements = await Announcement.find({
            is_deleted: false,
            start_at: { $gt: now }
        })
            .sort({ start_at: 1 })
            .exec();

        return AnnouncementMapper.toDTOList(announcements);
    }

    static async getExpiredAnnouncements() {
        const now = new Date();

        const announcements = await Announcement.find({
            is_deleted: false,
            end_at: { $lte: now }
        })
            .sort({ end_at: -1 })
            .exec();

        return AnnouncementMapper.toDTOList(announcements);
    }

    static getPublicStatus(announcement) {
        if (announcement?.is_deleted) {
            return 'DELETED';
        }

        const now = new Date();

        if (announcement?.start_at && announcement.start_at > now) {
            return 'SCHEDULED';
        }
        if (announcement?.end_at && announcement.end_at <= now) {
            return 'EXPIRED';
        }

        return 'ACTIVE';
    }

    static async _createAnnouncementAuditLog({
        action,
        announcement,
        actorId,
        metadata = {},
        changes = {},
    }) {
        await ShopContentAuditLogService.createLog({
            actor_id: actorId,
            actor_type: 'ADMIN',
            action,
            target_type: 'ANNOUNCEMENT',
            banner_id: null,
            announcement_id: announcement._id,
            shop_info_id: null,
            display_name: announcement.title || null,
            public_status: this.getPublicStatus(announcement),
            changes,
            ip_address: metadata.ip || null,
            user_agent: metadata.userAgent || null,
        });
    }
}

module.exports = AnnouncementService;
