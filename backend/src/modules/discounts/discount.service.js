const mongoose = require('mongoose');
const Discount = require('./discount.model');
const DiscountUsageLog = require('./discount.usage-log.model');
const DiscountMapper = require('./discount.mapper');
const AppError = require('../../utils/appError.util');
const DiscountAuditLogService = require('../audit_logs/discount_audit_log/discount_log.service');
const { AUDIT_ACTIONS } = require('../../constants/audit');
const User = require('../users/user.model');
const Order = require('../orders/order.model');

/**
 * ============================================
 * DISCOUNT SERVICE
 * ============================================
 */

class DiscountService {
    static getTierRank(tier) {
        const ranks = {
            bronze: 1,
            silver: 2,
            gold: 3,
            platinum: 4,
        };

        return ranks[String(tier || '').toLowerCase()] || 0;
    }

    static getUserTier(user) {
        return user?.tier || user?.customer_tier || user?.profile?.tier || null;
    }

    static getCartItemTargetFilters(cartItems = []) {
        const unique = (values) => [
            ...new Set(
                values
                    .filter(Boolean)
                    .map((value) => value.toString())
            ),
        ];

        return {
            product_ids: unique(cartItems.map((item) => item.product_id)),
            variant_ids: unique(cartItems.map((item) => item.variant_id)),
            category_ids: unique(cartItems.map((item) => item.category_id)),
        };
    }

    static async getUserEligibilityContext(userId, session = null, excludeOrderId = null) {
        if (!userId) {
            return {
                user: null,
                completedOrderCount: 0,
            };
        }

        const orderFilter = {
            user_id: userId,
            status: { $nin: ['CANCELED', 'FAILED'] },
            is_deleted: false,
        };

        if (excludeOrderId) {
            orderFilter._id = { $ne: excludeOrderId };
        }

        const userQuery = User.findById(userId).lean();
        const orderQuery = Order.countDocuments(orderFilter);

        if (session) {
            userQuery.session(session);
            orderQuery.session(session);
        }

        const [user, completedOrderCount] = await Promise.all([
            userQuery,
            orderQuery,
        ]);

        return {
            user,
            completedOrderCount,
        };
    }

    static assertUserEligible(discount, userId, context = {}) {
        const eligibility = discount.user_eligibility || {};
        const type = eligibility.type || 'all';

        if (type === 'all') {
            return;
        }

        if (!userId) {
            throw new AppError(
                'Authentication is required for this discount',
                401,
                'DISCOUNT_AUTH_REQUIRED'
            );
        }

        if (type === 'specific_users') {
            const allowedUserIds = (eligibility.user_ids || []).map((id) =>
                id.toString()
            );

            if (!allowedUserIds.includes(userId.toString())) {
                throw new AppError(
                    'You are not eligible for this discount',
                    403,
                    'DISCOUNT_USER_NOT_ELIGIBLE'
                );
            }

            return;
        }

        if (type === 'first_time_only') {
            if ((context.completedOrderCount || 0) > 0) {
                throw new AppError(
                    'This discount is only available for first-time customers',
                    403,
                    'DISCOUNT_FIRST_TIME_ONLY'
                );
            }

            return;
        }

        if (type === 'vip_users') {
            const user = context.user;
            const userRoles = (user?.roles || []).map((role) =>
                String(role).toUpperCase()
            );
            const userTier = this.getUserTier(user);

            if (eligibility.min_user_tier) {
                const userTierRank = this.getTierRank(userTier);
                const requiredTierRank = this.getTierRank(eligibility.min_user_tier);

                if (userTierRank < requiredTierRank) {
                    throw new AppError(
                        'Your account tier is not eligible for this discount',
                        403,
                        'DISCOUNT_TIER_NOT_ELIGIBLE'
                    );
                }

                return;
            }

            if (!userRoles.includes('VIP')) {
                throw new AppError(
                    'This discount is only available for VIP users',
                    403,
                    'DISCOUNT_VIP_ONLY'
                );
            }
        }
    }

