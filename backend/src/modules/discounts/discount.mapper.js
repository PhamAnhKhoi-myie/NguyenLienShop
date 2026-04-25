/**
 * Discount DTO Mapper
 * Transform between MongoDB documents and API responses
 *
 * ✅ Hide: internal fields (_id, __v, is_deleted, deleted_at)
 * ✅ Expose: id, code, value, applicable_targets, user_eligibility
 * ✅ Include: timestamps (created_at, updated_at), usage info
 * ✅ Nest: applicable_targets, user_eligibility objects
 * ✅ Format: prices, status labels in human-readable format
 */

class DiscountMapper {
    /**
     * ✅ Convert Mongoose document → API Response DTO (basic)
     *
     * Dùng cho: Discount listing, create/update returns
     * Include: discount summary + targets + usage info
     * Hide: internal fields, created_by/updated_by (for public)
     */
    static toResponseDTO(discount) {
        if (!discount) {
            return null;
        }

        const doc = discount.toObject ? discount.toObject() : discount;

        return {
            id: doc._id?.toString(),
            code: doc.code,

            // ===== DISCOUNT VALUE =====
            type: doc.type,
            value: doc.value,
            max_discount_amount: doc.max_discount_amount || null,

            // ===== APPLICATION STRATEGY =====
            application_strategy: doc.application_strategy,

            // ===== TARGETS =====
            applicable_targets: this.transformApplicableTargets(
                doc.applicable_targets
            ),

            // ===== USER ELIGIBILITY =====
            user_eligibility: this.transformUserEligibility(
                doc.user_eligibility
            ),

            // ===== CONSTRAINTS =====
            min_order_value: doc.min_order_value || 0,

            // ===== USAGE INFO =====
            usage_limit: doc.usage_limit,
            usage_per_user_limit: doc.usage_per_user_limit,
            usage_count: doc.usage_count,
            usage_percentage: this.calculateUsagePercentage(
                doc.usage_count,
                doc.usage_limit
            ),

            // ===== STACKING =====
            is_stackable: doc.is_stackable,
            stack_priority: doc.stack_priority,

            // ===== TIME WINDOW =====
            started_at: doc.started_at,
            expiry_date: doc.expiry_date,
            is_active: this.isDiscountActive(doc),
            time_remaining: this.getTimeRemaining(doc.expiry_date),

            // ===== STATUS =====
            status: doc.status,
            status_label: this.getStatusLabel(doc.status),

            // ===== TIMESTAMPS =====
            created_at: doc.created_at,
            updated_at: doc.updated_at,
        };
    }

