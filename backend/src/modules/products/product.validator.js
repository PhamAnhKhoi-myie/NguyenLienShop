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

const createProductSchema = z.object({
    name: z.string().min(2).max(200).trim(),

    slug: z
        .string()
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
        .toLowerCase()
        .optional(),

    category_id: objectIdSchema,

    brand: z.string().max(100).optional(),

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
});

const updateProductSchema = z.object({
    name: z.string().min(2).max(200).trim().optional(),

    slug: z
        .string()
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
        .toLowerCase()
        .optional(),

    category_id: objectIdOptionalSchema,

    brand: z.string().max(100).optional(),

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
