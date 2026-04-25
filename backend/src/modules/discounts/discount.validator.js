const { z } = require('zod');

/**
 * ============================================
 * DISCOUNT VALIDATION SCHEMAS
 * ============================================
 *
 * Zod schemas for discount operations:
 * - createDiscountSchema: Admin creates new discount
 * - updateDiscountSchema: Admin updates discount
 * - validateDiscountSchema: Customer applies discount code
 * - bulkCreateSchema: Admin bulk import discounts (CSV)
 *
 * Key rules:
 * ✅ code: normalized (uppercase, 3-20 chars, alphanumeric + _ -)
 * ✅ max_discount_amount: mandatory for percent, optional for fixed
 * ✅ expiry_date > started_at: enforced via refine()
 * ✅ usage_limit >= usage_per_user_limit: logical constraint
 * ✅ stack_priority: used only if is_stackable = true
 */

// ===== BASE SCHEMAS (Reusable) =====

const codeSchema = z
    .string()
    .min(3, 'Code must be at least 3 characters')
    .max(20, 'Code must not exceed 20 characters')
    .regex(
        /^[A-Z0-9_-]+$/,
        'Code must contain only uppercase letters, numbers, underscores, and dashes'
    )
    .transform((val) => val.toUpperCase().trim());

const typeSchema = z.enum(['percent', 'fixed'], {
    errorMap: () => ({
        message: 'Type must be percent or fixed',
    }),
});

const applicationStrategySchema = z.enum(
    ['apply_all', 'apply_once', 'apply_cheapest', 'apply_most_expensive'],
    {
        errorMap: () => ({
            message:
                'Strategy must be apply_all, apply_once, apply_cheapest, or apply_most_expensive',
        }),
    }
);

const applicableTargetsTypeSchema = z.enum(
    ['all', 'specific_products', 'specific_categories', 'specific_variants'],
    {
        errorMap: () => ({
            message:
                'Applicable targets type must be all, specific_products, specific_categories, or specific_variants',
        }),
    }
);

const userEligibilityTypeSchema = z.enum(
    ['all', 'first_time_only', 'specific_users', 'vip_users'],
    {
        errorMap: () => ({
            message:
                'User eligibility type must be all, first_time_only, specific_users, or vip_users',
        }),
    }
);

const statusSchema = z.enum(['active', 'inactive', 'paused', 'expired'], {
    errorMap: () => ({
        message: 'Status must be active, inactive, paused, or expired',
    }),
});

const objectIdSchema = z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format');

// ===== APPLICABLE TARGETS SCHEMA =====

const applicableTargetsSchema = z.object({
    type: applicableTargetsTypeSchema.default('all'),
    product_ids: z.array(objectIdSchema).optional().default([]),
    category_ids: z.array(objectIdSchema).optional().default([]),
    variant_ids: z.array(objectIdSchema).optional().default([]),
});

// ===== USER ELIGIBILITY SCHEMA =====

const userEligibilitySchema = z.object({
    type: userEligibilityTypeSchema.default('all'),
    user_ids: z.array(objectIdSchema).optional().default([]),
    min_user_tier: z
        .enum(['bronze', 'silver', 'gold', 'platinum'])
        .optional()
        .nullable(),
});

// ===== CREATE DISCOUNT SCHEMA =====

