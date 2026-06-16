class DiscountMapper {
    static toResponseDTO(discount) {
        if (!discount) {
            return null;
        }

        const doc = discount.toObject ? discount.toObject() : discount;

        return {
            id: doc._id?.toString(),
            code: doc.code,


            type: doc.type,
            value: doc.value,
            max_discount_amount: doc.max_discount_amount || null,


            application_strategy: doc.application_strategy,


            applicable_targets: this.transformApplicableTargets(
                doc.applicable_targets
            ),


            user_eligibility: this.transformUserEligibility(
                doc.user_eligibility
            ),


            min_order_value: doc.min_order_value || 0,


            usage_limit: doc.usage_limit,
            usage_per_user_limit: doc.usage_per_user_limit,
            usage_count: doc.usage_count,
            usage_percentage: this.calculateUsagePercentage(
                doc.usage_count,
                doc.usage_limit
            ),
            claim_limit: doc.claim_limit || null,
            claim_count: doc.claim_count || 0,
            claim_remaining: this.calculateClaimRemaining(
                doc.claim_count,
                doc.claim_limit
            ),


            is_stackable: doc.is_stackable,
            stack_priority: doc.stack_priority,
            show_on_homepage: Boolean(doc.show_on_homepage),
            homepage_priority: doc.homepage_priority || 0,
            requires_claim: Boolean(doc.requires_claim || doc.show_on_homepage),


            started_at: doc.started_at,
            expiry_date: doc.expiry_date,
            is_active: this.isDiscountActive(doc),
            time_remaining: this.getTimeRemaining(doc.expiry_date),


            status: doc.status,
            status_label: this.getStatusLabel(doc.status),


            created_at: doc.created_at,
            updated_at: doc.updated_at,
        };
    }

    static toDetailDTO(discount) {
        if (!discount) {
            return null;
        }

        const doc = discount.toObject ? discount.toObject() : discount;

        return {
            id: doc._id?.toString(),
            code: doc.code,


            type: doc.type,
            value: doc.value,
            max_discount_amount: doc.max_discount_amount || null,


            application_strategy: doc.application_strategy,
            application_strategy_label: this.getApplicationStrategyLabel(
                doc.application_strategy
            ),


            applicable_targets: {
                type: doc.applicable_targets?.type || 'all',
                type_label: this.getApplicableTargetTypeLabel(
                    doc.applicable_targets?.type || 'all'
                ),
                product_ids: doc.applicable_targets?.product_ids || [],
                category_ids: doc.applicable_targets?.category_ids || [],
                variant_ids: doc.applicable_targets?.variant_ids || [],
            },


            user_eligibility: {
                type: doc.user_eligibility?.type || 'all',
                type_label: this.getUserEligibilityTypeLabel(
                    doc.user_eligibility?.type || 'all'
                ),
                user_ids: doc.user_eligibility?.user_ids || [],
                min_user_tier: doc.user_eligibility?.min_user_tier || null,
            },


            min_order_value: doc.min_order_value || 0,


            usage_limit: doc.usage_limit,
            usage_per_user_limit: doc.usage_per_user_limit,
            usage_count: doc.usage_count,
            usage_percentage: this.calculateUsagePercentage(
                doc.usage_count,
                doc.usage_limit
            ),
            remaining_uses: Math.max(0, doc.usage_limit - doc.usage_count),
            claim_limit: doc.claim_limit || null,
            claim_count: doc.claim_count || 0,
            claim_remaining: this.calculateClaimRemaining(
                doc.claim_count,
                doc.claim_limit
            ),


            is_stackable: doc.is_stackable,
            stack_priority: doc.stack_priority,
            show_on_homepage: Boolean(doc.show_on_homepage),
            homepage_priority: doc.homepage_priority || 0,
            requires_claim: Boolean(doc.requires_claim || doc.show_on_homepage),


            started_at: doc.started_at,
            expiry_date: doc.expiry_date,
            is_active: this.isDiscountActive(doc),
            time_remaining: this.getTimeRemaining(doc.expiry_date),
            days_until_expiry: this.getDaysUntilExpiry(doc.expiry_date),


            status: doc.status,
            status_label: this.getStatusLabel(doc.status),


            created_by: doc.created_by?.toString() || null,
            created_at: doc.created_at,
            updated_by: doc.updated_by?.toString() || null,
            updated_at: doc.updated_at,
        };
    }

    static toAdminListDTO(discount) {
        if (!discount) {
            return null;
        }

        const doc = discount.toObject ? discount.toObject() : discount;

        return {
            id: doc._id?.toString(),
            code: doc.code,


            type: doc.type,
            type_label: this.getTypeLabel(doc.type),
            value: doc.value,
            display_value: this.formatDiscountValue(doc.type, doc.value),


            applicable_targets_type: doc.applicable_targets?.type || 'all',
            targets_count: this.countTargets(doc.applicable_targets),


            usage_count: doc.usage_count,
            usage_limit: doc.usage_limit,
            usage_percentage: this.calculateUsagePercentage(
                doc.usage_count,
                doc.usage_limit
            ),
            claim_limit: doc.claim_limit || null,
            claim_count: doc.claim_count || 0,
            claim_remaining: this.calculateClaimRemaining(
                doc.claim_count,
                doc.claim_limit
            ),


            status: doc.status,
            status_label: this.getStatusLabel(doc.status),
            is_active: this.isDiscountActive(doc),
            time_remaining: this.getTimeRemaining(doc.expiry_date),
            show_on_homepage: Boolean(doc.show_on_homepage),
            homepage_priority: doc.homepage_priority || 0,
            requires_claim: Boolean(doc.requires_claim || doc.show_on_homepage),


            created_at: doc.created_at,
            updated_at: doc.updated_at,


            can_edit: doc.status !== 'expired' && !doc.is_deleted,
            can_delete: !doc.is_deleted,
            can_activate: doc.status === 'inactive' && !doc.is_deleted,
            can_pause: doc.status === 'active' && !doc.is_deleted,
        };
    }

    static toCustomerDTO(discount) {
        if (!discount) {
            return null;
        }

        const doc = discount.toObject ? discount.toObject() : discount;

        return {
            id: doc._id?.toString(),
            code: doc.code,


            type: doc.type,
            value: doc.value,
            max_discount_amount: doc.max_discount_amount || null,
            display_value: this.formatDiscountValue(doc.type, doc.value),


            application_strategy: doc.application_strategy,
            application_strategy_label: this.getApplicationStrategyLabel(
                doc.application_strategy
            ),
            applicable_targets: this.transformCustomerApplicableTargets(
                doc.applicable_targets
            ),
            user_eligibility: this.transformCustomerUserEligibility(
                doc.user_eligibility
            ),
            requires_claim: Boolean(doc.requires_claim || doc.show_on_homepage),


            min_order_value: doc.min_order_value || 0,
            usage_per_user_limit: doc.usage_per_user_limit || 1,
            is_stackable: Boolean(doc.is_stackable),
            claim_limit: doc.claim_limit || null,
            claim_count: doc.claim_count || 0,
            claim_remaining: this.calculateClaimRemaining(
                doc.claim_count,
                doc.claim_limit
            ),


            is_valid: this.isDiscountValid(doc),
            expiry_date: doc.expiry_date,
            time_remaining: this.getTimeRemaining(doc.expiry_date),


            warning: this.getCustomerWarning(doc),
        };
    }

    static toClaimedDiscountDTO(claim, discount = null) {
        if (!claim) {
            return null;
        }

        const doc = claim.toObject ? claim.toObject() : claim;
        const discountDoc = discount?.toObject ? discount.toObject() : discount;
        const isDiscountValid = discountDoc ? this.isDiscountActive(discountDoc) : false;
        const usageLimit = discountDoc?.usage_per_user_limit || 1;
        const usedCount = doc.used_count || 0;
        const remainingUserUses = Math.max(0, usageLimit - usedCount);
        const effectiveStatus = this.getClaimEffectiveStatus(
            doc,
            discountDoc,
            remainingUserUses
        );

        return {
            id: doc._id?.toString(),
            claim_id: doc._id?.toString(),
            discount_id: doc.discount_id?.toString(),
            code: discountDoc?.code || doc.discount_code,
            status: doc.status,
            effective_status: effectiveStatus,
            is_available: effectiveStatus === 'available',
            used_count: usedCount,
            remaining_user_uses: remainingUserUses,
            claimed_at: doc.claimed_at,
            last_used_at: doc.last_used_at,
            used_at: doc.used_at,
            order_id: doc.order_id?.toString?.() || null,
            discount: discountDoc ? this.toCustomerDTO(discountDoc) : null,
            is_discount_active: isDiscountValid,
        };
    }

    static toValidationResponseDTO(validationResult) {
        if (!validationResult) {
            return null;
        }

        return {
            discount_id: validationResult.discount_id?.toString?.(),
            code: validationResult.code,


            type: validationResult.type,
            original_value: validationResult.original_value,
            display_value: this.formatDiscountValue(
                validationResult.type,
                validationResult.original_value
            ),


            discount_amount: validationResult.discount_amount,
            discount_amount_formatted: this.formatPrice(
                validationResult.discount_amount
            ),


            final_total: validationResult.final_total,
            final_total_formatted: this.formatPrice(validationResult.final_total),


            applicable_item_count: validationResult.applicable_item_ids?.length || 0,
            applicable_item_ids: validationResult.applicable_item_ids || [],


            you_save: validationResult.discount_amount,
            you_save_formatted: this.formatPrice(
                validationResult.discount_amount
            ),
        };
    }

    static toResponseDTOList(discounts, mapperFn = null) {
        if (!Array.isArray(discounts)) {
            return [];
        }

        const mapper = mapperFn || ((d) => this.toResponseDTO(d));
        return discounts.map(mapper);
    }

    static getClaimEffectiveStatus(claim, discount, remainingUserUses = 0) {
        if (!claim) {
            return 'expired';
        }

        if (claim.status === 'revoked') {
            return 'revoked';
        }

        if (claim.status === 'used' || remainingUserUses <= 0) {
            return 'used';
        }

        if (claim.status === 'expired') {
            return 'expired';
        }

        if (!discount || !this.isDiscountActive(discount)) {
            return 'expired';
        }

        return 'available';
    }

    static toAdminListDTOList(discounts) {
        if (!Array.isArray(discounts)) {
            return [];
        }
        return discounts.map((d) => this.toAdminListDTO(d));
    }

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
            claim_limit: doc.claim_limit || '',
            claim_count: doc.claim_count || 0,
            is_stackable: doc.is_stackable ? 'Yes' : 'No',
            stack_priority: doc.stack_priority,
            started_at: new Date(doc.started_at).toISOString(),
            expiry_date: new Date(doc.expiry_date).toISOString(),
            status: doc.status,
            created_at: new Date(doc.created_at).toISOString(),
            updated_at: new Date(doc.updated_at).toISOString(),
        };
    }



    static transformApplicableTargets(targets) {
        if (!targets) {
            return { type: 'all' };
        }

        const result = {
            type: targets.type || 'all',
            type_label: this.getApplicableTargetTypeLabel(targets.type),
        };

        if (targets.type === 'specific_products') {
            result.product_ids = targets.product_ids || [];
        } else if (targets.type === 'specific_categories') {
            result.category_ids = targets.category_ids || [];
        } else if (targets.type === 'specific_variants') {
            result.variant_ids = targets.variant_ids || [];
        }

        return result;
    }

    static transformUserEligibility(eligibility) {
        if (!eligibility) {
            return { type: 'all' };
        }

        const result = {
            type: eligibility.type || 'all',
            type_label: this.getUserEligibilityTypeLabel(eligibility.type),
        };

        if (eligibility.type === 'specific_users') {
            result.user_ids = eligibility.user_ids || [];
        }

        if (eligibility.min_user_tier) {
            result.min_user_tier = eligibility.min_user_tier;
        }

        return result;
    }

    static transformCustomerApplicableTargets(targets) {
        const normalizedTargets = targets || {};
        const productIds = normalizedTargets.product_ids || [];
        const categoryIds = normalizedTargets.category_ids || [];
        const variantIds = normalizedTargets.variant_ids || [];

        return {
            type: normalizedTargets.type || 'all',
            product_count: productIds.length,
            category_count: categoryIds.length,
            variant_count: variantIds.length,
        };
    }

    static transformCustomerUserEligibility(eligibility) {
        const normalizedEligibility = eligibility || {};

        return {
            type: normalizedEligibility.type || 'all',
            min_user_tier: normalizedEligibility.min_user_tier || null,
        };
    }

    static getTypeLabel(type) {
        const labels = {
            percent: 'Percentage',
            fixed: 'Fixed Amount',
        };
        return labels[type] || type;
    }

    static getApplicationStrategyLabel(strategy) {
        const labels = {
            apply_all: 'Apply to All Items',
            apply_once: 'Apply to First Item',
            apply_cheapest: 'Apply to Cheapest Item',
            apply_most_expensive: 'Apply to Most Expensive Item',
        };
        return labels[strategy] || strategy;
    }

    static getApplicableTargetTypeLabel(type) {
        const labels = {
            all: 'All Products',
            specific_products: 'Specific Products',
            specific_categories: 'Specific Categories',
            specific_variants: 'Specific Variants',
        };
        return labels[type] || type;
    }

    static getUserEligibilityTypeLabel(type) {
        const labels = {
            all: 'All Users',
            first_time_only: 'First Time Only',
            specific_users: 'Specific Users',
            vip_users: 'VIP Users',
        };
        return labels[type] || type;
    }

    static getStatusLabel(status) {
        const labels = {
            active: 'Active',
            inactive: 'Inactive',
            paused: 'Paused',
            expired: 'Expired',
        };
        return labels[status] || status;
    }

    static formatDiscountValue(type, value) {
        if (type === 'percent') {
            return `${value}% off`;
        } else if (type === 'fixed') {
            return `${this.formatPrice(value)} off`;
        }
        return value;
    }

    static formatPrice(price) {
        if (!price && price !== 0) {
            return '0 ₫';
        }

        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'VND',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(price);
    }

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

    static isDiscountValid(discount) {
        const now = new Date();

        return (
            discount.started_at <= now &&
            now < discount.expiry_date &&
            discount.usage_count < discount.usage_limit
        );
    }

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

    static calculateUsagePercentage(usageCount, usageLimit) {
        if (!usageLimit || usageLimit === 0) {
            return 0;
        }

        return Math.min(100, Math.round((usageCount / usageLimit) * 100));
    }

    static calculateClaimRemaining(claimCount = 0, claimLimit = null) {
        if (!claimLimit) {
            return null;
        }

        return Math.max(0, claimLimit - (claimCount || 0));
    }

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

    static getCustomerWarning(discount) {
        const now = new Date();

        if (discount.started_at > now) {
            return `Available from ${new Date(discount.started_at).toLocaleDateString()}`;
        }

        if (discount.expiry_date <= now) {
            return 'This discount has expired';
        }

        if (discount.usage_count >= discount.usage_limit) {
            return 'This discount has reached its usage limit';
        }


        const remaining = discount.usage_limit - discount.usage_count;
        if (remaining < Math.ceil(discount.usage_limit * 0.1) && remaining > 0) {
            return `Only ${remaining} use${remaining > 1 ? 's' : ''} left`;
        }


        const daysUntilExpiry = this.getDaysUntilExpiry(discount.expiry_date);
        if (daysUntilExpiry && daysUntilExpiry <= 3 && daysUntilExpiry > 0) {
            return `Expires in ${daysUntilExpiry} day${daysUntilExpiry > 1 ? 's' : ''}`;
        }

        return null;
    }

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

    static toSafeResponse(discount) {
        const obj = discount.toObject ? discount.toObject() : discount;

        delete obj.__v;
        delete obj.raw_data;

        return obj;
    }
}

module.exports = DiscountMapper;
