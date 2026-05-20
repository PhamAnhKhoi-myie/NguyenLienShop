const asyncHandler = require('../../utils/asyncHandler.util');
const BannerService = require('./banner.service');
const { assertAuthenticated } = require('../../utils/auth.util');
const { buildAuditMetadata } = require('../../utils/audit.util');

class BannerController {
    static getByLocation = asyncHandler(async (req, res) => {
        const { location } = req.params;

        const banners = await BannerService.getActiveByLocation(location);

        res.json({
            success: true,
            data: banners
        });
    });

    static getOne = asyncHandler(async (req, res) => {
        const { id } = req.params;

        const banner = await BannerService.getBannerById(id);

        res.json({
            success: true,
            data: banner
        });
    });

    static getAll = asyncHandler(async (req, res) => {
        const { location } = req.query;

        const banners = await BannerService.getAll({ location });

        res.json({
            success: true,
            data: banners
        });
    });

    static create = asyncHandler(async (req, res) => {
        const user = assertAuthenticated(req.user);

        const banner = await BannerService.createBanner(
            req.body,
            user.userId,
            buildAuditMetadata(req)
        );

        res.status(201).json({
            success: true,
            data: banner
        });
    });

    static update = asyncHandler(async (req, res) => {
        const user = assertAuthenticated(req.user);

        const banner = await BannerService.updateBanner(
            req.params.id,
            req.body,
            user.userId,
            buildAuditMetadata(req)
        );

        res.json({
            success: true,
            data: banner
        });
    });

    static delete = asyncHandler(async (req, res) => {
        const user = assertAuthenticated(req.user);

        await BannerService.deleteBanner(
            req.params.id,
            user.userId,
            buildAuditMetadata(req)
        );

        res.json({
            success: true,
            message: 'Banner deleted successfully'
        });
    });

    static getDeleted = asyncHandler(async (req, res) => {
        const banners = await BannerService.getDeletedBanners();

        res.json({
            success: true,
            data: banners
        });
    });

    static restore = asyncHandler(async (req, res) => {
        const user = assertAuthenticated(req.user);

        const banner = await BannerService.restoreBanner(
            req.params.id,
            user.userId,
            buildAuditMetadata(req)
        );

        res.json({
            success: true,
            data: banner,
            message: 'Banner restored successfully'
        });
    });
}

module.exports = BannerController;
