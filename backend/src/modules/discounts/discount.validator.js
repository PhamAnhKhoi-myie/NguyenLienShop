const { z } = require('zod');

/**
 * ===== BASE SCHEMAS =====
 */

const objectIdSchema = z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format');

const IdParamSchema = z.object({
    discountId: objectIdSchema,
});

const UserIdParamSchema = z.object({
    userId: objectIdSchema,
});

/**
 * ===== BASE FIELD SCHEMAS =====
 */

const codeSchema = z
    .string()
    .min(3)
    .max(20)
    .regex(/^[A-Z0-9_-]+$/)
    .transform((val) => val.toUpperCase().trim());

const typeSchema = z.enum(['percent', 'fixed']);

const applicationStrategySchema = z.enum([
    'apply_all',
    'apply_once',
    'apply_cheapest',
    'apply_most_expensive',
]);

const applicableTargetsTypeSchema = z.enum([
    'all',
    'specific_products',
    'specific_categories',
    'specific_variants',
]);

const userEligibilityTypeSchema = z.enum([
    'all',
    'first_time_only',
    'specific_users',
    'vip_users',
]);

const statusSchema = z.enum(['active', 'inactive', 'paused', 'expired']);

/**
 * ===== NESTED =====
 */

const applicableTargetsSchema = z.object({
    type: applicableTargetsTypeSchema.default('all'),
    product_ids: z.array(objectIdSchema).optional().default([]),
    category_ids: z.array(objectIdSchema).optional().default([]),
    variant_ids: z.array(objectIdSchema).optional().default([]),
});

const userEligibilitySchema = z.object({
    type: userEligibilityTypeSchema.default('all'),
    user_ids: z.array(objectIdSchema).optional().default([]),
    min_user_tier: z.enum(['bronze', 'silver', 'gold', 'platinum']).optional().nullable(),
});

/**
 * ===== BODY SCHEMAS =====
 */

const createDiscountBodySchema = z
    .object({
        code: codeSchema,
        type: typeSchema,
        value: z.number().min(0),
        max_discount_amount: z.number().min(0).optional().nullable(),

        application_strategy: applicationStrategySchema.default('apply_all'),

        applicable_targets: applicableTargetsSchema.optional(),
        user_eligibility: userEligibilitySchema.optional(),

        min_order_value: z.number().min(0).default(0),

        usage_limit: z.number().min(1).int(),
        usage_per_user_limit: z.number().min(1).int(),

        is_stackable: z.boolean().default(false),
        stack_priority: z.number().int().default(0),

        started_at: z.coerce.date(),
        expiry_date: z.coerce.date(),

        status: statusSchema.default('active'),
    })
    .refine(
        (d) => d.type !== 'percent' || !!d.max_discount_amount,
        { message: 'max_discount_amount is mandatory for percent discounts', path: ['max_discount_amount'] }
    )
    .refine(
        (d) => d.started_at < d.expiry_date,
        { message: 'Expiry date must be after start date', path: ['expiry_date'] }
    )
    .refine(
        (d) => d.usage_limit >= d.usage_per_user_limit,
        { message: 'Usage limit must be >= usage per user limit', path: ['usage_limit'] }
    )
    .refine(
        (d) => d.type !== 'fixed' || !d.max_discount_amount || d.max_discount_amount >= d.value,
        { message: 'For fixed discounts, max_discount_amount should be >= value', path: ['max_discount_amount'] }
    );

const updateDiscountBodySchema = z
    .object({
        code: codeSchema.optional(),
        type: typeSchema.optional(),
        value: z.number().min(0).optional(),
        max_discount_amount: z.number().min(0).optional().nullable(),

        application_strategy: applicationStrategySchema.optional(),
        applicable_targets: applicableTargetsSchema.optional(),
        user_eligibility: userEligibilitySchema.optional(),

        min_order_value: z.number().min(0).optional(),

        usage_limit: z.number().min(1).int().optional(),
        usage_per_user_limit: z.number().min(1).int().optional(),

        is_stackable: z.boolean().optional(),
        stack_priority: z.number().int().optional(),

        started_at: z.coerce.date().optional(),
        expiry_date: z.coerce.date().optional(),

        status: statusSchema.optional(),
    })
    .refine(
        (d) => !(d.type === 'percent' && !d.max_discount_amount),
        { message: 'max_discount_amount is required when changing type to percent', path: ['max_discount_amount'] }
    )
    .refine(
        (d) => !(d.started_at && d.expiry_date) || d.started_at < d.expiry_date,
        { message: 'Expiry date must be after start date', path: ['expiry_date'] }
    )
    .refine(
        (d) =>
            !(d.usage_limit && d.usage_per_user_limit) ||
            d.usage_limit >= d.usage_per_user_limit,
        { message: 'Usage limit must be >= usage per user limit', path: ['usage_limit'] }
    );

const validateDiscountBodySchema = z.object({
    code: z.string().min(1).transform((v) => v.toUpperCase().trim()),
    cartSubtotal: z.number().positive(),
    cartItems: z.array(
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
    ).optional().default([]),
});

const bulkCreateBodySchema = z.object({
    discounts: z.array(
        z.object({
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
        })
    ).min(1),
});

const duplicateDiscountBodySchema = z.object({
    newCode: codeSchema,
});

/**
 * ===== QUERY SCHEMAS =====
 */

const listDiscountsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: statusSchema.optional(),
    type: typeSchema.optional(),
    search: z.string().optional(),
    sortBy: z.enum([
        'created_at',
        'expiry_date',
        'usage_count',
        '-created_at',
        '-expiry_date',
    ]).default('-created_at'),
});

const nearExpiryQuerySchema = z.object({
    daysUntilExpiry: z.coerce.number().int().min(1).default(7),
});

/**
 * ===== EXPORT =====
 */

module.exports = {
    // params
    IdParamSchema,
    UserIdParamSchema,

    // body
    createDiscountBodySchema,
    updateDiscountBodySchema,
    validateDiscountBodySchema,
    bulkCreateBodySchema,
    duplicateDiscountBodySchema,

    // query
    listDiscountsQuerySchema,
    nearExpiryQuerySchema,

    // base
    objectIdSchema,
    codeSchema,
    typeSchema,
    applicationStrategySchema,
    applicableTargetsTypeSchema,
    userEligibilityTypeSchema,
    statusSchema,
    applicableTargetsSchema,
    userEligibilitySchema,
};