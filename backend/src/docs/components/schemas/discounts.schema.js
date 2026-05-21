const objectIdPattern = "^[a-fA-F0-9]{24}$";
const discountTypeEnum = ["percent", "fixed"];
const discountStatusEnum = ["active", "inactive", "paused", "expired"];
const applicationStrategyEnum = ["apply_all", "apply_once", "apply_cheapest", "apply_most_expensive"];
const applicableTargetTypeEnum = ["all", "specific_products", "specific_categories", "specific_variants"];
const userEligibilityTypeEnum = ["all", "first_time_only", "specific_users", "vip_users"];
const userTierEnum = ["bronze", "silver", "gold", "platinum"];

const objectId = (example = "507f1f77bcf86cd799439011") => ({
    type: "string",
    pattern: objectIdPattern,
    example,
});

const pagination = {
    type: "object",
    required: ["page", "limit", "total", "totalPages"],
    properties: {
        page: { type: "integer", minimum: 1, example: 1 },
        limit: { type: "integer", minimum: 1, maximum: 100, example: 20 },
        total: { type: "integer", minimum: 0, example: 150 },
        totalPages: { type: "integer", minimum: 0, example: 8 },
    },
};

module.exports = {
    DiscountApplicableTargetsInput: {
        type: "object",
        properties: {
            type: { type: "string", enum: applicableTargetTypeEnum, default: "all", example: "all" },
            product_ids: { type: "array", items: objectId("507f1f77bcf86cd799439101"), default: [] },
            category_ids: { type: "array", items: objectId("507f1f77bcf86cd799439102"), default: [] },
            variant_ids: { type: "array", items: objectId("507f1f77bcf86cd799439103"), default: [] },
        },
    },

    DiscountUserEligibilityInput: {
        type: "object",
        properties: {
            type: { type: "string", enum: userEligibilityTypeEnum, default: "all", example: "all" },
            user_ids: { type: "array", items: objectId("507f1f77bcf86cd799439011"), default: [] },
            min_user_tier: { type: "string", enum: userTierEnum, nullable: true, example: "gold" },
        },
    },

    DiscountApplicableTargets: {
        allOf: [
            { $ref: "#/components/schemas/DiscountApplicableTargetsInput" },
            {
                type: "object",
                properties: {
                    type_label: { type: "string", example: "All Products" },
                },
            },
        ],
    },

    DiscountUserEligibility: {
        allOf: [
            { $ref: "#/components/schemas/DiscountUserEligibilityInput" },
            {
                type: "object",
                properties: {
                    type_label: { type: "string", example: "All Users" },
                },
            },
        ],
    },

    DiscountCartItemInput: {
        type: "object",
        required: ["_id", "product_id", "variant_id", "unit_id", "sku", "quantity", "pack_size", "price_at_added", "line_total"],
        properties: {
            _id: { type: "string", example: "cart-item-1" },
            product_id: objectId("507f1f77bcf86cd799439101"),
            variant_id: objectId("507f1f77bcf86cd799439103"),
            unit_id: objectId("507f1f77bcf86cd799439104"),
            category_id: { ...objectId("507f1f77bcf86cd799439102"), nullable: true },
            sku: { type: "string", example: "BAG-20X25-NW" },
            quantity: { type: "number", minimum: 1, example: 2 },
            pack_size: { type: "number", minimum: 1, example: 100 },
            price_at_added: { type: "number", minimum: 0, example: 180000 },
            line_total: { type: "number", minimum: 0, example: 360000 },
        },
    },

    CreateDiscountInput: {
        type: "object",
        required: ["code", "type", "value", "usage_limit", "usage_per_user_limit", "started_at", "expiry_date"],
        properties: {
            code: {
                type: "string",
                minLength: 3,
                maxLength: 20,
                pattern: "^[A-Z0-9_-]+$",
                example: "SALE50",
            },
            type: { type: "string", enum: discountTypeEnum, example: "percent" },
            value: { type: "number", minimum: 0, maximum: 100, example: 50 },
            max_discount_amount: {
                type: "number",
                minimum: 0,
                nullable: true,
                description: "Required when type is percent.",
                example: 500000,
            },
            application_strategy: { type: "string", enum: applicationStrategyEnum, default: "apply_all" },
            applicable_targets: { $ref: "#/components/schemas/DiscountApplicableTargetsInput" },
            user_eligibility: { $ref: "#/components/schemas/DiscountUserEligibilityInput" },
            min_order_value: { type: "number", minimum: 0, default: 0, example: 500000 },
            usage_limit: { type: "integer", minimum: 1, example: 1000 },
            usage_per_user_limit: { type: "integer", minimum: 1, example: 2 },
            is_stackable: { type: "boolean", default: false, example: false },
            stack_priority: { type: "integer", default: 0, example: 0 },
            started_at: { type: "string", format: "date-time", example: "2026-06-01T00:00:00Z" },
            expiry_date: { type: "string", format: "date-time", example: "2026-06-30T23:59:59Z" },
            status: { type: "string", enum: discountStatusEnum, default: "active", example: "active" },
        },
    },

    UpdateDiscountInput: {
        type: "object",
        properties: {
            code: { type: "string", minLength: 3, maxLength: 20, pattern: "^[A-Z0-9_-]+$" },
            type: { type: "string", enum: discountTypeEnum },
            value: { type: "number", minimum: 0 },
            max_discount_amount: { type: "number", minimum: 0, nullable: true },
            application_strategy: { type: "string", enum: applicationStrategyEnum },
            applicable_targets: { $ref: "#/components/schemas/DiscountApplicableTargetsInput" },
            user_eligibility: { $ref: "#/components/schemas/DiscountUserEligibilityInput" },
            min_order_value: { type: "number", minimum: 0 },
            usage_limit: { type: "integer", minimum: 1 },
            usage_per_user_limit: { type: "integer", minimum: 1 },
            is_stackable: { type: "boolean" },
            stack_priority: { type: "integer" },
            started_at: { type: "string", format: "date-time" },
            expiry_date: { type: "string", format: "date-time" },
            status: { type: "string", enum: discountStatusEnum },
        },
    },

    ValidateDiscountInput: {
        type: "object",
        required: ["code", "cartSubtotal"],
        properties: {
            code: { type: "string", minLength: 1, example: "SALE50" },
            cartSubtotal: { type: "number", minimum: 0, exclusiveMinimum: true, example: 1000000 },
            cartItems: {
                type: "array",
                items: { $ref: "#/components/schemas/DiscountCartItemInput" },
                default: [],
            },
        },
    },

    ApplicableDiscountsInput: {
        type: "object",
        required: ["cartItems"],
        properties: {
            cartSubtotal: { type: "number", minimum: 0, default: 0, example: 1000000 },
            cartItems: {
                type: "array",
                minItems: 1,
                items: { $ref: "#/components/schemas/DiscountCartItemInput" },
            },
        },
    },

    BulkDiscountInput: {
        type: "object",
        required: ["code", "type", "value", "usage_limit", "usage_per_user_limit"],
        properties: {
            code: { type: "string", minLength: 3, maxLength: 20, pattern: "^[A-Z0-9_-]+$", example: "SALE001" },
            type: { type: "string", enum: discountTypeEnum, example: "percent" },
            value: { type: "number", minimum: 0, example: 10 },
            max_discount_amount: { type: "number", minimum: 0, nullable: true, example: 100000 },
            application_strategy: { type: "string", enum: applicationStrategyEnum },
            min_order_value: { type: "number", minimum: 0 },
            usage_limit: { type: "integer", minimum: 1, example: 100 },
            usage_per_user_limit: { type: "integer", minimum: 1, example: 1 },
            is_stackable: { type: "boolean" },
            stack_priority: { type: "integer" },
            started_at: { type: "string", format: "date-time" },
            expiry_date: { type: "string", format: "date-time" },
            status: { type: "string", enum: discountStatusEnum },
        },
    },

    BulkCreateDiscountInput: {
        type: "object",
        required: ["discounts"],
        properties: {
            discounts: {
                type: "array",
                minItems: 1,
                items: { $ref: "#/components/schemas/BulkDiscountInput" },
            },
        },
    },

    DuplicateDiscountInput: {
        type: "object",
        required: ["newCode"],
        properties: {
            newCode: { type: "string", minLength: 3, maxLength: 20, pattern: "^[A-Z0-9_-]+$", example: "SALE50_COPY" },
        },
    },

    Discount: {
        type: "object",
        required: ["id", "code", "type", "value", "status", "created_at", "updated_at"],
        properties: {
            id: objectId(),
            code: { type: "string", example: "SALE50" },
            type: { type: "string", enum: discountTypeEnum, example: "percent" },
            value: { type: "number", minimum: 0, example: 50 },
            max_discount_amount: { type: "number", minimum: 0, nullable: true, example: 500000 },
            application_strategy: { type: "string", enum: applicationStrategyEnum, example: "apply_all" },
            application_strategy_label: { type: "string", example: "Apply to All Items" },
            applicable_targets: { $ref: "#/components/schemas/DiscountApplicableTargets" },
            user_eligibility: { $ref: "#/components/schemas/DiscountUserEligibility" },
            min_order_value: { type: "number", minimum: 0, example: 500000 },
            usage_limit: { type: "integer", minimum: 1, example: 1000 },
            usage_per_user_limit: { type: "integer", minimum: 1, example: 2 },
            usage_count: { type: "integer", minimum: 0, example: 450 },
            usage_percentage: { type: "number", minimum: 0, maximum: 100, example: 45 },
            remaining_uses: { type: "integer", minimum: 0, example: 550 },
            is_stackable: { type: "boolean", example: false },
            stack_priority: { type: "integer", example: 0 },
            started_at: { type: "string", format: "date-time" },
            expiry_date: { type: "string", format: "date-time" },
            is_active: { type: "boolean", example: true },
            time_remaining: { type: "string", example: "28 days remaining" },
            days_until_expiry: { type: "integer", nullable: true, example: 28 },
            status: { type: "string", enum: discountStatusEnum, example: "active" },
            status_label: { type: "string", example: "Active" },
            created_by: { type: "string", pattern: objectIdPattern, nullable: true },
            created_at: { type: "string", format: "date-time" },
            updated_by: { type: "string", pattern: objectIdPattern, nullable: true },
            updated_at: { type: "string", format: "date-time" },
        },
    },

    DiscountListItem: {
        type: "object",
        required: ["id", "code", "type", "value", "status", "created_at"],
        properties: {
            id: objectId(),
            code: { type: "string", example: "SALE50" },
            type: { type: "string", enum: discountTypeEnum, example: "percent" },
            type_label: { type: "string", example: "Percentage" },
            value: { type: "number", example: 50 },
            display_value: { type: "string", example: "50% off" },
            applicable_targets_type: { type: "string", enum: applicableTargetTypeEnum, example: "all" },
            targets_count: { type: "integer", minimum: 0, example: 0 },
            usage_count: { type: "integer", minimum: 0, example: 450 },
            usage_limit: { type: "integer", minimum: 1, example: 1000 },
            usage_percentage: { type: "number", minimum: 0, maximum: 100, example: 45 },
            status: { type: "string", enum: discountStatusEnum, example: "active" },
            status_label: { type: "string", example: "Active" },
            is_active: { type: "boolean", example: true },
            time_remaining: { type: "string", example: "28 days remaining" },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
            can_edit: { type: "boolean", example: true },
            can_delete: { type: "boolean", example: true },
            can_activate: { type: "boolean", example: false },
            can_pause: { type: "boolean", example: true },
        },
    },

    DiscountValidationResponse: {
        type: "object",
        required: ["discount_id", "code", "type", "discount_amount", "final_total"],
        properties: {
            discount_id: objectId(),
            code: { type: "string", example: "SALE50" },
            type: { type: "string", enum: discountTypeEnum, example: "percent" },
            original_value: { type: "number", example: 50 },
            display_value: { type: "string", example: "50% off" },
            discount_amount: { type: "number", example: 500000 },
            discount_amount_formatted: { type: "string", example: "500,000 VND" },
            final_total: { type: "number", example: 500000 },
            final_total_formatted: { type: "string", example: "500,000 VND" },
            applicable_item_count: { type: "integer", minimum: 0, example: 2 },
            applicable_item_ids: { type: "array", items: { type: "string" } },
            you_save: { type: "number", example: 500000 },
            you_save_formatted: { type: "string", example: "500,000 VND" },
        },
    },

    BulkCreateDiscountResult: {
        type: "object",
        required: ["created", "failed"],
        properties: {
            created: { type: "array", items: { $ref: "#/components/schemas/Discount" } },
            failed: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        code: { type: "string", example: "BADCODE" },
                        error: { type: "string", example: "max_discount_amount is mandatory for percent discounts" },
                    },
                },
            },
        },
    },

    DiscountUsageStats: {
        type: "object",
        required: ["total_used", "unique_users", "last_used_at", "usage_percentage"],
        properties: {
            total_used: { type: "integer", minimum: 0, example: 450 },
            unique_users: { type: "integer", minimum: 0, example: 123 },
            last_used_at: { type: "string", format: "date-time", nullable: true, example: null },
            usage_percentage: { type: "number", minimum: 0, maximum: 100, example: 45 },
        },
    },

    DiscountResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Discount revoked successfully" },
            data: { $ref: "#/components/schemas/Discount" },
        },
    },

    DiscountsListResponse: {
        type: "object",
        required: ["success", "data", "pagination"],
        properties: {
            success: { type: "boolean", example: true },
            data: { type: "array", items: { $ref: "#/components/schemas/DiscountListItem" } },
            pagination,
        },
    },

    ApplicableDiscountsResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: { type: "array", items: { $ref: "#/components/schemas/Discount" } },
        },
    },

    ValidateDiscountResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/DiscountValidationResponse" },
        },
    },

    BulkCreateDiscountResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/BulkCreateDiscountResult" },
        },
    },

    DiscountUsageStatsResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/DiscountUsageStats" },
        },
    },

    DeleteDiscountResponse: {
        type: "object",
        required: ["success", "message"],
        properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Discount deleted successfully" },
        },
    },
};
