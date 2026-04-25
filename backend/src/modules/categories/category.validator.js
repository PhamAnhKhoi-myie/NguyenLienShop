const { z } = require('zod');
const mongoose = require('mongoose');

// Custom Zod validator cho MongoDB ObjectId
const objectIdSchema = z
    .string()
    .refine(
        (val) => mongoose.Types.ObjectId.isValid(val),
        { message: 'Invalid MongoDB ObjectId' }
    )
    .optional()
    .nullable();

const createCategorySchema = z.object({
    name: z
        .string()
        .min(2, 'Category name must be at least 2 characters')
        .max(100, 'Category name must not exceed 100 characters')
        .trim(),
    slug: z
        .string()
        .min(1, 'Slug is required')
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens')
        .toLowerCase(),
    description: z
        .string()
        .max(500, 'Description must not exceed 500 characters')
        .optional(),
    parent_id: objectIdSchema,
    status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
    icon_url: z.string().url().optional().nullable(),
    image_url: z.string().url().optional().nullable(),
    display_order: z.number().int().nonnegative().default(0),
});

const updateCategorySchema = z.object({
    name: z
        .string()
        .min(2, 'Category name must be at least 2 characters')
        .max(100, 'Category name must not exceed 100 characters')
        .trim()
        .optional(),
    slug: z
        .string()
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens')
        .toLowerCase()
        .optional(),
    description: z
        .string()
        .max(500, 'Description must not exceed 500 characters')
        .optional(),
    parent_id: objectIdSchema,
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
    icon_url: z.string().url().optional().nullable(),
    image_url: z.string().url().optional().nullable(),
    display_order: z.number().int().nonnegative().optional(),
});

const getCategoryTreeSchema = z.object({
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
    include_inactive: z.boolean().default(false),
});

module.exports = {
    createCategorySchema,
    updateCategorySchema,
    getCategoryTreeSchema,
};