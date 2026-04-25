const Announcement = require('./announcement.model');
const AnnouncementMapper = require('./announcement.mapper');
const AppError = require('../../utils/appError.util');
const logger = require('../../utils/logger.util');

class AnnouncementService {
    /**
     * Get active announcements (public endpoint)
     * ✅ Only return currently active announcements (start_at ≤ now < end_at)
     * ✅ Sorted by priority (highest first), then by start_at
     * ✅ Optional target filter
     */
    static async getActive(target = null) {
        const now = new Date();

        const query = {
            is_deleted: false,
            start_at: { $lte: now },
            end_at: { $gt: now }
        };

        // Optional target filter (for role-based announcements)
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

    /**
     * Get all announcements (admin only)
     * ✅ Return active + scheduled announcements
     * ✅ Optional filters by target, type, status
     */
    static async getAll(filters = {}) {
        const query = { is_deleted: false };

        if (filters.target) {
            query.target = filters.target;
        }

        if (filters.type) {
            query.type = filters.type;
        }

        // Optional: only active (not scheduled)
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

    /**
     * Get single announcement by ID
     * ✅ Safe for public
     */
    static async getAnnouncementById(announcementId) {
        const announcement = await Announcement.findById(announcementId);

        if (!announcement) {
            throw new AppError(
                'Announcement not found',
                404,
                'ANNOUNCEMENT_NOT_FOUND'
            );
        }

        return AnnouncementMapper.toDTO(announcement);
    }

    /**
     * Create announcement
     * ✅ Validation already done by middleware
     * ✅ Audit trail (created_by)
     * ✅ Structured logging
     */
    static async createAnnouncement(data, userId) {
        const announcement = new Announcement({
            ...data,
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

    /**
     * Update announcement
     * ✅ Check ownership (document exists)
     * ✅ Audit trail (updated_by)
     * ✅ Structured logging
     */
    static async updateAnnouncement(announcementId, data, userId) {
        const announcement = await Announcement.findById(announcementId);

        if (!announcement) {
            throw new AppError(
                'Announcement not found',
                404,
                'ANNOUNCEMENT_NOT_FOUND'
            );
        }

        // Update fields and audit trail
        Object.assign(announcement, data, { updated_by: userId });

        await announcement.save();

        logger.info({
            event: 'announcement_updated',
            announcement_id: announcementId,
            updated_by: userId,
            updated_fields: Object.keys(data)
        });

        return AnnouncementMapper.toDTO(announcement);
    }

    /**
     * Soft delete announcement
     * ✅ Set is_deleted = true, deleted_at = now
     * ✅ Audit trail (updated_by)
     * ✅ Structured logging
     */
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

    /**
     * Restore deleted announcement
     * ✅ Set is_deleted = false, deleted_at = null
     * ✅ Audit trail (updated_by)
     * ✅ Structured logging
     */
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

    /**
     * Get deleted announcements (admin recovery)
     * ✅ Bypass auto-filter with includeDeleted option
     * ✅ Sorted by deleted_at (newest first)
     */
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

    /**
     * Get scheduled announcements (not started yet)
     * ✅ For admin preview
     */
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

    /**
     * Get expired announcements
     * ✅ For audit/archive
     */
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