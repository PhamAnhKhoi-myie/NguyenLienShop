const { z } = require('zod');
const mongoose = require('mongoose');

const objectIdSchema = z
    .string()
    .refine((value) => mongoose.Types.ObjectId.isValid(value), {
        message: 'Invalid ObjectId',
    });

const blogStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);

const slugSchema = z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format');

const thumbnailSchema = z
    .object({
        url: z.string().trim().url().optional().or(z.literal('')),
        public_id: z.string().trim().max(160).optional().or(z.literal('')),
        alt: z.string().trim().max(200).optional().or(z.literal('')),
    })
    .strict()
    .optional();

const seoSchema = z
    .object({
        meta_title: z.string().trim().max(160).optional().or(z.literal('')),
        meta_description: z.string().trim().max(300).optional().or(z.literal('')),
        keywords: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
    })
    .strict()
    .optional();

const createBlogBodySchema = z
    .object({
        title: z.string().trim().min(3).max(180),
        slug: slugSchema.optional(),
        excerpt: z.string().trim().min(10).max(500),
        content: z.string().trim().min(20).max(50000),
        thumbnail: thumbnailSchema,
        category: z.string().trim().max(100).optional().or(z.literal('')),
        tags: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
        status: blogStatusSchema.default('DRAFT'),
        seo: seoSchema,
    })
    .strict();

const updateBlogBodySchema = z
    .object({
        title: z.string().trim().min(3).max(180).optional(),
        slug: slugSchema.optional(),
        excerpt: z.string().trim().min(10).max(500).optional(),
        content: z.string().trim().min(20).max(50000).optional(),
        thumbnail: thumbnailSchema,
        category: z.string().trim().max(100).optional().or(z.literal('')),
        tags: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
        status: blogStatusSchema.optional(),
        seo: seoSchema,
    })
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
        message: 'At least one field should be provided',
    });

const idParamSchema = z.object({
    id: objectIdSchema,
}).strict();

const slugParamSchema = z.object({
    slug: slugSchema,
}).strict();

const categoryParamSchema = z.object({
    category: z.string().trim().min(1).max(100),
}).strict();

const publicBlogQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(12),
    category: z.string().trim().max(100).optional(),
    tag: z.string().trim().max(40).optional(),
    search: z.string().trim().max(100).optional(),
}).strict();

const adminBlogQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: blogStatusSchema.optional(),
    category: z.string().trim().max(100).optional(),
    tag: z.string().trim().max(40).optional(),
    search: z.string().trim().max(100).optional(),
}).strict();

module.exports = {
    createBlogBodySchema,
    updateBlogBodySchema,
    idParamSchema,
    slugParamSchema,
    categoryParamSchema,
    publicBlogQuerySchema,
    adminBlogQuerySchema,
};
