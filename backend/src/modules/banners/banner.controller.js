const asyncHandler = require('../../utils/asyncHandler.util');
const BannerService = require('./banner.service');

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
        const banner = await BannerService.createBanner(
            req.body,
            req.user.id
        );

        res.status(201).json({
            success: true,
            data: banner
        });
    });

    static update = asyncHandler(async (req, res) => {
        const banner = await BannerService.updateBanner(
            req.params.id,
            req.body,
            req.user.id
        );

        res.json({
            success: true,
            data: banner
        });
    });

    static delete = asyncHandler(async (req, res) => {
        await BannerService.deleteBanner(req.params.id, req.user.id);

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
        const banner = await BannerService.restoreBanner(
            req.params.id,
            req.user.id
        );

        res.json({
            success: true,
            data: banner,
            message: 'Banner restored successfully'
        });
    });
}

module.exports = BannerController;