    /**
     * ✅ Convert to Detail DTO (full information for admin edit page)
     *
     * Dùng cho: GET /admin/discounts/:id (edit form)
     * Include: full discount info + audit trail
     */
    static toDetailDTO(discount) {
        if (!discount) {
            return null;
        }

        const doc = discount.toObject ? discount.toObject() : discount;

        return {
            id: doc._id?.toString(),
            code: doc.code,

            // ===== DISCOUNT VALUE =====
            type: doc.type,
            value: doc.value,
            max_discount_amount: doc.max_discount_amount || null,

            // ===== APPLICATION STRATEGY =====
            application_strategy: doc.application_strategy,
            application_strategy_label: this.getApplicationStrategyLabel(
                doc.application_strategy
            ),

            // ===== TARGETS (FULL) =====
            applicable_targets: {
                type: doc.applicable_targets?.type || 'all',
                type_label: this.getApplicableTargetTypeLabel(
                    doc.applicable_targets?.type || 'all'
                ),
                product_ids: doc.applicable_targets?.product_ids || [],
                category_ids: doc.applicable_targets?.category_ids || [],
                variant_ids: doc.applicable_targets?.variant_ids || [],
            },

            // ===== USER ELIGIBILITY (FULL) =====
            user_eligibility: {
                type: doc.user_eligibility?.type || 'all',
                type_label: this.getUserEligibilityTypeLabel(
                    doc.user_eligibility?.type || 'all'
                ),
                user_ids: doc.user_eligibility?.user_ids || [],
                min_user_tier: doc.user_eligibility?.min_user_tier || null,
            },

            // ===== CONSTRAINTS =====
            min_order_value: doc.min_order_value || 0,

            // ===== USAGE INFO =====
            usage_limit: doc.usage_limit,
            usage_per_user_limit: doc.usage_per_user_limit,
            usage_count: doc.usage_count,
            usage_percentage: this.calculateUsagePercentage(
                doc.usage_count,
                doc.usage_limit
            ),
            remaining_uses: Math.max(0, doc.usage_limit - doc.usage_count),

            // ===== STACKING =====
            is_stackable: doc.is_stackable,
            stack_priority: doc.stack_priority,

            // ===== TIME WINDOW =====
            started_at: doc.started_at,
            expiry_date: doc.expiry_date,
            is_active: this.isDiscountActive(doc),
            time_remaining: this.getTimeRemaining(doc.expiry_date),
            days_until_expiry: this.getDaysUntilExpiry(doc.expiry_date),

            // ===== STATUS =====
            status: doc.status,
            status_label: this.getStatusLabel(doc.status),

            // ===== AUDIT TRAIL =====
            created_by: doc.created_by?.toString() || null,
            created_at: doc.created_at,
            updated_by: doc.updated_by?.toString() || null,
            updated_at: doc.updated_at,
        };
    }

    /**
     * ✅ Convert to Admin List DTO (lightweight for table view)
     *
     * Dùng cho: GET /admin/discounts (list page)
     * Include: minimal info for table rows
     * Calculate: usage percentage, time remaining
     */
    static toAdminListDTO(discount) {
        if (!discount) {
            return null;
        }

        const doc = discount.toObject ? discount.toObject() : discount;

        return {
            id: doc._id?.toString(),
            code: doc.code,

            // ===== VALUE =====
            type: doc.type,
            type_label: this.getTypeLabel(doc.type),
            value: doc.value,
            display_value: this.formatDiscountValue(doc.type, doc.value),

            // ===== TARGETS =====
            applicable_targets_type: doc.applicable_targets?.type || 'all',
            targets_count: this.countTargets(doc.applicable_targets),

            // ===== USAGE =====
            usage_count: doc.usage_count,
            usage_limit: doc.usage_limit,
            usage_percentage: this.calculateUsagePercentage(
                doc.usage_count,
                doc.usage_limit
            ),

            // ===== TIME =====
            status: doc.status,
            status_label: this.getStatusLabel(doc.status),
            is_active: this.isDiscountActive(doc),
            time_remaining: this.getTimeRemaining(doc.expiry_date),

            // ===== TIMESTAMPS =====
            created_at: doc.created_at,
            updated_at: doc.updated_at,

            // ===== ACTIONS =====
            can_edit: doc.status !== 'expired' && !doc.is_deleted,
            can_delete: !doc.is_deleted,
            can_activate: doc.status === 'inactive' && !doc.is_deleted,
            can_pause: doc.status === 'active' && !doc.is_deleted,
        };
    }

    /**
     * ✅ Convert to Customer View DTO (minimal for checkout)
     *
     * Dùng cho: POST /carts/validate-discount (checkout page)
     * Include: discount info needed for apply
     * Hide: admin details (usage limit display, targets detail)
     */
    static toCustomerDTO(discount) {
        if (!discount) {
            return null;
        }

        const doc = discount.toObject ? discount.toObject() : discount;

        return {
            id: doc._id?.toString(),
            code: doc.code,

            // ===== DISCOUNT VALUE =====
            type: doc.type,
            value: doc.value,
            max_discount_amount: doc.max_discount_amount || null,
            display_value: this.formatDiscountValue(doc.type, doc.value),

            // ===== APPLICATION =====
            application_strategy: doc.application_strategy,

            // ===== CONSTRAINTS =====
            min_order_value: doc.min_order_value || 0,

            // ===== TIME =====
            is_valid: this.isDiscountValid(doc),
            time_remaining: this.getTimeRemaining(doc.expiry_date),

            // ===== WARNINGS =====
            warning: this.getCustomerWarning(doc),
        };
    }

