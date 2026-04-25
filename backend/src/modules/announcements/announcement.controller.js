const asyncHandler = require('../../utils/asyncHandler.util');
const AnnouncementService = require('./announcement.service');

class AnnouncementController {
    /**
     * GET /api/v1/announcements
     * Public: Get active announcements
     * ✅ No authentication required
     * ✅ Optional target filter via query
     */
    static getActive = asyncHandler(async (req, res) => {
        const { target } = req.query;

        const announcements = await AnnouncementService.getActive(target);

        res.json({
            success: true,
            data: announcements
        });
    });

    /**
     * GET /api/v1/announcements/:id
     * Public: Get single announcement
     */
    static getOne = asyncHandler(async (req, res) => {
        const { id } = req.params;

        const announcement = await AnnouncementService.getAnnouncementById(id);

        res.json({
            success: true,
            data: announcement
        });
    });

    /**
     * GET /api/v1/announcements/admin/all
     * Admin: Get all announcements (active + scheduled)
     * ✅ Authentication + authorization required
     */
    static getAll = asyncHandler(async (req, res) => {
        const { target, type, activeOnly } = req.query;

        const announcements = await AnnouncementService.getAll({
            target,
            type,
            activeOnly: activeOnly === 'true'
        });

        res.json({
            success: true,
            data: announcements
        });
    });

    /**
     * POST /api/v1/announcements
     * Admin: Create announcement
     * ✅ Validation done by middleware
     * ✅ Returns 201 Created
     */
    static create = asyncHandler(async (req, res) => {
        const announcement = await AnnouncementService.createAnnouncement(
            req.body,
            req.user.id
        );

        res.status(201).json({
            success: true,
            data: announcement
        });
    });

    /**
     * PUT /api/v1/announcements/:id
     * Admin: Update announcement
     * ✅ Validation done by middleware
     */
    static update = asyncHandler(async (req, res) => {
        const announcement = await AnnouncementService.updateAnnouncement(
            req.params.id,
            req.body,
            req.user.id
        );

        res.json({
            success: true,
            data: announcement
        });
    });

    /**
     * DELETE /api/v1/announcements/:id
     * Admin: Soft delete announcement
     */
    static delete = asyncHandler(async (req, res) => {
        await AnnouncementService.deleteAnnouncement(
            req.params.id,
            req.user.id
        );

        res.json({
            success: true,
            message: 'Announcement deleted successfully'
        });
    });

    /**
     * GET /api/v1/announcements/admin/deleted
     * Admin: Get deleted announcements (for recovery)
     * ✅ Must come BEFORE /:id route
     */
    static getDeleted = asyncHandler(async (req, res) => {
        const announcements = await AnnouncementService.getDeletedAnnouncements();

        res.json({
            success: true,
            data: announcements
        });
    });

    /**
     * POST /api/v1/announcements/:id/restore
     * Admin: Restore deleted announcement
     */
    static restore = asyncHandler(async (req, res) => {
        const announcement = await AnnouncementService.restoreAnnouncement(
            req.params.id,
            req.user.id
        );

        res.json({
            success: true,
            data: announcement,
            message: 'Announcement restored successfully'
        });
    });

    /**
     * GET /api/v1/announcements/admin/scheduled
     * Admin: Get scheduled announcements (not started yet)
     * ✅ Must come BEFORE /:id route
     */
    static getScheduled = asyncHandler(async (req, res) => {
        const announcements = await AnnouncementService.getScheduledAnnouncements();

        res.json({
            success: true,
            data: announcements
        });
    });

    /**
     * GET /api/v1/announcements/admin/expired
     * Admin: Get expired announcements
     * ✅ Must come BEFORE /:id route
     */
    static getExpired = asyncHandler(async (req, res) => {
        const announcements = await AnnouncementService.getExpiredAnnouncements();

        res.json({
            success: true,
            data: announcements
        });
    });
}

module.exports = AnnouncementController;