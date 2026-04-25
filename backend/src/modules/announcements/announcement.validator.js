const { z } = require('zod');

/**
 * ============================================
 * ANNOUNCEMENT VALIDATORS (Zod Schemas)
 * ============================================
 *
 * ✅ Validate request bodies before controller logic
 * ✅ Enforce business rules (end_at > start_at)
 * ✅ Clear error messages for frontend
 * ✅ Support partial updates (no .partial() with .refine() issue)
 *
 * Field Rules:
 * - title: 5-200 chars
 * - content: 10-5000 chars
 * - priority: 0-10
 * - target: 'all' | 'user' | 'admin' | 'guest'
 * - type: 'info' | 'warning' | 'promotion' | 'system' | 'urgent'
 * - is_dismissible: boolean (optional, default true)
 * - start_at, end_at: ISO 8601 datetime
 *   - end_at MUST be > start_at (enforced by refine)
 */

// ===== BASE SCHEMA (WITHOUT REFINEMENT) =====

/**
 * Base schema (can be used with .partial())
 */
const announcementBaseSchema = z
    .object({
        title: z
            .string()
            .min(5, 'Title must be at least 5 characters')
            .max(200, 'Title must be at most 200 characters')
            .trim(),

        content: z
            .string()
            .min(10, 'Content must be at least 10 characters')
            .max(5000, 'Content must be at most 5000 characters'),

        priority: z
            .number()
            .int('Priority must be integer')
            .min(0, 'Priority must be >= 0')
            .max(10, 'Priority must be <= 10')
            .optional()
            .default(0),

        target: z
            .enum(['all', 'user', 'admin', 'guest'], {
                errorMap: () => ({
                    message: 'Target must be one of: all, user, admin, guest'
                })
            })
            .optional()
            .default('all'),

        type: z
            .enum(['info', 'warning', 'promotion', 'system', 'urgent'], {
                errorMap: () => ({
                    message:
                        'Type must be one of: info, warning, promotion, system, urgent'
                })
            })
            .optional()
            .default('info'),

        start_at: z
            .string()
            .datetime('Invalid datetime format (use ISO 8601)')
            .transform((val) => new Date(val)),

        end_at: z
            .string()
            .datetime('Invalid datetime format (use ISO 8601)')
            .transform((val) => new Date(val)),

        is_dismissible: z
            .boolean()
            .optional()
            .default(true)
    })
    .strict();

// ===== CREATE SCHEMA =====

/**
 * POST /api/v1/announcements
 * Create announcement
 *
 * ✅ All fields required (except optional ones)
 * ✅ Enforces end_at > start_at
 */
const createAnnouncementSchema = announcementBaseSchema.refine(
    (data) => data.end_at > data.start_at,
    {
        message: 'end_at must be after start_at',
        path: ['end_at']
    }
);

// ===== UPDATE SCHEMA =====

/**
 * PUT /api/v1/announcements/:id
 * Update announcement (partial)
 *
 * ✅ All fields optional
 * ✅ Conditional: only validate end_at > start_at if both dates provided
 */
const updateAnnouncementSchema = announcementBaseSchema
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
    createAnnouncementSchema,
    updateAnnouncementSchema,

    // Base schema (for reuse in other modules if needed)
    announcementBaseSchema
};