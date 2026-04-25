const mongoose = require('mongoose');
const Discount = require('./discount.model');
const DiscountUsageLog = require('./discount.usage-log.model');
const DiscountMapper = require('./discount.mapper');
const AppError = require('../../utils/appError.util');

/**
 * ============================================
 * DISCOUNT SERVICE
 * ============================================
 *
 * ✅ Static class pattern (consistent with Product/Cart/Order services)
 * ✅ Business logic layer: validation, stock checks, pricing calculations
 * ✅ Delegates to model for DB operations (atomic updates)
 * ✅ Returns DTOs via mapper (never raw MongoDB docs)
 * ✅ Uses asyncHandler in controller (no try/catch here)
 *
 * CRITICAL:
 * - Always use atomic operators ($lt condition) to prevent race conditions
 * - Never read → modify in app → save pattern
 * - Snapshot price at add time (discount_amount immutable)
 * - Calculate final totals at response time (no stored amounts)
 * - Time validation at runtime (not via status automation)
 */

class DiscountService {
    /**
     * ✅ VALIDATE & APPLY: Main entry point for discount validation
     *
     * Called on: POST /discounts/validate (customer checkout)
     *
     * Flow:
     * 1. Find discount by code
     * 2. Check status + time window
     * 3. Check usage limits (atomic)
     * 4. Check per-user limit
     * 5. Check min order value
     * 6. Filter applicable items
     * 7. Calculate discount amount
     * 8. Return discount info (don't apply yet)
     *
     * @param {String} code - Discount code
     * @param {Number} cartSubtotal - Total before discount (VND)
     * @param {ObjectId} userId - Current user
     * @param {Array} cartItems - Full cart items with product/variant/category info
     * @returns {Object} { discount_id, code, type, discount_amount, final_total, ... }
     * @throws {AppError} If validation fails
     */
    static async validateAndApply(code, cartSubtotal, userId, cartItems = []) {
        // ===== STEP 1: Fetch discount by code =====
        const discount = await Discount.findByCode(code);

        if (!discount) {
            throw new AppError('Invalid discount code', 404, 'DISCOUNT_NOT_FOUND');
        }

        // ===== STEP 2: Check status =====
        if (discount.status !== 'active') {
            throw new AppError(
                'Discount is not active',
                400,
                'DISCOUNT_INACTIVE'
            );
        }

        // ===== STEP 3: Check time window (started_at <= now < expiry_date) =====
        const now = new Date();
        if (discount.started_at > now) {
            throw new AppError(
                'This discount is not yet available',
                400,
                'DISCOUNT_NOT_STARTED'
            );
        }

        if (discount.expiry_date <= now) {
            throw new AppError(
                'This discount has expired',
                400,
                'DISCOUNT_EXPIRED'
            );
        }

        // ===== STEP 4: Check usage limit (ATOMIC with $lt condition) =====
        // ✅ FIX #1: Use updateOne + $lt condition to prevent race condition
        const updateResult = await Discount.updateOne(
            {
                _id: discount._id,
                usage_count: { $lt: discount.usage_limit }, // ← Condition is MANDATORY
            },
            { $inc: { usage_count: 1 } }
        );

        if (updateResult.modifiedCount === 0) {
            throw new AppError(
                'Discount usage limit exceeded',
                400,
                'DISCOUNT_LIMIT_EXCEEDED'
            );
        }

        // ===== STEP 5: Check per-user limit =====
        const userUsageCount = await DiscountUsageLog.countDocuments({
            discount_id: discount._id,
            user_id: userId,
        });

        if (userUsageCount >= discount.usage_per_user_limit) {
            throw new AppError(
                `You've reached max uses for this discount (${discount.usage_per_user_limit})`,
                400,
                'USER_DISCOUNT_LIMIT_EXCEEDED'
            );
        }

        // ===== STEP 6: Check minimum order value =====
        if (cartSubtotal < discount.min_order_value) {
            throw new AppError(
                `Minimum order value ${discount.min_order_value.toLocaleString('vi-VN')} required`,
                400,
                'MIN_ORDER_VALUE_NOT_MET'
            );
        }

        // ===== STEP 7: Determine which items are applicable =====
        // ✅ FIX #2: Filter items by applicable_targets (product/category/variant)
        const applicableItems = this.filterApplicableItems(
            cartItems,
            discount.applicable_targets
        );

        if (applicableItems.length === 0) {
            throw new AppError(
                'No items in cart match this discount',
                400,
                'NO_APPLICABLE_ITEMS'
            );
        }

        // ===== STEP 8: Calculate discount amount =====
        const discountAmount = this.calculateDiscount(
            applicableItems,
            discount,
            cartSubtotal
        );

        // ===== STEP 9: Return discount info (don't apply yet — let cart service handle atomicity) =====
        return {
            discount_id: discount._id,
            code: discount.code,
            type: discount.type,
            original_value: discount.value,
            discount_amount: discountAmount,
            applicable_item_ids: applicableItems.map((item) => item._id),
            final_total: cartSubtotal - discountAmount,
        };
    }

