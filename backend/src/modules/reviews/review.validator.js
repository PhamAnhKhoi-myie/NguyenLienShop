const { z } = require('zod');

// ✅ Create review schema
const createReviewSchema = z.object({
    product_id: z
        .string()
        .min(24, 'Invalid product ID')
        .max(24, 'Invalid product ID'),

    variant_id: z
        .string()
        .min(24, 'Invalid variant ID')
        .max(24, 'Invalid variant ID'),

    order_id: z
        .string()
        .min(24, 'Invalid order ID')
        .max(24, 'Invalid order ID'),

    rating: z
        .number()
        .int('Rating must be integer')
        .min(1, 'Rating must be at least 1')
        .max(5, 'Rating must be at most 5'),

    title: z
        .string()
        .max(200, 'Title must be at most 200 characters')
        .optional()
        .nullable(),

    content: z
        .string()
        .min(10, 'Review content must be at least 10 characters')
        .max(5000, 'Review content must be at most 5000 characters')
});

// ✅ Update review schema
const updateReviewSchema = z.object({
    rating: z
        .number()
        .int('Rating must be integer')
        .min(1, 'Rating must be at least 1')
        .max(5, 'Rating must be at most 5')
        .optional(),

    title: z
        .string()
        .max(200, 'Title must be at most 200 characters')
        .optional()
        .nullable(),

    content: z
        .string()
        .min(10, 'Review content must be at least 10 characters')
        .max(5000, 'Review content must be at most 5000 characters')
        .optional()
});

// ✅ Mark helpful schema
const markHelpfulSchema = z.object({
    helpful: z.boolean('Helpful must be true or false')
});

// ✅ Reject review schema (admin)
const rejectReviewSchema = z.object({
    reason: z
        .string()
        .min(5, 'Reason must be at least 5 characters')
        .max(500, 'Reason must be at most 500 characters')
});

// ✅ Flag review schema
const flagReviewSchema = z.object({
    reason: z.enum(
        ['spam', 'inappropriate', 'fake', 'duplicate', 'other'],
        {
            errorMap: () => ({
                message: 'Flag reason must be one of: spam, inappropriate, fake, duplicate, other'
            })
        }
    )
});

module.exports = {
    createReviewSchema,
    updateReviewSchema,
    markHelpfulSchema,
    rejectReviewSchema,
    flagReviewSchema
};