const { z } = require('zod');

const folderSchema = z
    .string()
    .trim()
    .min(1, 'folder is required')
    .max(120, 'folder max 120 characters')
    .regex(/^(?!.*\.\.)(?!\/)[a-zA-Z0-9/_-]+$/, 'Invalid folder format');

const publicIdSchema = z
    .string()
    .trim()
    .min(1, 'public_id is required')
    .max(160, 'public_id max 160 characters')
    .regex(/^(?!.*\.\.)(?!\/)[a-zA-Z0-9/_-]+$/, 'Invalid public_id format');

const tagSchema = z
    .string()
    .trim()
    .min(1)
    .max(40)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid tag format');

const cloudinarySignatureBodySchema = z
    .object({
        asset_type: z
            .enum(['product', 'banner', 'announcement', 'shop_info', 'avatar', 'misc'])
            .default('misc'),
        folder: folderSchema.optional(),
        public_id: publicIdSchema.optional(),
        tags: z.array(tagSchema).max(10).optional().default([]),
        overwrite: z.boolean().optional().default(false),
        invalidate: z.boolean().optional().default(true),
    })
    .strict();

const cloudinaryAvatarSignatureBodySchema = z
    .object({
        asset_type: z.literal('avatar').optional().default('avatar'),
        folder: z.literal('avatars').optional().default('avatars'),
        tags: z.array(tagSchema).max(10).optional().default(['avatar', 'user']),
        overwrite: z.boolean().optional().default(true),
        invalidate: z.boolean().optional().default(true),
    })
    .strict();

module.exports = {
    cloudinarySignatureBodySchema,
    cloudinaryAvatarSignatureBodySchema,
};
