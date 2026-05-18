const asyncHandler = require('../../utils/asyncHandler.util');
const AnnouncementService = require('./announcement.service');

class AnnouncementController {
    static getActive = asyncHandler(async (req, res) => {
        const { target } = req.query;

        const announcements = await AnnouncementService.getActive(
            target,
            req.user
        );

        res.json({
            success: true,
            data: announcements
        });
    });

    static getOne = asyncHandler(async (req, res) => {
        const { id } = req.params;

        const announcement = await AnnouncementService.getAnnouncementById(
            id,
            req.user
        );

        res.json({
            success: true,
            data: announcement
        });
    });

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

    static getDeleted = asyncHandler(async (req, res) => {
        const announcements = await AnnouncementService.getDeletedAnnouncements();

        res.json({
            success: true,
            data: announcements
        });
    });

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

    static getScheduled = asyncHandler(async (req, res) => {
        const announcements = await AnnouncementService.getScheduledAnnouncements();

        res.json({
            success: true,
            data: announcements
        });
    });

    static getExpired = asyncHandler(async (req, res) => {
        const announcements = await AnnouncementService.getExpiredAnnouncements();

        res.json({
            success: true,
            data: announcements
        });
    });
}

module.exports = AnnouncementController;