const createDiscountSchema = z
    .object({
        code: codeSchema,

        // ===== DISCOUNT VALUE =====
        type: typeSchema,
        value: z.number().min(0, 'Value must be >= 0'),

        max_discount_amount: z
            .number()
            .min(0, 'Max discount amount must be >= 0')
            .optional()
            .nullable(),

        // ===== APPLICATION STRATEGY =====
        application_strategy: applicationStrategySchema.default('apply_all'),

        // ===== TARGETS =====
        applicable_targets: applicableTargetsSchema.optional(),

        // ===== USER ELIGIBILITY =====
        user_eligibility: userEligibilitySchema.optional(),

        // ===== CONSTRAINTS =====
        min_order_value: z.number().min(0, 'Min order value must be >= 0').default(0),

        // ===== USAGE LIMITS =====
        usage_limit: z
            .number()
            .min(1, 'Usage limit must be at least 1')
            .int('Usage limit must be an integer'),

        usage_per_user_limit: z
            .number()
            .min(1, 'Usage per user limit must be at least 1')
            .int('Usage per user limit must be an integer'),

        // ===== STACKING =====
        is_stackable: z.boolean().default(false),
        stack_priority: z.number().int('Stack priority must be an integer').default(0),

        // ===== TIME WINDOW =====
        started_at: z.coerce.date('Invalid start date'),
        expiry_date: z.coerce.date('Invalid expiry date'),

        // ===== STATUS =====
        status: statusSchema.default('active'),
    })
    // ===== CROSS-FIELD VALIDATIONS =====
    .refine(
        (data) => {
            // max_discount_amount is mandatory for percent discounts
            if (data.type === 'percent' && !data.max_discount_amount) {
                return false;
            }
            return true;
        },
        {
            message: 'max_discount_amount is mandatory for percent discounts',
            path: ['max_discount_amount'],
        }
    )
    .refine(
        (data) => {
            // expiry_date must be after started_at
            return data.started_at < data.expiry_date;
        },
        {
            message: 'Expiry date must be after start date',
            path: ['expiry_date'],
        }
    )
    .refine(
        (data) => {
            // usage_limit >= usage_per_user_limit (logical constraint)
            return data.usage_limit >= data.usage_per_user_limit;
        },
        {
            message: 'Usage limit must be >= usage per user limit',
            path: ['usage_limit'],
        }
    )
    .refine(
        (data) => {
            // If type is 'fixed', max_discount_amount should not exceed value
            if (data.type === 'fixed' && data.max_discount_amount) {
                return data.max_discount_amount >= data.value;
            }
            return true;
        },
        {
            message: 'For fixed discounts, max_discount_amount should be >= value',
            path: ['max_discount_amount'],
        }
    )
    .refine(
        (data) => {
            // Validate applicable_targets logic
            const { applicable_targets } = data;

            if (!applicable_targets) {
                return true;
            }

            if (applicable_targets.type === 'all') {
                return true; // No need to check IDs
            }

            if (applicable_targets.type === 'specific_products') {
                return applicable_targets.product_ids.length > 0;
            }

            if (applicable_targets.type === 'specific_categories') {
                return applicable_targets.category_ids.length > 0;
            }

            if (applicable_targets.type === 'specific_variants') {
                return applicable_targets.variant_ids.length > 0;
            }

            return false;
        },
        {
            message: 'Selected target type requires at least one ID',
            path: ['applicable_targets'],
        }
    )
    .refine(
        (data) => {
            // Validate user_eligibility logic
            const { user_eligibility } = data;

            if (!user_eligibility) {
                return true;
            }

            if (user_eligibility.type === 'all') {
                return true; // No need to check IDs
            }

            if (user_eligibility.type === 'specific_users') {
                return user_eligibility.user_ids.length > 0;
            }

            return true;
        },
        {
            message: 'Selected user eligibility type requires at least one user ID',
            path: ['user_eligibility'],
        }
    );

// ===== UPDATE DISCOUNT SCHEMA =====

const updateDiscountSchema = z
    .object({
        code: codeSchema.optional(),
        type: typeSchema.optional(),
        value: z.number().min(0, 'Value must be >= 0').optional(),
        max_discount_amount: z
            .number()
            .min(0, 'Max discount amount must be >= 0')
            .optional()
            .nullable(),
        application_strategy: applicationStrategySchema.optional(),
        applicable_targets: applicableTargetsSchema.optional(),
        user_eligibility: userEligibilitySchema.optional(),
        min_order_value: z.number().min(0, 'Min order value must be >= 0').optional(),
        usage_limit: z
            .number()
            .min(1, 'Usage limit must be at least 1')
            .int('Usage limit must be an integer')
            .optional(),
        usage_per_user_limit: z
            .number()
            .min(1, 'Usage per user limit must be at least 1')
            .int('Usage per user limit must be an integer')
            .optional(),
        is_stackable: z.boolean().optional(),
        stack_priority: z.number().int('Stack priority must be an integer').optional(),
        started_at: z.coerce.date('Invalid start date').optional(),
        expiry_date: z.coerce.date('Invalid expiry date').optional(),
        status: statusSchema.optional(),
    })
    // ===== CROSS-FIELD VALIDATIONS (for updates) =====
    .refine(
        (data) => {
            // If setting type to 'percent', max_discount_amount must be provided
            if (data.type === 'percent' && !data.max_discount_amount) {
                return false;
            }
            return true;
        },
        {
            message: 'max_discount_amount is required when changing type to percent',
            path: ['max_discount_amount'],
        }
    )
    .refine(
        (data) => {
            // If both dates are provided, expiry_date must be after started_at
            if (data.started_at && data.expiry_date) {
                return data.started_at < data.expiry_date;
            }
            return true;
        },
        {
            message: 'Expiry date must be after start date',
            path: ['expiry_date'],
        }
    )
    .refine(
        (data) => {
            // If both limits are provided
            if (data.usage_limit && data.usage_per_user_limit) {
                return data.usage_limit >= data.usage_per_user_limit;
            }
            return true;
        },
        {
            message: 'Usage limit must be >= usage per user limit',
            path: ['usage_limit'],
        }
    );

