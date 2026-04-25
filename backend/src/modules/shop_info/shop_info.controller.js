const ShopInfoService = require('./shop_info.service');
const asyncHandler = require('../../utils/asyncHandler.util');
const logger = require('../../utils/logger.util');

class ShopInfoController {
    /**
     * Get shop information (PUBLIC)
     * ✅ No authentication required
     * ✅ Returns full shop info DTO
     */
    static getShopInfo = asyncHandler(async (req, res) => {
        const shopInfo = await ShopInfoService.getShopInfo();

        res.status(200).json({
            success: true,
            data: shopInfo
        });
    });

    /**
     * Get contact information only (PUBLIC)
     * ✅ Lighter DTO for contact forms
     * ✅ No authentication required
     */
    static getContactInfo = asyncHandler(async (req, res) => {
        const contactInfo = await ShopInfoService.getContactInfo();

        res.status(200).json({
            success: true,
            data: contactInfo
        });
    });

    /**
     * Get working hours (PUBLIC)
     * ✅ Used for storefront widget
     * ✅ No authentication required
     */
    static getWorkingHours = asyncHandler(async (req, res) => {
        const hours = await ShopInfoService.getWorkingHours();

        res.status(200).json({
            success: true,
            data: hours
        });
    });

    /**
     * Get social media links (PUBLIC)
     * ✅ Used for footer embeds
     * ✅ No authentication required
     */
    static getSocialLinks = asyncHandler(async (req, res) => {
        const socialLinks = await ShopInfoService.getSocialLinks();

        res.status(200).json({
            success: true,
            data: socialLinks
        });
    });

    /**
     * Check if shop is currently open (PUBLIC)
     * ✅ Real-time status check
     * ✅ Returns { is_open: boolean }
     */
    static isShopOpen = asyncHandler(async (req, res) => {
        const isOpen = await ShopInfoService.isShopOpen();

        res.status(200).json({
            success: true,
            data: {
                is_open: isOpen
            }
        });
    });

    /**
     * Get next opening time (PUBLIC)
     * ✅ Shows "We open at..." message
     * ✅ Returns { date, time, day } or null
     */
    static getNextOpeningTime = asyncHandler(async (req, res) => {
        const nextOpening = await ShopInfoService.getNextOpeningTime();

        res.status(200).json({
            success: true,
            data: nextOpening
        });
    });

    /**
     * Create shop information (ADMIN ONLY)
     * ✅ Called once during setup
     * ✅ Prevents duplicate creation
     * ✅ Requires authentication
     */
    static createShopInfo = asyncHandler(async (req, res) => {
        const shopInfo = await ShopInfoService.createShopInfo(req.body);

        logger.info({
            event: 'shop_info_created',
            shop_id: shopInfo.id,
            shop_name: shopInfo.shop_name,
            user_id: req.user.id
        });

        res.status(201).json({
            success: true,
            data: shopInfo
        });
    });

    /**
     * Update shop information (ADMIN ONLY)
     * ✅ Partial updates allowed
     * ✅ All fields optional
     * ✅ Requires authentication
     */
    static updateShopInfo = asyncHandler(async (req, res) => {
        const shopInfo = await ShopInfoService.updateShopInfo(req.body);

        logger.info({
            event: 'shop_info_updated',
            shop_id: shopInfo.id,
            user_id: req.user.id,
            updated_fields: Object.keys(req.body)
        });

        res.status(200).json({
            success: true,
            data: shopInfo
        });
    });

    /**
     * Toggle shop status (ADMIN ONLY)
     * ✅ Activate/deactivate shop temporarily
     * ✅ Useful for maintenance mode
     */
    static toggleShopStatus = asyncHandler(async (req, res) => {
        const { is_active } = req.body;

        if (typeof is_active !== 'boolean') {
            throw new AppError(
                'is_active must be boolean',
                400,
                'VALIDATION_ERROR'
            );
        }

        const shopInfo = await ShopInfoService.toggleShopStatus(is_active);

        logger.info({
            event: 'shop_status_toggled',
            shop_id: shopInfo.id,
            new_status: is_active,
            user_id: req.user.id
        });

        res.status(200).json({
            success: true,
            data: shopInfo
        });
    });
}

module.exports = ShopInfoController;