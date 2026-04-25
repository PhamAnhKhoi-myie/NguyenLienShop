const { z } = require('zod');

/**
 * ============================================
 * BANNER VALIDATORS (Zod Schemas)
 * ============================================
 *
 * ✅ Validate request bodies before controller logic
 * ✅ Enforce business rules (end_at > start_at)
 * ✅ Clear error messages for frontend
 * ✅ Support partial updates (no .partial() with .refine() issue)
 *
 * Field Rules:
 * - image.url: MUST be HTTP(S) URL (CDN)
 * - image.alt_text: Optional, max 200 chars (SEO)
 * - image.public_id: Optional, for Cloudinary/S3 deletion
 * - link: URL, route or ID
 * - location: Predefined locations only (4 options)
 * - sort_order: 0-999 within location
 * - start_at, end_at: ISO 8601 datetime
 *   - end_at MUST be > start_at (enforced by refine)
 */

// ===== CUSTOM VALIDATORS (Reusable) =====

/**
 * ✅ Image URL validator
 */
const imageUrlSchema = z
    .string()
    .min(1, 'Image URL is required')
    .url('Image URL must be valid')
    .startsWith('http', 'Image URL must be HTTP(S)');

/**
 * ✅ Banner link validator
 * Accept: URL, route (/) or ID
 */
const bannerLinkSchema = z
    .string()
    .min(1, 'Link is required')
    .refine(
        (val) => /^(https?:\/\/|\/|[a-zA-Z0-9\-_]+)/.test(val),
        'Link must be URL (https://...), route (/product/...) or ID'
    );

/**
 * ✅ Location enum
 */
const locationSchema = z.enum(
    ['homepage_top', 'homepage_middle', 'homepage_bottom', 'category_page'],
    {
        errorMap: () => ({
            message:
                'Location must be one of: homepage_top, homepage_middle, homepage_bottom, category_page'
        })
    }
);

/**
 * ✅ Sort order validator
 */
const sortOrderSchema = z
    .number()
    .int('sort_order must be integer')
    .min(0, 'sort_order must be >= 0')
    .max(999, 'sort_order must be <= 999');

/**
 * ✅ DateTime validator (ISO 8601)
 */
const dateTimeSchema = z
    .string()
    .datetime('Invalid datetime format (use ISO 8601)')
    .transform((val) => new Date(val));

// ===== OBJECT SCHEMAS =====

/**
 * Image object validator
 */
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

/**
 * Base schema (WITHOUT refinement)
 * ✅ Can be used with .partial()
 */
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

/**
 * POST /api/v1/banners
 * Create banner
 *
 * ✅ All fields required (except optional image fields)
 * ✅ Enforces end_at > start_at
 */
const createBannerSchema = bannerBaseSchema
    .refine(
        (data) => data.end_at > data.start_at,
        {
            message: 'end_at must be after start_at',
            path: ['end_at']
        }
    );

/**
 * PUT /api/v1/banners/:id
 * Update banner (partial)
 *
 * ✅ All fields optional
 * ✅ Conditional: only validate end_at > start_at if both dates provided
 */
const updateBannerSchema = bannerBaseSchema
    .partial()
    .refine(
        (data) => {
            // Only check if both dates provided
            if (data.start_at && data.end_at) {
                return data.end_at > data.start_at;
            }
            return true; // Skip validation if dates not fully provided
        },
        {
            message: 'end_at must be after start_at',
            path: ['end_at']
        }
    );

module.exports = {
    // Main schemas (use these in routes)
    createBannerSchema,
    updateBannerSchema,

    // Custom validators (for reuse in other modules if needed)
    imageUrlSchema,
    bannerLinkSchema,
    locationSchema,
    sortOrderSchema,
    dateTimeSchema,
    imageObjectSchema,
    bannerBaseSchema
};