    // static async validateAndApply(code, cartSubtotal, userId, cartItems = []) {
    //     const discount = await Discount.findByCode(code);

    //     if (!discount) {
    //         throw new AppError('Invalid discount code', 404, 'DISCOUNT_NOT_FOUND');
    //     }

    //     if (discount.status !== 'active') {
    //         throw new AppError(
    //             'Discount is not active',
    //             400,
    //             'DISCOUNT_INACTIVE'
    //         );
    //     }

    //     const now = new Date();

    //     if (discount.started_at > now) {
    //         throw new AppError(
    //             'This discount is not yet available',
    //             400,
    //             'DISCOUNT_NOT_STARTED'
    //         );
    //     }

    //     if (discount.expiry_date <= now) {
    //         throw new AppError(
    //             'This discount has expired',
    //             400,
    //             'DISCOUNT_EXPIRED'
    //         );
    //     }

    //     if (discount.usage_count >= discount.usage_limit) {
    //         throw new AppError(
    //             'Discount usage limit exceeded',
    //             400,
    //             'DISCOUNT_LIMIT_EXCEEDED'
    //         );
    //     }

    //     const eligibilityType = discount.user_eligibility?.type || 'all';

    //     if (eligibilityType !== 'all') {
    //         const eligibilityContext = await this.getUserEligibilityContext(userId);
    //         this.assertUserEligible(discount, userId, eligibilityContext);
    //     }

    //     if (userId) {
    //         const userUsageCount = await DiscountUsageLog.countDocuments({
    //             discount_id: discount._id,
    //             user_id: userId,
    //         });

    //         if (userUsageCount >= discount.usage_per_user_limit) {
    //             throw new AppError(
    //                 `You've reached max uses for this discount (${discount.usage_per_user_limit})`,
    //                 400,
    //                 'USER_DISCOUNT_LIMIT_EXCEEDED'
    //             );
    //         }
    //     }

    //     if (cartSubtotal < discount.min_order_value) {
    //         throw new AppError(
    //             `Minimum order value ${discount.min_order_value.toLocaleString('vi-VN')} required`,
    //             400,
    //             'MIN_ORDER_VALUE_NOT_MET'
    //         );
    //     }

    //     const applicableItems = this.filterApplicableItems(
    //         cartItems,
    //         discount.applicable_targets
    //     );

    //     if (applicableItems.length === 0) {
    //         throw new AppError(
    //             'No items in cart match this discount',
    //             400,
    //             'NO_APPLICABLE_ITEMS'
    //         );
    //     }

    //     const discountAmount = this.calculateDiscount(
    //         applicableItems,
    //         discount,
    //         cartSubtotal
    //     );

    //     const updateResult = await Discount.updateOne(
    //         {
    //             _id: discount._id,
    //             status: 'active',
    //             is_deleted: false,
    //             started_at: { $lte: now },
    //             expiry_date: { $gt: now },
    //             usage_count: { $lt: discount.usage_limit },
    //         },
    //         { $inc: { usage_count: 1 } }
    //     );

    //     if (updateResult.modifiedCount === 0) {
    //         throw new AppError(
    //             'Discount usage limit exceeded',
    //             400,
    //             'DISCOUNT_LIMIT_EXCEEDED'
    //         );
    //     }

    //     return {
    //         discount_id: discount._id,
    //         code: discount.code,
    //         type: discount.type,
    //         original_value: discount.value,
    //         discount_amount: discountAmount,
    //         applicable_item_ids: applicableItems.map((item) => item._id),
    //         final_total: cartSubtotal - discountAmount,
    //     };
    // }

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

