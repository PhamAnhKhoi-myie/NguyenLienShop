const asyncHandler = require('../../utils/asyncHandler.util');
const AppError = require('../../utils/appError.util');
const DiscountService = require('./discount.service');
const DiscountMapper = require('./discount.mapper');

class DiscountController {
    static validateDiscount = asyncHandler(async (req, res) => {
        const { code, cartSubtotal, cartItems } = req.body;

        const validationResult = await DiscountService.validateForCart(
            code,
            cartSubtotal,
            req.user?.userId,
            cartItems
        );

        const responseData = DiscountMapper.toValidationResponseDTO(validationResult);

        res.status(200).json({
            success: true,
            data: responseData
        });
    });

    static createDiscount = asyncHandler(async (req, res) => {
        const discount = await DiscountService.createDiscount(
            req.body,
            req.user.userId
        );

        res.status(201).json({
            success: true,
            data: discount
        });
    });

    static listDiscounts = asyncHandler(async (req, res) => {
        const { page, limit, status, type, search, sortBy } = req.query;

        const result = await DiscountService.listDiscounts(
            page,
            limit,
            {
                status,
                type,
                search,
                sortBy,
            }
        );

        res.status(200).json({
            success: true,
            data: result.data,
            pagination: result.pagination
        });
    });

    static getDiscount = asyncHandler(async (req, res) => {
        const { discountId } = req.params;

        const discount = await DiscountService.getDiscountById(discountId);

        res.status(200).json({
            success: true,
            data: discount
        });
    });

    static updateDiscount = asyncHandler(async (req, res) => {
        const { discountId } = req.params;

        const discount = await DiscountService.updateDiscount(
            discountId,
            req.body,
            req.user.userId
        );

        res.status(200).json({
            success: true,
            data: discount
        });
    });

    static deleteDiscount = asyncHandler(async (req, res) => {
        const { discountId } = req.params;

        await DiscountService.deleteDiscount(discountId);

        res.status(200).json({
            success: true,
            message: 'Discount deleted successfully'
        });
    });

    static revokeDiscount = asyncHandler(async (req, res) => {
        const { discountId } = req.params;

        const discount = await DiscountService.revokeDiscount(
            discountId,
            req.user.userId
        );

        res.status(200).json({
            success: true,
            data: discount,
            message: 'Discount revoked successfully'
        });
    });

    static bulkImport = asyncHandler(async (req, res) => {
        const { discounts } = req.body;

        if (!Array.isArray(discounts) || discounts.length === 0) {
            throw new AppError('Discounts array is required', 400, 'INVALID_REQUEST');
        }

        const result = await DiscountService.bulkCreateDiscounts(
            discounts,
            req.user.userId
        );

        const responseData = {
            created: result.created,
            failed: result.failed,
        };

        res.status(207).json({
            success: true,
            data: responseData
        });
    });

    static getApplicableDiscounts = asyncHandler(async (req, res) => {
        const { cartSubtotal, cartItems } = req.body;

        const discounts = await DiscountService.getApplicableDiscounts({
            cartSubtotal,
            cartItems,
            userId: req.user?.userId
        });

        const responseData = DiscountMapper.toResponseDTOList(discounts);

        res.status(200).json({
            success: true,
            data: responseData
        });
    });

    static duplicateDiscount = asyncHandler(async (req, res) => {
        const { discountId } = req.params;
        const { newCode } = req.body;

        const clonedDiscount = await DiscountService.duplicateDiscount(
            discountId,
            { code: newCode },
            req.user.userId
        );

        res.status(201).json({
            success: true,
            data: clonedDiscount
        });
    });

    static getStatistics = asyncHandler(async (req, res) => {
        const { discountId } = req.params;

        const stats = await DiscountService.getUsageStats(discountId);

        res.status(200).json({
            success: true,
            data: stats
        });
    });

    static getNearExpiryDiscounts = asyncHandler(async (req, res) => {
        const { daysUntilExpiry, page, limit } = req.query;

        const result = await DiscountService.getNearExpiryDiscounts(
            daysUntilExpiry,
            page,
            limit
        );

        res.status(200).json({
            success: true,
            data: result.data,
            pagination: result.pagination
        });
    });

    static getDiscountsForUser = asyncHandler(async (req, res) => {
        const { userId } = req.params;
        const { page, limit } = req.query;

        const result = await DiscountService.getDiscountsForUser(userId, {
            page,
            limit,
        });

        res.status(200).json({
            success: true,
            data: result.data,
            pagination: result.pagination
        });
    });
}

module.exports = DiscountController;
