const asyncHandler = require('../../utils/asyncHandler.util');
const BannerService = require('./banner.service');

class BannerController {
    /**
     * GET /api/v1/banners/location/:location
     * Public endpoint: Get active banners for a location
     * ✅ asyncHandler wraps all functions
     * ✅ No authentication required
     */
    static getByLocation = asyncHandler(async (req, res) => {
        const { location } = req.params;

        const banners = await BannerService.getActiveByLocation(location);

        res.json({
            success: true,
            data: banners
        });
    });

    /**
     * GET /api/v1/banners/:id
     * Public endpoint: Get single banner
     * ✅ No authentication required
     * ✅ Returns banner regardless of active status
     */
    static getOne = asyncHandler(async (req, res) => {
        const { id } = req.params;

        const banner = await BannerService.getBannerById(id);

        res.json({
            success: true,
            data: banner
        });
    });

    /**
     * GET /api/v1/banners
     * Admin only: Get all banners (active + scheduled)
     * ✅ Authentication + authorization required
     * ✅ Optional location filter via query
     */
    static getAll = asyncHandler(async (req, res) => {
        const { location } = req.query;

        const banners = await BannerService.getAll({ location });

        res.json({
            success: true,
            data: banners
        });
    });

    /**
     * POST /api/v1/banners
     * Admin only: Create banner
     * ✅ Validation done by middleware
     * ✅ User ID from JWT (audit trail)
     * ✅ Returns 201 Created
     */
    static create = asyncHandler(async (req, res) => {
        const banner = await BannerService.createBanner(
            req.body,
            req.user.id // From JWT authentication
        );

        res.status(201).json({
            success: true,
            data: banner
        });
    });

    /**
     * PUT /api/v1/banners/:id
     * Admin only: Update banner
     * ✅ Validation done by middleware
     * ✅ User ID from JWT (audit trail)
     */
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

    /**
     * DELETE /api/v1/banners/:id
     * Admin only: Soft delete banner
     * ✅ User ID from JWT for audit trail
     */
    static delete = asyncHandler(async (req, res) => {
        await BannerService.deleteBanner(req.params.id, req.user.id);

        res.json({
            success: true,
            message: 'Banner deleted successfully'
        });
    });

    /**
     * GET /api/v1/banners/deleted
     * Admin only: Get deleted banners (for recovery)
     * ✅ Shows audit trail with deleted_at timestamp
     */
    static getDeleted = asyncHandler(async (req, res) => {
        const banners = await BannerService.getDeletedBanners();

        res.json({
            success: true,
            data: banners
        });
    });

    /**
     * POST /api/v1/banners/:id/restore
     * Admin only: Restore deleted banner
     * ✅ User ID from JWT for audit trail
     * ✅ Returns restored banner data
     */
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