        const eligibilityType = discount.user_eligibility?.type || 'all';
        if (eligibilityType !== 'all') {
            const eligibilityContext = await this.getUserEligibilityContext(userId);
            this.assertUserEligible(discount, userId, eligibilityContext);
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

    static async redeemForOrder(discountSnapshot, redemptionData = {}, options = {}) {
        if (!discountSnapshot) {
            return null;
        }

        const {
            userId,
            orderId,
            discountAmount = 0,
            orderTotal,
            sessionKey,
            ipAddress,
            metadata,
            auditMetadata,
        } = redemptionData;

        const query = {
            is_deleted: false,
        };

        if (discountSnapshot.discount_id) {
            query._id = discountSnapshot.discount_id;
        } else if (discountSnapshot.code) {
            query.code = discountSnapshot.code.toUpperCase().trim();
        } else {
            throw new AppError('Discount reference missing', 400, 'DISCOUNT_REFERENCE_MISSING');
        }

        const discount = await Discount.findOne(query).session(options.session || null);

        if (!discount) {
            throw new AppError('Discount not found', 404, 'DISCOUNT_NOT_FOUND');
        }

        const now = new Date();

        if (discount.status !== 'active') {
            throw new AppError('Discount is not active', 400, 'DISCOUNT_INACTIVE');
        }

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

        const eligibilityType = discount.user_eligibility?.type || 'all';
        if (eligibilityType !== 'all') {
            const eligibilityContext = await this.getUserEligibilityContext(
                userId,
                options.session || null,
                orderId
            );
            this.assertUserEligible(discount, userId, eligibilityContext);
        }

        if (userId) {
            const userUsageCount = await DiscountUsageLog.countDocuments({
                discount_id: discount._id,
                user_id: userId,
            }).session(options.session || null);

            if (userUsageCount >= discount.usage_per_user_limit) {
                throw new AppError(
                    `You've reached max uses for this discount (${discount.usage_per_user_limit})`,
                    400,
                    'USER_DISCOUNT_LIMIT_EXCEEDED'
                );
            }
        }

        const previousUsageCount = discount.usage_count;

        const updateResult = await Discount.updateOne(
            {
                _id: discount._id,
                status: 'active',
                is_deleted: false,
                started_at: { $lte: now },
                expiry_date: { $gt: now },
                usage_count: { $lt: discount.usage_limit },
            },
            { $inc: { usage_count: 1 } },
            { session: options.session || null }
        );

        if (updateResult.modifiedCount === 0) {
            throw new AppError(
                'Discount usage limit exceeded',
                400,
                'DISCOUNT_LIMIT_EXCEEDED'
            );
        }

        const usageLog = await DiscountUsageLog.logUsage(
            {
                discountId: discount._id,
                userId,
                orderId,
                discountCode: discount.code,
                discountAmount,
                orderTotal,
                sessionKey,
                ipAddress,
                metadata,
            },
            options
        );

        await this._createDiscountAuditLog({
            action: AUDIT_ACTIONS.REDEEM_DISCOUNT,
            discount: {
                ...discount.toObject(),
                usage_count: previousUsageCount + 1,
            },
            actorId: userId || null,
            actorType: userId ? 'USER' : 'INTERNAL',
            orderId,
            userId: userId || null,
            metadata: auditMetadata || { ip: ipAddress || null },
            changes: {
                usage_count: {
                    from: previousUsageCount,
                    to: previousUsageCount + 1,
                },
                discount_amount: {
                    from: null,
                    to: discountAmount,
                },
                order_total: {
                    from: null,
                    to: orderTotal,
                },
                order_id: {
                    from: null,
                    to: orderId,
                },
            },
            auditOptions: {
                session: options.session,
                throwOnError: true,
            },
        });

        return usageLog;
    }

    static async recordUsage(discountId, userId, orderId, data = {}, options = {}) {
        return await this.redeemForOrder(
            {
                discount_id: discountId,
                code: data.discountCode,
            },
            {
                userId,
                orderId,
                discountAmount: data.discountAmount,
                orderTotal: data.orderTotal,
                sessionKey: data.sessionKey,
                ipAddress: data.ipAddress,
                metadata: data.metadata,
                auditMetadata: data.auditMetadata,
            },
            options
        );
    }

    static async createDiscount(data, createdBy, metadata = {}) {
        const normalizedData = {
            ...data,
            code: data.code.toUpperCase().trim(),
            created_by: createdBy,
            created_at: new Date(),
        };

        const discount = await Discount.create(normalizedData);

        await this._createDiscountAuditLog({
            action: AUDIT_ACTIONS.CREATE_DISCOUNT,
            discount,
            actorId: createdBy,
            metadata,
            changes: this._buildCreatedChanges(discount, [
                'code',
                'type',
                'value',
                'max_discount_amount',
                'application_strategy',
                'applicable_targets',
                'user_eligibility',
                'min_order_value',
                'usage_limit',
                'usage_per_user_limit',
                'usage_count',
                'is_stackable',
                'stack_priority',
                'started_at',
                'expiry_date',
                'status',
            ]),
        });

        return DiscountMapper.toDetailDTO(discount);
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

    static async updateDiscount(discountId, data, updatedBy, metadata = {}) {
        const existingDiscount = await Discount.findById(discountId);

        if (!existingDiscount) {
            throw new AppError('Discount not found', 404, 'DISCOUNT_NOT_FOUND');
        }

        const nextStartedAt = data.started_at
            ? new Date(data.started_at)
            : existingDiscount.started_at;

        const nextExpiryDate = data.expiry_date
            ? new Date(data.expiry_date)
            : existingDiscount.expiry_date;

        if (nextStartedAt >= nextExpiryDate) {
            throw new AppError(
                'Expiry date must be after start date',
                400,
                'INVALID_DISCOUNT_DATE_RANGE'
            );
        }

        const nextUsageLimit =
            data.usage_limit !== undefined
                ? data.usage_limit
                : existingDiscount.usage_limit;

        const nextUsagePerUserLimit =
            data.usage_per_user_limit !== undefined
                ? data.usage_per_user_limit
                : existingDiscount.usage_per_user_limit;

        if (nextUsageLimit < nextUsagePerUserLimit) {
            throw new AppError(
                'Usage limit must be >= usage per user limit',
                400,
                'INVALID_USAGE_LIMIT'
            );
        }

        if (nextUsageLimit < existingDiscount.usage_count) {
            throw new AppError(
                'Usage limit cannot be less than current usage count',
                400,
                'USAGE_LIMIT_BELOW_CURRENT_USAGE'
            );
        }

        const nextType = data.type || existingDiscount.type;
        const nextValue =
            data.value !== undefined
                ? data.value
                : existingDiscount.value;

        const nextMaxDiscountAmount =
            data.max_discount_amount !== undefined
                ? data.max_discount_amount
                : existingDiscount.max_discount_amount;

        if (nextType === 'percent' && !nextMaxDiscountAmount) {
            throw new AppError(
                'max_discount_amount is mandatory for percent discounts',
                400,
                'MAX_DISCOUNT_AMOUNT_REQUIRED'
            );
        }

        if (nextType === 'percent' && nextValue > 100) {
            throw new AppError(
                'Percent discount value must be <= 100',
                400,
                'INVALID_PERCENT_VALUE'
            );
        }

        if (
            nextType === 'fixed' &&
            nextMaxDiscountAmount &&
            nextMaxDiscountAmount < nextValue
        ) {
            throw new AppError(
                'max_discount_amount should not be less than value for fixed discounts',
                400,
                'INVALID_MAX_DISCOUNT_AMOUNT'
            );
        }

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

        await this._createDiscountAuditLog({
            action: AUDIT_ACTIONS.UPDATE_DISCOUNT,
            discount,
            actorId: updatedBy,
            metadata,
            changes: this._buildUpdatedChanges(
                existingDiscount,
                discount,
                Object.keys(data)
            ),
        });

        return DiscountMapper.toDetailDTO(discount);
    }

    static async deleteDiscount(discountId, deletedBy = null, metadata = {}) {
        const existingDiscount = await Discount.findById(discountId);

        if (!existingDiscount) {
            throw new AppError('Discount not found', 404, 'DISCOUNT_NOT_FOUND');
        }

        const discount = await Discount.findByIdAndUpdate(
            discountId,
            {
                is_deleted: true,
                deleted_at: new Date(),
            },
            { new: true }
        );

        await this._createDiscountAuditLog({
            action: AUDIT_ACTIONS.DELETE_DISCOUNT_SOFT,
            discount,
            actorId: deletedBy,
            metadata,
            changes: this._buildUpdatedChanges(
                existingDiscount,
                discount,
                ['is_deleted', 'deleted_at']
            ),
        });

        return { success: true, message: 'Discount deleted' };
    }

    static async bulkCreateDiscounts(discounts, createdBy, metadata = {}) {
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

        await this._createDiscountAuditLog({
            action: AUDIT_ACTIONS.BULK_IMPORT_DISCOUNTS,
            discount: null,
            actorId: createdBy,
            metadata,
            changes: {
                requested_count: {
                    from: null,
                    to: discounts.length,
                },
                created_count: {
                    from: 0,
                    to: results.created.length,
                },
                failed_count: {
                    from: 0,
                    to: results.failed.length,
                },
                created: {
                    from: null,
                    to: results.created.map((item) => ({
                        id: item.id,
                        code: item.code,
                    })),
                },
                failed: {
                    from: null,
                    to: results.failed,
                },
            },
        });

        return results;
    }

    static async getApplicableDiscounts(filters = {}, now = new Date()) {
        const cartItems = filters.cartItems || [];
        const cartSubtotal = filters.cartSubtotal || 0;
        const targetFilters = {
            ...filters,
            ...this.getCartItemTargetFilters(cartItems),
        };
        const discounts = await Discount.findApplicableDiscounts(targetFilters, now);
        const eligibilityContext = filters.userId
            ? await this.getUserEligibilityContext(filters.userId)
            : null;

        return discounts
            .filter((discount) => {
                if (cartSubtotal < (discount.min_order_value || 0)) {
                    return false;
                }

                const applicableItems = this.filterApplicableItems(
                    cartItems,
                    discount.applicable_targets
                );

                if (applicableItems.length === 0) {
                    return false;
                }

                try {
                    this.assertUserEligible(
                        discount,
                        filters.userId,
                        eligibilityContext || {}
                    );
                    return true;
                } catch (error) {
                    if (error instanceof AppError) {
                        return false;
                    }

                    throw error;
                }
            })
            .map((d) => DiscountMapper.toResponseDTO(d));
    }

    static async getDiscountsForUser(userId, filters = {}, now = new Date()) {
        const page = Math.max(parseInt(filters.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(filters.limit, 10) || 20, 1), 100);
        const skip = (page - 1) * limit;
        const discounts = await Discount.findDiscountsForUser(userId, filters, now);
        const paginatedDiscounts = discounts.slice(skip, skip + limit);

        return {
            data: paginatedDiscounts.map((d) => DiscountMapper.toAdminListDTO(d)),
            pagination: {
                page,
                limit,
                total: discounts.length,
                totalPages: Math.ceil(discounts.length / limit),
            },
        };
    }

    static async countNearExpiryDiscounts(daysFromNow = 7, now = new Date()) {
        return await Discount.countNearExpiry(daysFromNow, now);
    }

    static async getNearExpiryDiscounts(daysFromNow = 7, page = 1, limit = 20, now = new Date()) {
        const normalizedDays = Math.max(parseInt(daysFromNow, 10) || 7, 1);
        const normalizedPage = Math.max(parseInt(page, 10) || 1, 1);
        const normalizedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
        const skip = (normalizedPage - 1) * normalizedLimit;
        const expiryThreshold = new Date(now);
        expiryThreshold.setDate(expiryThreshold.getDate() + normalizedDays);

        const query = {
            status: 'active',
            is_deleted: false,
            expiry_date: {
                $lte: expiryThreshold,
                $gt: now,
            },
        };

        const [discounts, total] = await Promise.all([
            Discount.find(query)
                .sort({ expiry_date: 1 })
                .skip(skip)
                .limit(normalizedLimit)
                .lean(),
            Discount.countDocuments(query),
        ]);

        return {
            data: discounts.map((d) => DiscountMapper.toAdminListDTO(d)),
            pagination: {
                page: normalizedPage,
                limit: normalizedLimit,
                total,
                totalPages: Math.ceil(total / normalizedLimit),
            },
        };
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

    static async revokeDiscount(discountId, revokedBy, metadata = {}) {
        const existingDiscount = await Discount.findById(discountId);

        if (!existingDiscount) {
            throw new AppError('Discount not found', 404, 'DISCOUNT_NOT_FOUND');
        }

        const discount = await Discount.findByIdAndUpdate(
            discountId,
            {
                status: 'inactive',
                updated_by: revokedBy,
                updated_at: new Date(),
            },
            { new: true }
        );

        await this._createDiscountAuditLog({
            action: AUDIT_ACTIONS.REVOKE_DISCOUNT,
            discount,
            actorId: revokedBy,
            metadata,
            changes: this._buildUpdatedChanges(
                existingDiscount,
                discount,
                ['status', 'updated_by', 'updated_at']
            ),
        });

        return DiscountMapper.toDetailDTO(discount);
    }

    static async duplicateDiscount(discountId, overrides = {}, createdBy, metadata = {}) {
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

        await this._createDiscountAuditLog({
            action: AUDIT_ACTIONS.DUPLICATE_DISCOUNT,
            discount: created,
            sourceDiscountId: discount._id,
            actorId: createdBy,
            metadata,
            changes: {
                source_discount_id: {
                    from: null,
                    to: discount._id,
                },
                code: {
                    from: discount.code,
                    to: created.code,
                },
                usage_count: {
                    from: discount.usage_count,
                    to: created.usage_count,
                },
                status: {
                    from: discount.status,
                    to: created.status,
                },
            },
        });

        return DiscountMapper.toDetailDTO(created);
    }

    static _buildCreatedChanges(discount, fields = []) {
        const doc = discount?.toObject ? discount.toObject() : discount;

        return fields.reduce((changes, field) => {
            changes[field] = {
                from: null,
                to: this._toAuditValue(doc?.[field]),
            };

            return changes;
        }, {});
    }

    static _buildUpdatedChanges(beforeDiscount, afterDiscount, fields = []) {
        const before = beforeDiscount?.toObject
            ? beforeDiscount.toObject()
            : beforeDiscount;
        const after = afterDiscount?.toObject
            ? afterDiscount.toObject()
            : afterDiscount;

        return [...new Set(fields)].reduce((changes, field) => {
            const from = this._toAuditValue(before?.[field]);
            const to = this._toAuditValue(after?.[field]);

            if (!this._auditValuesEqual(from, to)) {
                changes[field] = { from, to };
            }

            return changes;
        }, {});
    }

    static _toAuditValue(value) {
        if (value === undefined || value === null) {
            return null;
        }
        if (value instanceof Date) {
            return value.toISOString();
        }
        if (value instanceof mongoose.Types.ObjectId) {
            return value.toString();
        }
        if (Array.isArray(value)) {
            return value.map((item) => this._toAuditValue(item));
        }
        if (value?.toObject) {
            return this._toAuditValue(value.toObject());
        }
        if (typeof value === 'object') {
            return Object.fromEntries(
                Object.entries(value).map(([key, item]) => [
                    key,
                    this._toAuditValue(item),
                ])
            );
        }

        return value;
    }

    static _auditValuesEqual(left, right) {
        return JSON.stringify(left) === JSON.stringify(right);
    }

    static async _createDiscountAuditLog({
        action,
        discount = null,
        sourceDiscountId = null,
        actorId = null,
        actorType = 'USER',
        orderId = null,
        userId = null,
        metadata = {},
        changes = {},
        auditOptions = {},
    }) {
        await DiscountAuditLogService.createLog({
            actor_id: actorId,
            actor_type: actorType,
            action,
            discount_id: discount?._id || null,
            source_discount_id: sourceDiscountId || null,
            order_id: orderId || null,
            user_id: userId || null,
            discount_code: discount?.code || null,
            changes: this._toAuditValue(changes),
            ip_address: metadata.ip || null,
            user_agent: metadata.userAgent || null,
        }, auditOptions);
    }
}

module.exports = DiscountService;
