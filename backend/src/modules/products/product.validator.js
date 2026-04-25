const { z } = require('zod');
const mongoose = require('mongoose');

/**
 * Custom Zod validator cho MongoDB ObjectId
 */
const objectIdSchema = z
    .string()
    .refine(
        (val) => mongoose.Types.ObjectId.isValid(val),
        { message: 'Invalid MongoDB ObjectId' }
    );

const objectIdOptionalSchema = z
    .string()
    .refine(
        (val) => mongoose.Types.ObjectId.isValid(val),
        { message: 'Invalid MongoDB ObjectId' }
    )
    .optional()
    .nullable();

/**
 * ✅ Image schema (nested in product)
 */
const imageSchema = z.object({
    url: z
        .string()
        .url('Image URL must be a valid URL')
        .trim(),
    alt: z
        .string()
        .max(200, 'Alt text must not exceed 200 characters')
        .optional(),
    is_primary: z.boolean().default(false),
    sort_order: z.number().int().nonnegative().default(0),
});

/**
 * CREATE Product Schema
 * 
 * ✅ Require:
 * - name (2-200 chars)
 * - category_id (valid MongoDB ObjectId)
 * - short_description (max 500)
 * 
 * ✅ Optional:
 * - slug (auto-generated if not provided)
 * - brand
 * - description
 * - images
 * - search_keywords (max 10)
 */
const createProductSchema = z.object({
    name: z
        .string()
        .min(2, 'Product name must be at least 2 characters')
        .max(200, 'Product name must not exceed 200 characters')
        .trim(),

    slug: z
        .string()
        .regex(
            /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
            'Slug must be lowercase alphanumeric with hyphens'
        )
        .toLowerCase()
        .optional(),

    category_id: objectIdSchema.refine(
        (id) => {
            // ✅ Later: verify category exists
            // For now, just validate ObjectId format
            return mongoose.Types.ObjectId.isValid(id);
        },
        { message: 'Category ID must be a valid MongoDB ObjectId' }
    ),

    brand: z
        .string()
        .max(100, 'Brand must not exceed 100 characters')
        .optional(),

    short_description: z
        .string()
        .max(500, 'Short description must not exceed 500 characters')
        .optional(),

    description: z
        .string()
        .max(2000, 'Description must not exceed 2000 characters')
        .optional(),

    // ✅ Images with validation
    images: z
        .array(imageSchema)
        .default([])
        .refine(
            (images) => {
                // Check: only 1 is_primary
                const primaryCount = images.filter(
                    (img) => img.is_primary
                ).length;
                return primaryCount <= 1;
            },
            { message: 'Only one image can be primary' }
        ),

    // ✅ SEO keywords
    search_keywords: z
        .array(z.string().trim())
        .max(10, 'Maximum 10 search keywords')
        .default([]),

    // ✅ Status
    status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

/**
 * UPDATE Product Schema
 * 
 * ✅ All fields optional (partial update)
 * ✅ Keep same validations as create
 */
const updateProductSchema = z.object({
    name: z
        .string()
        .min(2, 'Product name must be at least 2 characters')
        .max(200, 'Product name must not exceed 200 characters')
        .trim()
        .optional(),

    slug: z
        .string()
        .regex(
            /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
            'Slug must be lowercase alphanumeric with hyphens'
        )
        .toLowerCase()
        .optional(),

    category_id: objectIdOptionalSchema,

    brand: z
        .string()
        .max(100, 'Brand must not exceed 100 characters')
        .optional(),

    short_description: z
        .string()
        .max(500, 'Short description must not exceed 500 characters')
        .optional(),

    description: z
        .string()
        .max(2000, 'Description must not exceed 2000 characters')
        .optional(),

    images: z
        .array(imageSchema)
        .optional()
        .refine(
            (images) => {
                if (!images) return true;
                const primaryCount = images.filter(
                    (img) => img.is_primary
                ).length;
                return primaryCount <= 1;
            },
            { message: 'Only one image can be primary' }
        ),

    search_keywords: z
        .array(z.string().trim())
        .max(10, 'Maximum 10 search keywords')
        .optional(),

    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

/**
 * GET All Products - Query Filters Schema
 * 
 * ✅ Filtering:
 * - category_id
 * - min_price, max_price
 * - status
 * - search (text search)
 * 
 * ✅ Pagination:
 * - page (1-indexed, default 1)
 * - limit (default 20)
 * 
 * ✅ Sorting:
 * - sortBy: popular | rating | price_asc | price_desc | newest
 */
const getProductsSchema = z.object({
    page: z
        .string()
        .transform((v) => parseInt(v, 10))
        .refine((v) => v >= 1, 'Page must be >= 1')
        .default('1'),

    limit: z
        .string()
        .transform((v) => parseInt(v, 10))
        .refine((v) => v > 0 && v <= 100, 'Limit must be between 1-100')
        .default('20'),

    category_id: objectIdOptionalSchema,

    min_price: z
        .string()
        .transform((v) => (v ? parseInt(v, 10) : undefined))
        .refine((v) => v === undefined || v >= 0, 'Min price must be >= 0')
        .optional(),

    max_price: z
        .string()
        .transform((v) => (v ? parseInt(v, 10) : undefined))
        .refine((v) => v === undefined || v >= 0, 'Max price must be >= 0')
        .optional(),

    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),

    search: z
        .string()
        .max(100, 'Search query must not exceed 100 characters')
        .optional(),

    sortBy: z
        .enum(['popular', 'rating', 'price_asc', 'price_desc', 'newest'])
        .default('newest'),
});

/**
 * Search Products Schema
 * 
 * ✅ Text search with optional limit
 */
const searchProductsSchema = z.object({
    q: z
        .string()
        .min(2, 'Search query must be at least 2 characters')
        .max(100, 'Search query must not exceed 100 characters')
        .trim(),

    limit: z
        .string()
        .transform((v) => parseInt(v, 10))
        .refine((v) => v > 0 && v <= 50, 'Limit must be between 1-50')
        .default('20'),
});

/**
 * Get Products by Category Schema
 * 
 * ✅ Filter by category + optional limit
 */
const getProductsByCategorySchema = z.object({
    categoryId: objectIdSchema,

    limit: z
        .string()
        .transform((v) => parseInt(v, 10))
        .refine((v) => v > 0 && v <= 100, 'Limit must be between 1-100')
        .default('50'),
});

module.exports = {
    createProductSchema,
    updateProductSchema,
    getProductsSchema,
    searchProductsSchema,
    getProductsByCategorySchema,
};