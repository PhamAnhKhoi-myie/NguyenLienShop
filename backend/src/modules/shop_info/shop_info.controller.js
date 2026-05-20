const ShopInfoService = require('./shop_info.service');
const asyncHandler = require('../../utils/asyncHandler.util');
const logger = require('../../utils/logger.util');
const AppError = require('../../utils/appError.util');
const { assertAuthenticated } = require('../../utils/auth.util');
const { buildAuditMetadata } = require('../../utils/audit.util');

class ShopInfoController {
    static getShopInfo = asyncHandler(async (req, res) => {
        const shopInfo = await ShopInfoService.getShopInfo();

        res.status(200).json({
            success: true,
            data: shopInfo
        });
    });

    static getContactInfo = asyncHandler(async (req, res) => {
        const contactInfo = await ShopInfoService.getContactInfo();

        res.status(200).json({
            success: true,
            data: contactInfo
        });
    });

    static getWorkingHours = asyncHandler(async (req, res) => {
        const hours = await ShopInfoService.getWorkingHours();

        res.status(200).json({
            success: true,
            data: hours
        });
    });

    static getSocialLinks = asyncHandler(async (req, res) => {
        const socialLinks = await ShopInfoService.getSocialLinks();

        res.status(200).json({
            success: true,
            data: socialLinks
        });
    });

    static isShopOpen = asyncHandler(async (req, res) => {
        const isOpen = await ShopInfoService.isShopOpen();

        res.status(200).json({
            success: true,
            data: {
                is_open: isOpen
            }
        });
    });

    static getNextOpeningTime = asyncHandler(async (req, res) => {
        const nextOpening = await ShopInfoService.getNextOpeningTime();

        res.status(200).json({
            success: true,
            data: nextOpening
        });
    });

    static createShopInfo = asyncHandler(async (req, res) => {
        const user = assertAuthenticated(req.user);

        const shopInfo = await ShopInfoService.createShopInfo(
            req.body,
            user.userId,
            buildAuditMetadata(req)
        );

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

    static updateShopInfo = asyncHandler(async (req, res) => {
        const user = assertAuthenticated(req.user);

        const shopInfo = await ShopInfoService.updateShopInfo(
            req.body,
            user.userId,
            buildAuditMetadata(req)
        );

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

    static toggleShopStatus = asyncHandler(async (req, res) => {
        const user = assertAuthenticated(req.user);
        const { is_active } = req.body;

        if (typeof is_active !== 'boolean') {
            throw new AppError(
                'is_active must be boolean',
                400,
                'VALIDATION_ERROR'
            );
        }

        const shopInfo = await ShopInfoService.toggleShopStatus(
            is_active,
            user.userId,
            buildAuditMetadata(req)
        );

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
