const mongoose = require('mongoose');
const Discount = require('./discount.model');
const DiscountUsageLog = require('./discount.usage-log.model');
const DiscountMapper = require('./discount.mapper');
const AppError = require('../../utils/appError.util');

/**
 * ============================================
 * DISCOUNT SERVICE
 * ============================================
 */

class DiscountService {
    static async validateAndApply(code, cartSubtotal, userId, cartItems = []) {
        const discount = await Discount.findByCode(code);

        if (!discount) {
            throw new AppError('Invalid discount code', 404, 'DISCOUNT_NOT_FOUND');
        }

        if (discount.status !== 'active') {
            throw new AppError(
                'Discount is not active',
                400,
                'DISCOUNT_INACTIVE'
            );
        }

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

        if (cartSubtotal < discount.min_order_value) {
            throw new AppError(
                `Minimum order value ${discount.min_order_value.toLocaleString('vi-VN')} required`,
                400,
                'MIN_ORDER_VALUE_NOT_MET'
            );
        }

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

        const discountAmount = this.calculateDiscount(
            applicableItems,
            discount,
            cartSubtotal
        );

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

    static async validateForCart(code, cartSubtotal, userId, cartItems = []) {
        const discount = await Discount.findByCode(code);

        if (!discount) {
            throw new AppError('Invalid discount code', 404, 'DISCOUNT_NOT_FOUND');
        }

        if (discount.status !== 'active') {
            throw new AppError(
                'Discount is not active',
                400,
                'DISCOUNT_INACTIVE'
            );
        }

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

        if (discount.usage_count >= discount.usage_limit) {
            throw new AppError(
                'Discount usage limit exceeded',
                400,
                'DISCOUNT_LIMIT_EXCEEDED'
            );
        }

        if (userId) {
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
        }

        if (cartSubtotal < discount.min_order_value) {
            throw new AppError(
                `Minimum order value ${discount.min_order_value.toLocaleString('vi-VN')} required`,
                400,
                'MIN_ORDER_VALUE_NOT_MET'
            );
        }

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

        const discountAmount = this.calculateDiscount(
            applicableItems,
            discount,
            cartSubtotal
        );

        return {
            discount_id: discount._id,
            code: discount.code,
            type: discount.type,
            original_value: discount.value,
            discount_amount: discountAmount,
            applicable_item_ids: applicableItems.map((item) => item._id),
            final_total: cartSubtotal - discountAmount,
            min_order_value: discount.min_order_value,
            max_discount_amount: discount.max_discount_amount || null,
            application_strategy: discount.application_strategy,
            applicable_targets: discount.applicable_targets,
            expires_at: discount.expiry_date,
        };
    }

    static filterApplicableItems(cartItems, applicableTargets = {}) {
        const { type = 'all', product_ids = [], category_ids = [], variant_ids = [] } =
            applicableTargets || {};
        const productIds = product_ids.map((id) => id.toString());
        const categoryIds = category_ids.map((id) => id.toString());
        const variantIds = variant_ids.map((id) => id.toString());

        if (type === 'all') {
            return cartItems;
        }

        return cartItems.filter((item) => {
            if (type === 'specific_variants' && variantIds.length > 0) {
                return variantIds.includes(item.variant_id.toString());
            }

            if (type === 'specific_products' && productIds.length > 0) {
                return productIds.includes(item.product_id.toString());
            }

            if (type === 'specific_categories' && categoryIds.length > 0) {
                return categoryIds.includes(item.category_id?.toString());
            }

            return false;
        });
    }

    static calculateDiscount(applicableItems, discount, cartSubtotal) {
        // ===== CALCULATE APPLICABLE SUBTOTAL =====
        const applicableSubtotal = applicableItems.reduce(
            (sum, item) => sum + item.line_total,
            0
        );

        let discountAmount = 0;

        if (discount.type === 'percent') {
            discountAmount = (applicableSubtotal * discount.value) / 100;

            discountAmount = Math.min(discountAmount, discount.max_discount_amount);

            discountAmount = Math.min(discountAmount, applicableSubtotal);
        }
        else if (discount.type === 'fixed') {
            discountAmount = Math.min(discount.value, applicableSubtotal);
        }

        // ===== APPLY APPLICATION STRATEGY =====
        switch (discount.application_strategy) {
            case 'apply_once':
                discountAmount = Math.min(discountAmount, applicableItems[0].line_total);
                break;

            case 'apply_cheapest':
                const cheapestItem = applicableItems.reduce((min, item) =>
                    item.line_total < min.line_total ? item : min
                );
                discountAmount = Math.min(discountAmount, cheapestItem.line_total);
                break;

            case 'apply_most_expensive':
                const mostExpensive = applicableItems.reduce((max, item) =>
                    item.line_total > max.line_total ? item : max
                );
                discountAmount = Math.min(discountAmount, mostExpensive.line_total);
                break;

            case 'apply_all':
            default:
                break;
        }

        return Math.max(0, Math.round(discountAmount)); // Ensure positive, round to VND
    }

    static async recordUsage(discountId, userId, orderId) {
        try {
            await DiscountUsageLog.create({
                discount_id: discountId,
                user_id: userId,
                order_id: orderId,
                used_at: new Date(),
            });
        } catch (error) {
            console.error('Failed to record discount usage:', error);
        }
    }

    static async createDiscount(data, createdBy) {
        const normalizedData = {
            ...data,
            code: data.code.toUpperCase().trim(),
            created_by: createdBy,
            created_at: new Date(),
        };

        const discount = await Discount.create(normalizedData);

        return DiscountMapper.toResponseDTO(discount);
    }

    static async getDiscountById(discountId) {
        const discount = await Discount.findById(discountId);

        if (!discount) {
            throw new AppError('Discount not found', 404, 'DISCOUNT_NOT_FOUND');
        }

        return DiscountMapper.toDetailDTO(discount);
    }

    static async listDiscounts(page = 1, limit = 20, filters = {}) {
        const query = { is_deleted: false };

        if (filters.status) {
            query.status = filters.status;
        }

        if (filters.type) {
            query.type = filters.type;
        }

        if (filters.search) {
            query.code = { $regex: filters.search.toUpperCase(), $options: 'i' };
        }

        const sortMap = {
            created_at: { created_at: -1 },
            '-created_at': { created_at: -1 },
            expiry_date: { expiry_date: 1 },
            '-expiry_date': { expiry_date: -1 },
            usage_count: { usage_count: 1 },
            '-usage_count': { usage_count: -1 },
        };

        const sort = sortMap[filters.sortBy || '-created_at'] || { created_at: -1 };

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

    static async updateDiscount(discountId, data, updatedBy) {
        const updateData = {
            ...data,
            updated_by: updatedBy,
            updated_at: new Date(),
        };

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

    static async bulkCreateDiscounts(discounts, createdBy) {
        const results = { created: [], failed: [] };

        for (const discountData of discounts) {
            try {
                const normalizedData = {
                    ...discountData,
                    code: discountData.code.toUpperCase().trim(),
                    created_by: createdBy,
                    created_at: new Date(),
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

    static async getApplicableDiscounts(filters = {}, now = new Date()) {
        const discounts = await Discount.findApplicableDiscounts(filters, now);

        return discounts.map((d) => DiscountMapper.toResponseDTO(d));
    }

    static async getDiscountsForUser(userId, filters = {}, now = new Date()) {
        const discounts = await Discount.findDiscountsForUser(userId, filters, now);

        return discounts.map((d) => DiscountMapper.toResponseDTO(d));
    }

    static async countNearExpiryDiscounts(daysFromNow = 7, now = new Date()) {
        return await Discount.countNearExpiry(daysFromNow, now);
    }

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

    static async duplicateDiscount(discountId, overrides = {}, createdBy) {
        const discount = await Discount.findById(discountId);

        if (!discount) {
            throw new AppError('Discount not found', 404, 'DISCOUNT_NOT_FOUND');
        }

        const doc = discount.toObject();

        delete doc._id;
        delete doc.__v;
        delete doc.created_by;
        delete doc.created_at;
        delete doc.updated_by;
        delete doc.updated_at;
        delete doc.is_deleted;
        delete doc.deleted_at;

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