    /**
     * ✅ FILTER APPLICABLE ITEMS: Determine which cart items match discount targets
     *
     * Supports: all, product, category, variant scopes
     * Priority: variant > product > category (most specific first)
     *
     * @param {Array} cartItems - Cart items with product_id, variant_id, category_id
     * @param {Object} applicableTargets - { type, product_ids, category_ids, variant_ids }
     * @returns {Array} Items that match the discount scope
     */
    static filterApplicableItems(cartItems, applicableTargets = {}) {
        const { type = 'all', product_ids = [], category_ids = [], variant_ids = [] } =
            applicableTargets || {};

        // ===== CASE 1: Apply to all items =====
        if (type === 'all') {
            return cartItems;
        }

        // ===== CASE 2: Filter by specific criteria =====
        return cartItems.filter((item) => {
            // ✅ Priority: variant > product > category (most specific first)

            // Check variant (most specific)
            if (type === 'specific_variants' && variant_ids.length > 0) {
                return variant_ids.includes(item.variant_id.toString());
            }

            // Check product
            if (type === 'specific_products' && product_ids.length > 0) {
                return product_ids.includes(item.product_id.toString());
            }

            // Check category
            if (type === 'specific_categories' && category_ids.length > 0) {
                return category_ids.includes(item.category_id?.toString());
            }

            return false;
        });
    }

    /**
     * ✅ CALCULATE DISCOUNT AMOUNT: Apply discount logic based on type + strategy
     *
     * Logic:
     * - Percent: (applicable_subtotal × value ÷ 100), capped by max_discount_amount
     * - Fixed: min(value, applicable_subtotal)
     * - Strategy: apply_all (default), apply_once, apply_cheapest, apply_most_expensive
     *
     * @param {Array} applicableItems - Items that match discount scope
     * @param {Object} discount - Discount document
     * @param {Number} cartSubtotal - Full cart subtotal (for reference only)
     * @returns {Number} Discount amount (in VND)
     */
    static calculateDiscount(applicableItems, discount, cartSubtotal) {
        // ===== CALCULATE APPLICABLE SUBTOTAL =====
        // Only discount applicable items, NOT full cart
        const applicableSubtotal = applicableItems.reduce(
            (sum, item) => sum + item.line_total,
            0
        );

        let discountAmount = 0;

        // ===== CASE 1: Percent discount =====
        if (discount.type === 'percent') {
            // Calculate on applicable items subtotal
            discountAmount = (applicableSubtotal * discount.value) / 100;

            // ⚠️ MANDATORY: Cap by max_discount_amount (prevent runaway discounts)
            discountAmount = Math.min(discountAmount, discount.max_discount_amount);

            // Also cap by applicable subtotal (don't discount more than items cost)
            discountAmount = Math.min(discountAmount, applicableSubtotal);
        }
        // ===== CASE 2: Fixed discount =====
        else if (discount.type === 'fixed') {
            // Fixed: Cap by applicable subtotal
            discountAmount = Math.min(discount.value, applicableSubtotal);
        }

        // ===== APPLY APPLICATION STRATEGY =====
        // ✅ FIX #3: How discount distributes across items
        switch (discount.application_strategy) {
            case 'apply_once':
                // Only discount first applicable item
                discountAmount = Math.min(discountAmount, applicableItems[0].line_total);
                break;

            case 'apply_cheapest':
                // Discount only the cheapest item
                const cheapestItem = applicableItems.reduce((min, item) =>
                    item.line_total < min.line_total ? item : min
                );
                discountAmount = Math.min(discountAmount, cheapestItem.line_total);
                break;

            case 'apply_most_expensive':
                // Discount only the most expensive item
                const mostExpensive = applicableItems.reduce((max, item) =>
                    item.line_total > max.line_total ? item : max
                );
                discountAmount = Math.min(discountAmount, mostExpensive.line_total);
                break;

            case 'apply_all':
            default:
                // Discount all applicable items (default, no change needed)
                break;
        }

        return Math.max(0, Math.round(discountAmount)); // Ensure positive, round to VND
    }

