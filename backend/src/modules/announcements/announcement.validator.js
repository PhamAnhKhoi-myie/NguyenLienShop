const { z } = require('zod');

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

const createAnnouncementSchema = announcementBaseSchema.refine(
    (data) => data.end_at > data.start_at,
    {
        message: 'end_at must be after start_at',
        path: ['end_at']
    }
);

// ===== UPDATE SCHEMA =====

const updateAnnouncementSchema = announcementBaseSchema
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
    createAnnouncementSchema,
    updateAnnouncementSchema,

    announcementBaseSchema
};