    /**
     * ✅ Convert to Validation Response DTO (result of validateAndApply)
     *
     * Dùng cho: POST /discounts/validate response (discount applied result)
     * Include: discount info + calculated discount amount
     */
    static toValidationResponseDTO(validationResult) {
        if (!validationResult) {
            return null;
        }

        return {
            discount_id: validationResult.discount_id?.toString?.(),
            code: validationResult.code,

            // ===== DISCOUNT VALUE =====
            type: validationResult.type,
            original_value: validationResult.original_value,
            display_value: this.formatDiscountValue(
                validationResult.type,
                validationResult.original_value
            ),

            // ===== CALCULATED AMOUNT =====
            discount_amount: validationResult.discount_amount,
            discount_amount_formatted: this.formatPrice(
                validationResult.discount_amount
            ),

            // ===== FINAL TOTAL =====
            final_total: validationResult.final_total,
            final_total_formatted: this.formatPrice(validationResult.final_total),

            // ===== APPLICABLE ITEMS =====
            applicable_item_count: validationResult.applicable_item_ids?.length || 0,
            applicable_item_ids: validationResult.applicable_item_ids || [],

            // ===== SAVINGS =====
            you_save: validationResult.discount_amount,
            you_save_formatted: this.formatPrice(
                validationResult.discount_amount
            ),
        };
    }

    /**
     * ✅ Convert array of discounts → array of DTOs
     *
     * Dùng cho: List endpoints with custom mapper
     */
    static toResponseDTOList(discounts, mapperFn = null) {
        if (!Array.isArray(discounts)) {
            return [];
        }

        const mapper = mapperFn || ((d) => this.toResponseDTO(d));
        return discounts.map(mapper);
    }

    /**
     * ✅ Convert array → admin list DTOs
     *
     * Dùng cho: Admin GET /discounts (list with pagination)
     */
    static toAdminListDTOList(discounts) {
        if (!Array.isArray(discounts)) {
            return [];
        }
        return discounts.map((d) => this.toAdminListDTO(d));
    }

    /**
     * ✅ Convert to Export DTO (CSV/Report)
     *
     * Dùng cho: Export, reports, analytics
     * Include: flattened structure for tabular format
     */
    static toExportDTO(discount) {
        if (!discount) {
            return null;
        }

        const doc = discount.toObject ? discount.toObject() : discount;

        return {
            code: doc.code,
            type: doc.type,
            value: doc.value,
            max_discount_amount: doc.max_discount_amount || '',
            application_strategy: doc.application_strategy,
            applicable_targets_type: doc.applicable_targets?.type || 'all',
            min_order_value: doc.min_order_value || 0,
            usage_limit: doc.usage_limit,
            usage_per_user_limit: doc.usage_per_user_limit,
            usage_count: doc.usage_count,
            is_stackable: doc.is_stackable ? 'Yes' : 'No',
            stack_priority: doc.stack_priority,
            started_at: new Date(doc.started_at).toISOString(),
            expiry_date: new Date(doc.expiry_date).toISOString(),
            status: doc.status,
            created_at: new Date(doc.created_at).toISOString(),
            updated_at: new Date(doc.updated_at).toISOString(),
        };
    }

    // ===== HELPERS =====

    /**
     * ✅ Helper: Transform applicable_targets object
     */
    static transformApplicableTargets(targets) {
        if (!targets) {
            return { type: 'all' };
        }

        const result = {
            type: targets.type || 'all',
            type_label: this.getApplicableTargetTypeLabel(targets.type),
        };

        // Only include IDs if type matches
        if (targets.type === 'specific_products') {
            result.product_ids = targets.product_ids || [];
        } else if (targets.type === 'specific_categories') {
            result.category_ids = targets.category_ids || [];
        } else if (targets.type === 'specific_variants') {
            result.variant_ids = targets.variant_ids || [];
        }

        return result;
    }

