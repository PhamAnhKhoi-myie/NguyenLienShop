const asyncHandler = require('../../utils/asyncHandler.util');
const { AppError } = require('../../utils/appError.util');
const { validateObjectId } = require('../../utils/validator.util');
const DiscountService = require('./discount.service');
const DiscountMapper = require('./discount.mapper');

/**
 * Discount Controller
 * Handles all request/response for discount operations
 * All handlers wrapped in asyncHandler() to catch promise rejections
 */
class DiscountController {
    /**
     * Validate discount code and calculate applicable discount for checkout
     * PUBLIC ROUTE - No authentication required
     * Request: { code, cartSubtotal, cartItems }
     * Response: { success, data: { discount_id, discount_code, discount_amount, final_total, applicableItems, warning } }
     */
    static validateDiscount = asyncHandler(async (req, res) => {
        const { code, cartSubtotal, cartItems } = req.body;

        // Service validates discount exists, is active, time window, usage limits
        const validationResult = await DiscountService.validateAndApply(
            code,
            cartSubtotal,
            cartItems,
            req.user?.userId // Optional: current user ID for per-user limit check
        );

        // Map to validation response DTO (includes applied amount + final total)
        const responseData = DiscountMapper.toValidationResponseDTO(validationResult);

        res.status(200).json({
            success: true,
            data: responseData
        });
    });

    /**
     * Create new discount
     * ADMIN ONLY
     * Request: Full discount data (code, type, value, applicable_targets, user_eligibility, etc.)
     * Response: { success, data: { id, code, name, type, ... } }
     */
    static createDiscount = asyncHandler(async (req, res) => {
        // Validation already applied via validate() middleware

        // Service creates discount with all validations
        const discount = await DiscountService.createDiscount(req.body);

        // Map to detail DTO for admin
        const responseData = DiscountMapper.toDetailDTO(discount);

        res.status(201).json({
            success: true,
            data: responseData
        });
    });

    /**
     * List all discounts with filters and pagination
     * ADMIN ONLY
     * Query: { page, limit, status, type, search, sortBy, minDiscount, maxDiscount }
     * Response: { success, data: [...], pagination: { page, limit, total, totalPages } }
     */
    static listDiscounts = asyncHandler(async (req, res) => {
        const { page = 1, limit = 20, status, type, search, sortBy, minDiscount, maxDiscount } = req.query;

        // Service performs query with filters and pagination
        const result = await DiscountService.listDiscounts({
            page: parseInt(page, 10),
            limit: Math.min(parseInt(limit, 10), 100),
            filter: { status, type, search, minDiscount, maxDiscount },
            sortBy
        });

        // Map to admin list DTO (lightweight with action flags)
        const responseData = DiscountMapper.toAdminListDTOList(result.discounts);

        res.status(200).json({
            success: true,
            data: responseData,
            pagination: result.pagination
        });
    });

    /**
     * Get single discount details
     * ADMIN ONLY
     * Param: { discountId }
     * Response: { success, data: { id, code, name, type, value, ... } }
     */
    static getDiscount = asyncHandler(async (req, res) => {
        const { discountId } = req.params;

        // Validate ObjectId format
        validateObjectId(discountId);

        // Service fetches discount (throws if not found)
        const discount = await DiscountService.getDiscountById(discountId);

        // Map to detail DTO for admin
        const responseData = DiscountMapper.toDetailDTO(discount);

        res.status(200).json({
            success: true,
            data: responseData
        });
    });

    /**
     * Update discount
     * ADMIN ONLY
     * Param: { discountId }
     * Request: Partial discount data (only updatable fields)
     * Response: { success, data: { id, code, name, ... } }
     */
    static updateDiscount = asyncHandler(async (req, res) => {
        const { discountId } = req.params;

        // Validate ObjectId format
        validateObjectId(discountId);

        // Service updates discount with all validations
        const discount = await DiscountService.updateDiscount(discountId, req.body);

        // Map to detail DTO for admin
        const responseData = DiscountMapper.toDetailDTO(discount);

        res.status(200).json({
            success: true,
            data: responseData
        });
    });

    /**
     * Soft delete discount
     * ADMIN ONLY
     * Param: { discountId }
     * Response: { success, message: 'Discount deleted successfully' }
     */
    static deleteDiscount = asyncHandler(async (req, res) => {
        const { discountId } = req.params;

        // Validate ObjectId format
        validateObjectId(discountId);

        // Service soft deletes discount (sets is_deleted=true, deleted_at=now)
        await DiscountService.deleteDiscount(discountId);

        res.status(200).json({
            success: true,
            message: 'Discount deleted successfully'
        });
    });

