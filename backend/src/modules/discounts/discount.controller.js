const asyncHandler = require('../../utils/asyncHandler.util');
const { AppError } = require('../../utils/appError.util');
const DiscountService = require('./discount.service');
const DiscountMapper = require('./discount.mapper');

class DiscountController {
    static validateDiscount = asyncHandler(async (req, res) => {
        const { code, cartSubtotal, cartItems } = req.body;

        const validationResult = await DiscountService.validateAndApply(
            code,
            cartSubtotal,
            cartItems,
            req.user?.userId
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

        const responseData = DiscountMapper.toDetailDTO(discount);

        res.status(201).json({
            success: true,
            data: responseData
        });
    });

    static listDiscounts = asyncHandler(async (req, res) => {
        const { page, limit, status, type, search, sortBy, minDiscount, maxDiscount } = req.query;

        const result = await DiscountService.listDiscounts({
            page: parseInt(page, 10),
            limit: Math.min(parseInt(limit, 10), 100),
            filter: { status, type, search, minDiscount, maxDiscount },
            sortBy
        });

        const responseData = DiscountMapper.toAdminListDTOList(result.discounts);

        res.status(200).json({
            success: true,
            data: responseData,
            pagination: result.pagination
        });
    });

    static getDiscount = asyncHandler(async (req, res) => {
        const { discountId } = req.params;

        const discount = await DiscountService.getDiscountById(discountId);

        const responseData = DiscountMapper.toDetailDTO(discount);

        res.status(200).json({
            success: true,
            data: responseData
        });
    });

    static updateDiscount = asyncHandler(async (req, res) => {
        const { discountId } = req.params;

        const discount = await DiscountService.updateDiscount(discountId, req.body);

        const responseData = DiscountMapper.toDetailDTO(discount);

        res.status(200).json({
            success: true,
            data: responseData
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

        await DiscountService.revokeDiscount(discountId);

        res.status(200).json({
            success: true,
            message: 'Discount revoked successfully'
        });
    });

    static bulkImport = asyncHandler(async (req, res) => {
        const { discounts } = req.body;

        if (!Array.isArray(discounts) || discounts.length === 0) {
            throw new AppError('Discounts array is required', 400, 'INVALID_REQUEST');
        }

        const result = await DiscountService.bulkCreateDiscounts(discounts);

        const responseData = {
            created: DiscountMapper.toResponseDTOList(result.created),
            errors: result.errors.map(err => ({
                code: err.code,
                message: err.message,
                row: err.row
            }))
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

        const clonedDiscount = await DiscountService.duplicateDiscount(discountId, newCode);

        const responseData = DiscountMapper.toDetailDTO(clonedDiscount);

        res.status(201).json({
            success: true,
            data: responseData
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
        const { daysUntilExpiry } = req.query;

        const discounts = await DiscountService.countNearExpiryDiscounts(daysUntilExpiry);

        const responseData = DiscountMapper.toAdminListDTOList(discounts);

        res.status(200).json({
            success: true,
            data: responseData
        });
    });

    static getDiscountsForUser = asyncHandler(async (req, res) => {
        const { userId } = req.params;
        const { page, limit } = req.query;

        const result = await DiscountService.getDiscountsForUser(userId, {
            page: parseInt(page, 10),
            limit: Math.min(parseInt(limit, 10), 100)
        });

        const responseData = DiscountMapper.toAdminListDTOList(result.discounts);

        res.status(200).json({
            success: true,
            data: responseData,
            pagination: result.pagination
        });
    });
}

module.exports = DiscountController;