    /**
     * ✅ RECORD USAGE: Log discount usage after order confirmed
     *
     * Called after: Order created + payment confirmed
     * Creates entry in DiscountUsageLog for audit + per-user limit tracking
     *
     * @param {ObjectId} discountId - Discount ID
     * @param {ObjectId} userId - User ID
     * @param {ObjectId} orderId - Order ID (reference)
     * @throws {AppError} If logging fails
     */
    static async recordUsage(discountId, userId, orderId) {
        try {
            await DiscountUsageLog.create({
                discount_id: discountId,
                user_id: userId,
                order_id: orderId,
                used_at: new Date(),
            });
        } catch (error) {
            // Log error but don't throw (usage recording is non-critical)
            console.error('Failed to record discount usage:', error);
        }
    }

    /**
     * ✅ CREATE: Admin creates new discount
     *
     * @param {Object} data - Validated discount data from validator
     * @param {ObjectId} createdBy - Admin user ID
     * @returns {Object} Discount DTO
     */
    static async createDiscount(data, createdBy) {
        // ✅ Normalize code
        const normalizedData = {
            ...data,
            code: data.code.toUpperCase().trim(),
            created_by: createdBy,
            created_at: new Date(),
        };

        const discount = await Discount.create(normalizedData);

        return DiscountMapper.toResponseDTO(discount);
    }

    /**
     * ✅ GET BY ID: Fetch discount by ID
     *
     * @param {String} discountId - Discount ID
     * @returns {Object} Discount DTO
     * @throws {AppError} If not found
     */
    static async getDiscountById(discountId) {
        const discount = await Discount.findById(discountId);

        if (!discount) {
            throw new AppError('Discount not found', 404, 'DISCOUNT_NOT_FOUND');
        }

        return DiscountMapper.toDetailDTO(discount);
    }

