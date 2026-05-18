const { z } = require('zod');
const { isSafeBannerLink } = require('./banner-link.util');

/**
 * ============================================
 * BANNER VALIDATORS (Zod Schemas)
 * ============================================
 */

// ===== CUSTOM VALIDATORS (Reusable) =====

const imageUrlSchema = z
    .string()
    .min(1, 'Image URL is required')
    .url('Image URL must be valid')
    .startsWith('http', 'Image URL must be HTTP(S)');

const bannerLinkSchema = z
    .string()
    .min(1, 'Link is required')
    .refine(
        isSafeBannerLink,
        'Link must be URL (https://...), route (/product/...) or ID'
    );

const locationSchema = z.enum(
    ['homepage_top', 'homepage_middle', 'homepage_bottom', 'category_page'],
    {
        errorMap: () => ({
            message:
                'Location must be one of: homepage_top, homepage_middle, homepage_bottom, category_page'
        })
    }
);

const sortOrderSchema = z
    .number()
    .int('sort_order must be integer')
    .min(0, 'sort_order must be >= 0')
    .max(999, 'sort_order must be <= 999');

const dateTimeSchema = z
    .string()
    .datetime('Invalid datetime format (use ISO 8601)')
    .transform((val) => new Date(val));

const bannerIdParamSchema = z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format')
});

// ===== OBJECT SCHEMAS =====

const imageObjectSchema = z
    .object({
        url: imageUrlSchema,
        alt_text: z
            .string()
            .max(200, 'Alt text max 200 characters')
            .optional(),
        public_id: z.string().optional()
    })
    .strict();

const bannerBaseSchema = z
    .object({
        image: imageObjectSchema,
        link: bannerLinkSchema,
        location: locationSchema,
        sort_order: sortOrderSchema,
        start_at: dateTimeSchema,
        end_at: dateTimeSchema
    })
    .strict();

const createBannerSchema = bannerBaseSchema
    .refine(
        (data) => data.end_at > data.start_at,
        {
            message: 'end_at must be after start_at',
            path: ['end_at']
        }
    );

const updateBannerSchema = bannerBaseSchema
    .partial()
    .refine(
        (data) => {
            if (data.start_at && data.end_at) {
                return data.end_at > data.start_at;
            }
            return true;
        },
        {
            message: 'end_at must be after start_at',
            path: ['end_at']
        }
    );

module.exports = {
    bannerIdParamSchema,
    createBannerSchema,
    updateBannerSchema,

    imageUrlSchema,
    bannerLinkSchema,
    locationSchema,
    sortOrderSchema,
    dateTimeSchema,
    imageObjectSchema,
    bannerBaseSchema
};
