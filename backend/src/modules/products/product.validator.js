const { z } = require('zod');
const mongoose = require('mongoose');

const objectIdSchema = z.string().refine(
    (val) => mongoose.Types.ObjectId.isValid(val),
    { message: 'Invalid MongoDB ObjectId' }
);

const objectIdOptionalSchema = objectIdSchema.optional().nullable();

const productIdParamSchema = z.object({
    productId: objectIdSchema
});

const categoryIdParamSchema = z.object({
    categoryId: objectIdSchema
});

const imageSchema = z.object({
    url: z.string().url('Image URL must be a valid URL').trim(),
    alt: z.string().max(200).optional(),
    is_primary: z.boolean().default(false),
    sort_order: z.number().int().nonnegative().default(0),
});

const productTypeSchema = z.enum(['SIMPLE', 'VARIABLE']);

const simpleUnitTypeSchema = z.enum(['UNIT', 'PACK', 'BOX', 'CARTON']);

const optionalPositiveIntSchema = z.preprocess(
    (value) => (value === '' ? null : value),
    z.coerce.number().int().positive().nullable().optional()
);

const simpleProductFields = {
    simple_unit_type: simpleUnitTypeSchema.default('PACK'),
    simple_unit_display_name: z.string().trim().max(100).optional(),
    simple_pack_size: z.coerce.number().int().positive().default(1),
    simple_price: z.coerce.number().int().nonnegative().optional(),
    simple_stock: z.coerce.number().int().nonnegative().default(0),
    simple_min_order_qty: z.coerce.number().int().positive().default(1),
    simple_max_order_qty: optionalPositiveIntSchema,
    simple_qty_step: z.coerce.number().int().positive().default(1),
};

function validateSimpleProductFields(values, ctx) {
    if (values.product_type !== 'SIMPLE') {
        return;
    }

    if (!values.simple_unit_display_name?.trim()) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['simple_unit_display_name'],
            message: 'Simple product unit display name is required',
        });
    }

    if (!Number.isInteger(values.simple_price) || values.simple_price <= 0) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['simple_price'],
            message: 'Simple product price must be greater than 0',
        });
    }

    if (
        values.simple_max_order_qty &&
        values.simple_max_order_qty < values.simple_min_order_qty
    ) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['simple_max_order_qty'],
            message: 'Simple product max order quantity must be >= min order quantity',
        });
    }
}

const createProductSchema = z.object({
    name: z.string().min(2).max(200).trim(),

    slug: z
        .string()
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
        .toLowerCase()
        .optional(),

    category_id: objectIdSchema,

    brand: z.string().max(100).optional(),

    product_type: productTypeSchema.default('VARIABLE'),

    short_description: z.string().max(500).optional(),

    description: z.string().max(2000).optional(),

    images: z
        .array(imageSchema)
        .default([])
        .refine(
            (images) => images.filter((i) => i.is_primary).length <= 1,
            { message: 'Only one image can be primary' }
        ),

    search_keywords: z
        .array(z.string().trim())
        .max(10)
        .default([]),

    is_best_seller: z.boolean().default(false),

    new_until: z.coerce.date().nullable().optional(),

    status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),

    ...simpleProductFields,
}).superRefine(validateSimpleProductFields);

const updateProductSchema = z.object({
    name: z.string().min(2).max(200).trim().optional(),

    slug: z
        .string()
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
        .toLowerCase()
        .optional(),

    category_id: objectIdOptionalSchema,

    brand: z.string().max(100).optional(),

    product_type: productTypeSchema.optional(),

    short_description: z.string().max(500).optional(),

    description: z.string().max(2000).optional(),

    images: z
        .array(imageSchema)
        .optional()
        .refine(
            (images) =>
                !images ||
                images.filter((i) => i.is_primary).length <= 1,
            { message: 'Only one image can be primary' }
        ),

    search_keywords: z.array(z.string().trim()).max(10).optional(),

    is_best_seller: z.boolean().optional(),

    new_until: z.coerce.date().nullable().optional(),

    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),

    simple_unit_type: simpleUnitTypeSchema.optional(),
    simple_unit_display_name: z.string().trim().max(100).optional(),
    simple_pack_size: z.coerce.number().int().positive().optional(),
    simple_price: z.coerce.number().int().nonnegative().optional(),
    simple_stock: z.coerce.number().int().nonnegative().optional(),
    simple_min_order_qty: z.coerce.number().int().positive().optional(),
    simple_max_order_qty: optionalPositiveIntSchema,
    simple_qty_step: z.coerce.number().int().positive().optional(),
}).superRefine((values, ctx) => {
    if (values.product_type === 'SIMPLE') {
        validateSimpleProductFields(values, ctx);
    }

    if (
        values.simple_max_order_qty &&
        values.simple_min_order_qty &&
        values.simple_max_order_qty < values.simple_min_order_qty
    ) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['simple_max_order_qty'],
            message: 'Simple product max order quantity must be >= min order quantity',
        });
    }
});

const getProductsSchema = z.object({
    page: z.coerce
        .number()
        .int()
        .min(1)
        .default(1),

    limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(100)
        .default(20),

    category_id: objectIdOptionalSchema,

    min_price: z.coerce
        .number()
        .int()
        .nonnegative()
        .optional(),

    max_price: z.coerce
        .number()
        .int()
        .nonnegative()
        .optional(),

    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),

    badge: z
        .enum(['new', 'best_seller', 'on_sale', 'in_stock'])
        .optional(),

    search: z.string().max(100).optional(),

    bag_type: z.string().trim().max(100).optional(),

    sortBy: z
        .enum(['popular', 'rating', 'price_asc', 'price_desc', 'newest'])
        .default('newest'),
});

const searchProductsSchema = z.object({
    q: z.string().min(2).max(100).trim(),

    limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(50)
        .default(20),
});

const getProductsByCategoryQuerySchema = z.object({
    limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(100)
        .default(50),
});

module.exports = {
    createProductSchema,
    updateProductSchema,
    getProductsSchema,
    searchProductsSchema,
    getProductsByCategoryQuerySchema,
    productIdParamSchema,
    categoryIdParamSchema
};