    /**
     * Revoke discount (mark as inactive)
     * ADMIN ONLY - used when discount should be disabled but not deleted
     * Param: { discountId }
     * Response: { success, message: 'Discount revoked successfully' }
     */
    static revokeDiscount = asyncHandler(async (req, res) => {
        const { discountId } = req.params;

        // Validate ObjectId format
        validateObjectId(discountId);

        // Service marks discount as inactive
        await DiscountService.revokeDiscount(discountId);

        res.status(200).json({
            success: true,
            message: 'Discount revoked successfully'
        });
    });

    /**
     * Bulk import discounts from CSV/array
     * ADMIN ONLY
     * Request: { discounts: [...] } - array of discount objects
     * Response: { success, data: { created: [...], errors: [...] } }
     */
    static bulkImport = asyncHandler(async (req, res) => {
        const { discounts } = req.body;

        // Validate array provided
        if (!Array.isArray(discounts) || discounts.length === 0) {
            throw new AppError('Discounts array is required', 400, 'INVALID_REQUEST');
        }

        // Service performs bulk creation with error handling
        const result = await DiscountService.bulkCreateDiscounts(discounts);

        // Map results to response DTOs
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

    /**
     * Get applicable discounts for user
     * CUSTOMER ROUTE - No authentication required (but optional user_id for per-user limits)
     * Request: { cartSubtotal, cartItems }
     * Response: { success, data: [...] } - array of applicable discounts
     */
    static getApplicableDiscounts = asyncHandler(async (req, res) => {
        const { cartSubtotal, cartItems } = req.body;

        // Service finds all applicable discounts for current cart
        const discounts = await DiscountService.getApplicableDiscounts({
            cartSubtotal,
            cartItems,
            userId: req.user?.userId // Optional: filter by per-user limits
        });

        // Map to customer DTO (minimal info, no limits shown)
        const responseData = DiscountMapper.toResponseDTOList(discounts);

        res.status(200).json({
            success: true,
            data: responseData
        });
    });

    /**
     * Duplicate discount (create copy with new code)
     * ADMIN ONLY - useful for campaign cloning
     * Param: { discountId }
     * Request: { newCode } - optional new code (auto-generates if not provided)
     * Response: { success, data: { id, code, name, ... } }
     */
    static duplicateDiscount = asyncHandler(async (req, res) => {
        const { discountId } = req.params;
        const { newCode } = req.body;

        // Validate ObjectId format
        validateObjectId(discountId);

        // Service clones discount with new code
        const clonedDiscount = await DiscountService.duplicateDiscount(discountId, newCode);

        // Map to detail DTO for admin
        const responseData = DiscountMapper.toDetailDTO(clonedDiscount);

        res.status(201).json({
            success: true,
            data: responseData
        });
    });

    /**
     * Get discount usage statistics
     * ADMIN ONLY
     * Param: { discountId }
     * Response: { success, data: { usage_count, unique_users, total_revenue_impact, ... } }
     */
    static getStatistics = asyncHandler(async (req, res) => {
        const { discountId } = req.params;

        // Validate ObjectId format
        validateObjectId(discountId);

        // Service calculates usage statistics
        const stats = await DiscountService.getUsageStats(discountId);

        res.status(200).json({
            success: true,
            data: stats
        });
    });

    /**
     * Get discounts near expiry (admin dashboard)
     * ADMIN ONLY - useful for alerts/notifications
     * Query: { daysUntilExpiry } - default 7 (discounts expiring within N days)
     * Response: { success, data: [...] }
     */
    static getNearExpiryDiscounts = asyncHandler(async (req, res) => {
        const { daysUntilExpiry = 7 } = req.query;

        // Service finds discounts expiring soon
        const discounts = await DiscountService.countNearExpiryDiscounts(parseInt(daysUntilExpiry, 10));

        // Map to admin list DTO
        const responseData = DiscountMapper.toAdminListDTOList(discounts);

        res.status(200).json({
            success: true,
            data: responseData
        });
    });

    /**
     * Get discounts applicable to specific user
     * ADMIN ONLY - useful for customer service / user support
     * Param: { userId }
     * Query: { page, limit }
     * Response: { success, data: [...], pagination: {...} }
     */
    static getDiscountsForUser = asyncHandler(async (req, res) => {
        const { userId } = req.params;
        const { page = 1, limit = 20 } = req.query;

        // Validate ObjectId format
        validateObjectId(userId);

        // Service finds applicable discounts for user
        const result = await DiscountService.getDiscountsForUser(userId, {
            page: parseInt(page, 10),
            limit: Math.min(parseInt(limit, 10), 100)
        });

        // Map to admin list DTO
        const responseData = DiscountMapper.toAdminListDTOList(result.discounts);

        res.status(200).json({
            success: true,
            data: responseData,
            pagination: result.pagination
        });
    });
}

module.exports = DiscountController;
