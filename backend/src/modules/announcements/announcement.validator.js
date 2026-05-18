const { z } = require('zod');

const titleSchema = z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title must be at most 200 characters')
    .trim();

const contentSchema = z
    .string()
    .min(10, 'Content must be at least 10 characters')
    .max(5000, 'Content must be at most 5000 characters');

const prioritySchema = z
    .number()
    .int('Priority must be integer')
    .min(0, 'Priority must be >= 0')
    .max(10, 'Priority must be <= 10');

const targetSchema = z.enum(['all', 'user', 'admin', 'guest'], {
    errorMap: () => ({
        message: 'Target must be one of: all, user, admin, guest'
    })
});

const typeSchema = z.enum(['info', 'warning', 'promotion', 'system', 'urgent'], {
    errorMap: () => ({
        message: 'Type must be one of: info, warning, promotion, system, urgent'
    })
});

const dateTimeSchema = z
    .string()
    .datetime('Invalid datetime format (use ISO 8601)')
    .transform((val) => new Date(val));

const announcementIdParamSchema = z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format')
});

const announcementBaseSchema = z
    .object({
        title: titleSchema,
        content: contentSchema,
        priority: prioritySchema.optional().default(0),
        target: targetSchema.optional().default('all'),
        type: typeSchema.optional().default('info'),
        start_at: dateTimeSchema,
        end_at: dateTimeSchema,
        is_dismissible: z.boolean().optional().default(true)
    })
    .strict();

const createAnnouncementSchema = announcementBaseSchema.refine(
    (data) => data.end_at > data.start_at,
    {
        message: 'end_at must be after start_at',
        path: ['end_at']
    }
);

const updateAnnouncementSchema = z
    .object({
        title: titleSchema.optional(),
        content: contentSchema.optional(),
        priority: prioritySchema.optional(),
        target: targetSchema.optional(),
        type: typeSchema.optional(),
        start_at: dateTimeSchema.optional(),
        end_at: dateTimeSchema.optional(),
        is_dismissible: z.boolean().optional()
    })
    .strict()
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
    announcementIdParamSchema,
    createAnnouncementSchema,
    updateAnnouncementSchema,

    announcementBaseSchema
};
