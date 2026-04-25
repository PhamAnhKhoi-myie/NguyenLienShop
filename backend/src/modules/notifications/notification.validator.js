const { z } = require('zod');

// ✅ ObjectId validator (reusable)
const objectIdString = z
    .string()
    .regex(/^[0-9a-f]{24}$/i, { message: 'Invalid ObjectId format' });

// ✅ Create notification (admin/system use)
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

// ✅ Get notifications (with filters)
const getNotificationsSchema = z.object({
    page: z
        .string()
        .regex(/^\d+$/, 'Page must be positive integer')
        .transform(Number)
        .default('1'),

    limit: z
        .string()
        .regex(/^\d+$/, 'Limit must be positive integer')
        .transform(Number)
        .default('10')
        .refine((val) => val >= 1 && val <= 100, 'Limit between 1-100'),

    type: z
        .enum(['order', 'system', 'promotion'])
        .optional(),

    priority: z
        .enum(['low', 'medium', 'high'])
        .optional(),

    unread_only: z
        .string()
        .transform((val) => val === 'true')
        .optional()
        .default('false')
});

// ✅ Mark as read (single)
const markAsReadSchema = z.object({
    notification_id: objectIdString
});

// ✅ Bulk mark as read
const markBulkAsReadSchema = z.object({
    notification_ids: z
        .array(objectIdString)
        .min(1, 'At least 1 notification_id required')
        .max(100, 'Max 100 at once')
});

// ✅ Delete notification (single)
const deleteNotificationSchema = z.object({
    notification_id: objectIdString
});

module.exports = {
    createNotificationSchema,
    getNotificationsSchema,
    markAsReadSchema,
    markBulkAsReadSchema,
    deleteNotificationSchema
};