    /**
     * ✅ LIST: Get all discounts with pagination + filtering
     *
     * Query params:
     * - page (default 1)
     * - limit (default 20, max 100)
     * - status (optional: active, inactive, paused, expired)
     * - type (optional: percent, fixed)
     * - search (optional: search by code)
     * - sortBy (optional: created_at, expiry_date, usage_count)
     *
     * @param {Number} page - Page number (1-indexed)
     * @param {Number} limit - Items per page
     * @param {Object} filters - { status, type, search, sortBy }
     * @returns {Object} { data: [DTOs], pagination: { page, limit, total, totalPages } }
     */
    static async listDiscounts(page = 1, limit = 20, filters = {}) {
        // ===== BUILD QUERY =====
        const query = { is_deleted: false };

        if (filters.status) {
            query.status = filters.status;
        }

        if (filters.type) {
            query.type = filters.type;
        }

        if (filters.search) {
            // Search by code (case-insensitive regex)
            query.code = { $regex: filters.search.toUpperCase(), $options: 'i' };
        }

        // ===== BUILD SORT =====
        const sortMap = {
            created_at: { created_at: -1 },
            '-created_at': { created_at: -1 },
            expiry_date: { expiry_date: 1 },
            '-expiry_date': { expiry_date: -1 },
            usage_count: { usage_count: 1 },
            '-usage_count': { usage_count: -1 },
        };

        const sort = sortMap[filters.sortBy || '-created_at'] || { created_at: -1 };

        // ===== EXECUTE QUERY =====
        const skip = (page - 1) * limit;

        const [discounts, total] = await Promise.all([
            Discount.find(query)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean(),
            Discount.countDocuments(query),
        ]);

        return {
            data: discounts.map((d) => DiscountMapper.toAdminListDTO(d)),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * ✅ UPDATE: Admin updates discount
     *
     * @param {String} discountId - Discount ID
     * @param {Object} data - Validated update data
     * @param {ObjectId} updatedBy - Admin user ID
     * @returns {Object} Updated discount DTO
     * @throws {AppError} If not found
     */
    static async updateDiscount(discountId, data, updatedBy) {
        const updateData = {
            ...data,
            updated_by: updatedBy,
            updated_at: new Date(),
        };

        // Normalize code if provided
        if (updateData.code) {
            updateData.code = updateData.code.toUpperCase().trim();
        }

        const discount = await Discount.findByIdAndUpdate(
            discountId,
            updateData,
            { new: true, runValidators: true }
        );

        if (!discount) {
            throw new AppError('Discount not found', 404, 'DISCOUNT_NOT_FOUND');
        }

        return DiscountMapper.toDetailDTO(discount);
    }

    /**
     * ✅ DELETE (Soft): Admin soft-deletes discount
     *
     * @param {String} discountId - Discount ID
     * @returns {Object} { success: true, message }
     * @throws {AppError} If not found
     */
    static async deleteDiscount(discountId) {
        const discount = await Discount.findByIdAndUpdate(
            discountId,
            {
                is_deleted: true,
                deleted_at: new Date(),
            },
            { new: true }
        );

        if (!discount) {
            throw new AppError('Discount not found', 404, 'DISCOUNT_NOT_FOUND');
        }

        return { success: true, message: 'Discount deleted' };
    }

    /**
     * ✅ BULK CREATE: Admin imports multiple discounts (CSV)
     *
     * Used for: Campaign creation, affiliate discount batches
     * Returns: { created: [...], failed: [...] }
     *
     * @param {Array} discounts - Array of discount objects
     * @param {ObjectId} createdBy - Admin user ID
     * @returns {Object} { created: [...DTOs], failed: [{code, error}, ...] }
     */
    static async bulkCreateDiscounts(discounts, createdBy) {
        const results = { created: [], failed: [] };

        for (const discountData of discounts) {
            try {
                const normalizedData = {
                    ...discountData,
                    code: discountData.code.toUpperCase().trim(),
                    created_by: createdBy,
                    created_at: new Date(),
                    // Set defaults if not provided
                    started_at: discountData.started_at || new Date(),
                    expiry_date:
                        discountData.expiry_date ||
                        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
                    status: discountData.status || 'active',
                };

                const discount = await Discount.create(normalizedData);
                results.created.push(DiscountMapper.toResponseDTO(discount));
            } catch (error) {
                results.failed.push({
                    code: discountData.code,
                    error: error.message,
                });
            }
        }

        return results;
    }

    /**
     * ✅ GET APPLICABLE DISCOUNTS: Find active discounts for product/category/variant
     *
     * Used in: Product detail, checkout suggestion
     * Returns active discounts that apply to given items
     *
     * @param {Object} filters - { product_ids, variant_ids, category_ids }
     * @param {Date} now - Current time (for testing)
     * @returns {Array} Array of discount DTOs
     */
    static async getApplicableDiscounts(filters = {}, now = new Date()) {
        const discounts = await Discount.findApplicableDiscounts(filters, now);

        return discounts.map((d) => DiscountMapper.toResponseDTO(d));
    }

    /**
     * ✅ GET DISCOUNTS FOR USER: Find discounts user can use
     *
     * Checks user_eligibility constraints
     * Used in: Checkout discount suggestions
     *
     * @param {ObjectId} userId - User ID
     * @param {Object} filters - { product_ids, variant_ids, category_ids }
     * @param {Date} now - Current time (for testing)
     * @returns {Array} Array of discount DTOs
     */
    static async getDiscountsForUser(userId, filters = {}, now = new Date()) {
        const discounts = await Discount.findDiscountsForUser(userId, filters, now);

        return discounts.map((d) => DiscountMapper.toResponseDTO(d));
    }

    /**
     * ✅ COUNT NEAR EXPIRY: Get discounts expiring soon (for admin dashboard)
     *
     * @param {Number} daysFromNow - Days threshold (default 7)
     * @param {Date} now - Current time (for testing)
     * @returns {Number} Count of expiring discounts
     */
    static async countNearExpiryDiscounts(daysFromNow = 7, now = new Date()) {
        return await Discount.countNearExpiry(daysFromNow, now);
    }

    /**
     * ✅ GET USAGE STATS: Get discount usage statistics
     *
     * @param {String} discountId - Discount ID
     * @returns {Object} { total_used, unique_users, last_used_at, usage_percentage }
     */
    static async getUsageStats(discountId) {
        const discount = await Discount.findById(discountId);

        if (!discount) {
            throw new AppError('Discount not found', 404, 'DISCOUNT_NOT_FOUND');
        }

        const usageLogs = await DiscountUsageLog.find({
            discount_id: discountId,
        });

        const uniqueUsers = new Set(usageLogs.map((log) => log.user_id.toString()))
            .size;

        const lastUsed = usageLogs.length > 0 ? usageLogs[usageLogs.length - 1].used_at : null;

        return {
            total_used: discount.usage_count,
            unique_users: uniqueUsers,
            last_used_at: lastUsed,
            usage_percentage: Math.round(
                (discount.usage_count / discount.usage_limit) * 100
            ),
        };
    }

    /**
     * ✅ REVOKE: Force-revoke discount (mark as inactive)
     *
     * Used when: Business decision to disable discount early
     *
     * @param {String} discountId - Discount ID
     * @param {ObjectId} revokedBy - Admin user ID (for audit)
     * @returns {Object} Updated discount DTO
     */
    static async revokeDiscount(discountId, revokedBy) {
        const discount = await Discount.findByIdAndUpdate(
            discountId,
            {
                status: 'inactive',
                updated_by: revokedBy,
                updated_at: new Date(),
            },
            { new: true }
        );

        if (!discount) {
            throw new AppError('Discount not found', 404, 'DISCOUNT_NOT_FOUND');
        }

        return DiscountMapper.toDetailDTO(discount);
    }

    /**
     * ✅ DUPLICATE: Clone existing discount (for quick campaign creation)
     *
     * Used when: Admin wants to create similar discount with different dates
     *
     * @param {String} discountId - Discount to clone
     * @param {Object} overrides - Fields to override (code, started_at, expiry_date)
     * @param {ObjectId} createdBy - Admin user ID
     * @returns {Object} New discount DTO
     */
    static async duplicateDiscount(discountId, overrides = {}, createdBy) {
        const discount = await Discount.findById(discountId);

        if (!discount) {
            throw new AppError('Discount not found', 404, 'DISCOUNT_NOT_FOUND');
        }

        const doc = discount.toObject();

        // Remove MongoDB metadata
        delete doc._id;
        delete doc.__v;
        delete doc.created_by;
        delete doc.created_at;
        delete doc.updated_by;
        delete doc.updated_at;
        delete doc.is_deleted;
        delete doc.deleted_at;

        // Apply overrides (must include new code)
        if (!overrides.code) {
            throw new AppError('New discount code is required', 400, 'MISSING_CODE');
        }

        const newDiscount = {
            ...doc,
            ...overrides,
            code: overrides.code.toUpperCase().trim(),
            created_by: createdBy,
            created_at: new Date(),
            usage_count: 0, // Reset usage counter
        };

        const created = await Discount.create(newDiscount);

        return DiscountMapper.toResponseDTO(created);
    }
}

module.exports = DiscountService;
