const { z } = require('zod');
const mongoose = require('mongoose');

const objectIdSchema = z.string().refine(
    (val) => mongoose.Types.ObjectId.isValid(val),
    { message: 'Invalid MongoDB ObjectId' }
);

const reviewIdParamSchema = z.object({
    reviewId: objectIdSchema
});

const productIdParamSchema = z.object({
    productId: objectIdSchema
});

const variantIdParamSchema = z.object({
    variantId: objectIdSchema
});

const createReviewSchema = z.object({
    product_id: objectIdSchema,

    variant_id: objectIdSchema,

    order_id: objectIdSchema,

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
        .max(5000, 'Review content must be at most 5000 characters')
        .optional()
        .nullable()
});

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
        .max(5000, 'Review content must be at most 5000 characters')
        .optional()
        .nullable()
});

const markHelpfulSchema = z.object({
    helpful: z.boolean({
        required_error: 'Helpful must be true or false',
        invalid_type_error: 'Helpful must be true or false'
    })
});

const rejectReviewSchema = z.object({
    reason: z
        .string()
        .min(5, 'Reason must be at least 5 characters')
        .max(500, 'Reason must be at most 500 characters')
});

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
    reviewIdParamSchema,
    productIdParamSchema,
    variantIdParamSchema,
    createReviewSchema,
    updateReviewSchema,
    markHelpfulSchema,
    rejectReviewSchema,
    flagReviewSchema
};
