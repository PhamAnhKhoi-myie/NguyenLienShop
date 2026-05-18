const { z } = require('zod');

const objectIdString = z
    .string()
    .regex(/^[0-9a-f]{24}$/i, { message: 'Invalid ObjectId format' });

const createNotificationSchema = z.object({
    user_id: objectIdString,

    type: z.enum(['order', 'system', 'promotion'], {
        errorMap: () => ({ message: 'Type must be: order, system, or promotion' })
    }),

    title: z
        .string()
        .min(1, 'Title is required')
        .max(200, 'Title max 200 chars'),

    message: z
        .string()
        .min(1, 'Message is required')
        .max(1000, 'Message max 1000 chars'),

    data: z
        .object({
            ref_type: z
                .enum(['order', 'payment', 'discount', 'product'])
                .optional(),

            ref_id: objectIdString.optional(),

            extra: z.record(z.any()).optional()
        })
        .optional(),

    priority: z
        .enum(['low', 'medium', 'high'])
        .default('low'),

    expire_at: z
        .string()
        .datetime()
        .transform((val) => new Date(val))
        .optional()
});

const getNotificationsSchema = z.object({
    page: z
        .coerce.number()
        .int('Page must be positive integer')
        .min(1, 'Page must be positive integer')
        .default(1),

    limit: z
        .coerce.number()
        .int('Limit must be positive integer')
        .min(1, 'Limit between 1-100')
        .max(100, 'Limit between 1-100')
        .default(10),

    type: z
        .enum(['order', 'system', 'promotion'])
        .optional(),

    priority: z
        .enum(['low', 'medium', 'high'])
        .optional(),

    unread_only: z
        .enum(['true', 'false'])
        .transform((val) => val === 'true')
        .default(false)
});

const markAsReadSchema = z.object({
    notificationId: objectIdString
});

const markBulkAsReadSchema = z.object({
    notification_ids: z
        .array(objectIdString)
        .min(1, 'At least 1 notification_id required')
        .max(100, 'Max 100 at once')
});

const deleteNotificationSchema = z.object({
    notificationId: objectIdString
});

module.exports = {
    createNotificationSchema,
    getNotificationsSchema,
    markAsReadSchema,
    markBulkAsReadSchema,
    deleteNotificationSchema
};
