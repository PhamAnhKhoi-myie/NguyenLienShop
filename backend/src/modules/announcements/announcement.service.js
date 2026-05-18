const Announcement = require('./announcement.model');
const AnnouncementMapper = require('./announcement.mapper');
const AppError = require('../../utils/appError.util');
const logger = require('../../utils/logger.util');

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

    static async createAnnouncement(data, userId) {
        const announcement = new Announcement({
            ...this.sanitizeAnnouncementData(data),
            created_by: userId
        });

        await announcement.save();

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

    static async updateAnnouncement(announcementId, data, userId) {
        const announcement = await Announcement.findById(announcementId);

        if (!announcement) {
            throw new AppError(
                'Announcement not found',
                404,
                'ANNOUNCEMENT_NOT_FOUND'
            );
        }

        const updateData = this.sanitizeAnnouncementData(data);

        Object.assign(announcement, updateData, { updated_by: userId });

        await announcement.save();

        logger.info({
            event: 'announcement_updated',
            announcement_id: announcementId,
            updated_by: userId,
            updated_fields: Object.keys(updateData)
        });

        return AnnouncementMapper.toDTO(announcement);
    }

    static async deleteAnnouncement(announcementId, userId) {
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

        logger.info({
            event: 'announcement_deleted',
            announcement_id: announcementId,
            deleted_by: userId
        });
    }

    static async restoreAnnouncement(announcementId, userId) {
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

        logger.info({
            event: 'announcement_restored',
            announcement_id: announcementId,
            restored_by: userId
        });

        const announcement = await Announcement.findById(announcementId);
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
}

module.exports = AnnouncementService;
