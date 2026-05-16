const { z } = require('zod');
const mongoose = require('mongoose');

const objectIdSchema = z.string().refine(
    (val) => mongoose.Types.ObjectId.isValid(val),
    { message: 'Invalid MongoDB ObjectId' }
);

const objectIdOptionalSchema = objectIdSchema.optional().nullable();

const ItemIdParamSchema = z.object({
    itemId: objectIdSchema,
});

const SessionParamSchema = z.object({
    sessionKey: z.string().uuid(),
});

const sessionKeySchema = z.string().uuid().optional().nullable();

const skuSchema = z.string().min(3).max(50).regex(/^[A-Z0-9\-]+$/).toUpperCase();

const promoCodeSchema = z.string().min(3).max(20).regex(/^[A-Z0-9\-]+$/).toUpperCase();

const priceSchema = z.number().int().min(0).max(999999999);

const quantitySchema = z.number().int().min(1).max(999);

const addToCartItemBodySchema = z.object({
    product_id: objectIdSchema,
    variant_id: objectIdSchema,
    unit_id: objectIdSchema,
    quantity: quantitySchema,
}).strict();

const updateCartItemBodySchema = z.object({
    quantity: quantitySchema,
});

const applyDiscountBodySchema = z.object({
    code: promoCodeSchema,
});

const mergeCartBodySchema = z.object({
    session_key: sessionKeySchema,
}).strict();

const clearCartQuerySchema = z.object({
    keep_discount: z.string().transform(v => v === 'true').default('false'),
});

const createGuestCartBodySchema = z.object({
    session_key: z.string().uuid().optional(),
}).strict();

const getCartQuerySchema = z.object({
    include_items: z.string().transform(v => v === 'true').default('true'),
    format: z.enum(['summary', 'detail', 'checkout']).default('summary'),
});

module.exports = {
    ItemIdParamSchema,
    SessionParamSchema,

    addToCartItemBodySchema,
    updateCartItemBodySchema,
    applyDiscountBodySchema,
    mergeCartBodySchema,
    createGuestCartBodySchema,

    getCartQuerySchema,
    clearCartQuerySchema,

    objectIdSchema,
    objectIdOptionalSchema,
    sessionKeySchema,
    skuSchema,
    promoCodeSchema,
    priceSchema,
    quantitySchema,
};