// ===== VALIDATE DISCOUNT (Customer applies code) =====

const validateDiscountSchema = z.object({
    code: z
        .string()
        .min(1, 'Discount code is required')
        .transform((val) => val.toUpperCase().trim()),

    cartSubtotal: z
        .number()
        .positive('Cart subtotal must be positive')
        .describe('Cart subtotal before discount (in VND)'),

    // Optional: cart items for filtering by variant/product
    cartItems: z
        .array(
            z.object({
                _id: z.string(),
                product_id: objectIdSchema,
                variant_id: objectIdSchema,
                unit_id: objectIdSchema,
                category_id: objectIdSchema.optional(),
                sku: z.string(),
                quantity: z.number().min(1),
                pack_size: z.number().min(1),
                price_at_added: z.number().min(0),
                line_total: z.number().min(0),
            })
        )
        .optional()
        .default([]),
});

// ===== BULK CREATE SCHEMA (CSV import) =====

const bulkCreateItemSchema = z.object({
    code: codeSchema,
    type: typeSchema,
    value: z.number().min(0),
    max_discount_amount: z.number().min(0).optional().nullable(),
    application_strategy: applicationStrategySchema.optional(),
    min_order_value: z.number().min(0).optional(),
    usage_limit: z.number().min(1).int(),
    usage_per_user_limit: z.number().min(1).int(),
    is_stackable: z.boolean().optional(),
    stack_priority: z.number().int().optional(),
    started_at: z.coerce.date().optional(),
    expiry_date: z.coerce.date().optional(),
    status: statusSchema.optional(),
});

const bulkCreateSchema = z.array(bulkCreateItemSchema).min(1, 'At least 1 discount required');

// ===== QUERY PARAMETER SCHEMAS (for list/search) =====

const listDiscountsQuerySchema = z.object({
    page: z.coerce
        .number()
        .int()
        .min(1, 'Page must be >= 1')
        .default(1),

    limit: z.coerce
        .number()
        .int()
        .min(1, 'Limit must be >= 1')
        .max(100, 'Limit must be <= 100')
        .default(20),

    status: statusSchema.optional(),
    type: typeSchema.optional(),
    search: z.string().optional().describe('Search by code'),
    sortBy: z
        .enum(['created_at', 'expiry_date', 'usage_count', '-created_at', '-expiry_date'])
        .optional()
        .default('-created_at'),
});

// ===== PATH PARAMETER SCHEMAS =====

const getDiscountParamSchema = z.object({
    id: objectIdSchema.describe('Discount ID'),
});

const updateDiscountParamSchema = z.object({
    id: objectIdSchema.describe('Discount ID'),
});

const deleteDiscountParamSchema = z.object({
    id: objectIdSchema.describe('Discount ID'),
});

// ===== EXPORT ALL SCHEMAS =====

module.exports = {
    // Create/Update
    createDiscountSchema,
    updateDiscountSchema,

    // Validate (customer)
    validateDiscountSchema,

    // Bulk
    bulkCreateSchema,
    bulkCreateItemSchema,

    // Query parameters
    listDiscountsQuerySchema,

    // Path parameters
    getDiscountParamSchema,
    updateDiscountParamSchema,
    deleteDiscountParamSchema,

    // Base schemas (for composition)
    codeSchema,
    typeSchema,
    applicationStrategySchema,
    applicableTargetsTypeSchema,
    userEligibilityTypeSchema,
    statusSchema,
    objectIdSchema,
    applicableTargetsSchema,
    userEligibilitySchema,
};