    /**
     * ✅ Helper: Transform user_eligibility object
     */
    static transformUserEligibility(eligibility) {
        if (!eligibility) {
            return { type: 'all' };
        }

        const result = {
            type: eligibility.type || 'all',
            type_label: this.getUserEligibilityTypeLabel(eligibility.type),
        };

        // Only include IDs if type matches
        if (eligibility.type === 'specific_users') {
            result.user_ids = eligibility.user_ids || [];
        }

        if (eligibility.min_user_tier) {
            result.min_user_tier = eligibility.min_user_tier;
        }

        return result;
    }

    /**
     * ✅ Helper: Get type label (human-readable)
     */
    static getTypeLabel(type) {
        const labels = {
            percent: 'Percentage',
            fixed: 'Fixed Amount',
        };
        return labels[type] || type;
    }

    /**
     * ✅ Helper: Get application_strategy label
     */
    static getApplicationStrategyLabel(strategy) {
        const labels = {
            apply_all: 'Apply to All Items',
            apply_once: 'Apply to First Item',
            apply_cheapest: 'Apply to Cheapest Item',
            apply_most_expensive: 'Apply to Most Expensive Item',
        };
        return labels[strategy] || strategy;
    }

    /**
     * ✅ Helper: Get applicable_targets type label
     */
    static getApplicableTargetTypeLabel(type) {
        const labels = {
            all: 'All Products',
            specific_products: 'Specific Products',
            specific_categories: 'Specific Categories',
            specific_variants: 'Specific Variants',
        };
        return labels[type] || type;
    }

    /**
     * ✅ Helper: Get user_eligibility type label
     */
    static getUserEligibilityTypeLabel(type) {
        const labels = {
            all: 'All Users',
            first_time_only: 'First Time Only',
            specific_users: 'Specific Users',
            vip_users: 'VIP Users',
        };
        return labels[type] || type;
    }

    /**
     * ✅ Helper: Get status label
     */
    static getStatusLabel(status) {
        const labels = {
            active: 'Active',
            inactive: 'Inactive',
            paused: 'Paused',
            expired: 'Expired',
        };
        return labels[status] || status;
    }

    /**
     * ✅ Helper: Format discount value for display
     *
     * Examples:
     * - type: 'percent', value: 50 → "50% off"
     * - type: 'fixed', value: 200000 → "200,000 ₫"
     */
    static formatDiscountValue(type, value) {
        if (type === 'percent') {
            return `${value}% off`;
        } else if (type === 'fixed') {
            return `${this.formatPrice(value)} off`;
        }
        return value;
    }

    /**
     * ✅ Helper: Format price for display (VND)
     *
     * Example: 180000 → "180,000 ₫"
     */
    static formatPrice(price) {
        if (!price && price !== 0) {
            return '0 ₫';
        }

        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(price);
    }

    /**
     * ✅ Helper: Check if discount is currently active
     */
    static isDiscountActive(discount) {
        const now = new Date();

        return (
            discount.status === 'active' &&
            discount.started_at <= now &&
            now < discount.expiry_date &&
            discount.usage_count < discount.usage_limit &&
            !discount.is_deleted
        );
    }

    /**
     * ✅ Helper: Check if discount is valid for use
     *
     * Similar to isDiscountActive but doesn't check status
     */
    static isDiscountValid(discount) {
        const now = new Date();

        return (
            discount.started_at <= now &&
            now < discount.expiry_date &&
            discount.usage_count < discount.usage_limit
        );
    }

