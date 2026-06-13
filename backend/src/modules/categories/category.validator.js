const { z } = require('zod');


const objectIdSchema = z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');


const categoryIdParamSchema = z.object({
    categoryId: objectIdSchema,
});

const slugParamSchema = z.object({
    slug: z.string().min(1),
});


const getCategoryTreeQuerySchema = z.object({
    include_inactive: z.coerce.boolean().default(false),
});

const getCategoryDescendantsQuerySchema = z.object({
    include_inactive: z.coerce.boolean().default(false),
});

const getAllCategoriesQuerySchema = z.object({
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
    parent_id: objectIdSchema.optional().nullable(),
});


const createCategoryBodySchema = z.object({
    name: z.string().min(2).max(100).trim(),
    slug: z
        .string()
        .min(1)
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
        .toLowerCase(),
    description: z.string().max(500).optional(),
    parent_id: objectIdSchema.optional().nullable(),
    status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
    icon_url: z.string().url().optional().nullable(),
    image_url: z.string().url().optional().nullable(),
    display_order: z.coerce.number().int().nonnegative().default(0),
});

const updateCategoryBodySchema = z.object({
    name: z.string().min(2).max(100).trim().optional(),
    slug: z
        .string()
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
        .toLowerCase()
        .optional(),
    description: z.string().max(500).optional(),
    parent_id: objectIdSchema.optional().nullable(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
    icon_url: z.string().url().optional().nullable(),
    image_url: z.string().url().optional().nullable(),
    display_order: z.coerce.number().int().nonnegative().optional(),
});

module.exports = {
    objectIdSchema,
    categoryIdParamSchema,
    slugParamSchema,
    getCategoryTreeQuerySchema,
    getCategoryDescendantsQuerySchema,
    getAllCategoriesQuerySchema,
    createCategoryBodySchema,
    updateCategoryBodySchema,
};