    /**
     * ✅ Helper: Get time remaining (human-readable)
     *
     * Examples:
     * - "5 days remaining"
     * - "2 hours remaining"
     * - "Expired"
     */
    static getTimeRemaining(expiryDate) {
        if (!expiryDate) {
            return 'No expiry';
        }

        const now = new Date();
        const expiry = new Date(expiryDate);

        if (expiry <= now) {
            return 'Expired';
        }

        const diffMs = expiry - now;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        if (diffDays > 0) {
            return `${diffDays} day${diffDays > 1 ? 's' : ''} remaining`;
        }

        if (diffHours > 0) {
            return `${diffHours} hour${diffHours > 1 ? 's' : ''} remaining`;
        }

        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} remaining`;
    }

    /**
     * ✅ Helper: Get days until expiry (for admin)
     */
    static getDaysUntilExpiry(expiryDate) {
        if (!expiryDate) {
            return null;
        }

        const now = new Date();
        const expiry = new Date(expiryDate);

        if (expiry <= now) {
            return 0;
        }

        const diffMs = expiry - now;
        return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    }

    /**
     * ✅ Helper: Calculate usage percentage
     *
     * Returns: 0-100
     */
    static calculateUsagePercentage(usageCount, usageLimit) {
        if (!usageLimit || usageLimit === 0) {
            return 0;
        }

        return Math.min(100, Math.round((usageCount / usageLimit) * 100));
    }

    /**
     * ✅ Helper: Count total targets
     */
    static countTargets(targets) {
        if (!targets) {
            return 0;
        }

        const count =
            (targets.product_ids?.length || 0) +
            (targets.category_ids?.length || 0) +
            (targets.variant_ids?.length || 0);

        return count;
    }

    /**
     * ✅ Helper: Get customer-facing warning message
     *
     * Examples:
     * - "Expires in 1 day"
     * - "Already expired"
     * - "Not started yet"
     */
    static getCustomerWarning(discount) {
        const now = new Date();

        // Not started yet
        if (discount.started_at > now) {
            return `Available from ${new Date(discount.started_at).toLocaleDateString()}`;
        }

        // Expired
        if (discount.expiry_date <= now) {
            return 'This discount has expired';
        }

        // Usage limit reached
        if (discount.usage_count >= discount.usage_limit) {
            return 'This discount has reached its usage limit';
        }

        // Low usage remaining (less than 10%)
        const remaining = discount.usage_limit - discount.usage_count;
        if (remaining < Math.ceil(discount.usage_limit * 0.1) && remaining > 0) {
            return `Only ${remaining} use${remaining > 1 ? 's' : ''} left`;
        }

        // Expiring soon (within 3 days)
        const daysUntilExpiry = this.getDaysUntilExpiry(discount.expiry_date);
        if (daysUntilExpiry && daysUntilExpiry <= 3 && daysUntilExpiry > 0) {
            return `Expires in ${daysUntilExpiry} day${daysUntilExpiry > 1 ? 's' : ''}`;
        }

        return null;
    }

    /**
     * ✅ Helper: Validate discount DTO before response
     *
     * Returns: { isValid: boolean, errors: [] }
     */
    static validateDTO(discount) {
        const errors = [];

        if (!discount.code) {
            errors.push('Code is required');
        }

        if (!discount.type) {
            errors.push('Type is required');
        }

        if (!discount.value || discount.value < 0) {
            errors.push('Value must be a positive number');
        }

        if (discount.type === 'percent' && !discount.max_discount_amount) {
            errors.push('Max discount amount is required for percent discounts');
        }

        if (!discount.usage_limit || discount.usage_limit < 1) {
            errors.push('Usage limit must be at least 1');
        }

        if (discount.started_at >= discount.expiry_date) {
            errors.push('Expiry date must be after start date');
        }

        return {
            isValid: errors.length === 0,
            errors,
        };
    }

    /**
     * ✅ Helper: Get safe response object (hide internal data)
     */
    static toSafeResponse(discount) {
        const obj = discount.toObject ? discount.toObject() : discount;

        // Redact internal fields
        delete obj.__v;
        delete obj.raw_data; // If any raw webhook data exists

        return obj;
    }
}

module.exports = DiscountMapper;
