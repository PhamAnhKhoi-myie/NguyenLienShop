const { z } = require('zod');
const mongoose = require('mongoose');

/**
 * ===== BASE =====
 */

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

/**
 * ===== COMMON =====
 */

const sessionKeySchema = z.string().uuid().optional().nullable();

const skuSchema = z.string().min(3).max(50).regex(/^[A-Z0-9\-]+$/).toUpperCase();

const promoCodeSchema = z.string().min(3).max(20).regex(/^[A-Z0-9\-]+$/).toUpperCase();

const priceSchema = z.number().int().min(0).max(999999999);

const quantitySchema = z.number().int().min(1).max(999);

/**
 * ===== BODY =====
 */

const addToCartItemBodySchema = z.object({
    product_id: objectIdSchema,
    variant_id: objectIdSchema,
    unit_id: objectIdSchema,

    sku: skuSchema,

    variant_label: z.string().min(1).max(100).trim(),
    product_name: z.string().min(1).max(200).trim(),
    product_image: z.string().url().optional().nullable(),
    display_name: z.string().min(1).max(50).trim(),

    pack_size: z.number().int().min(1).max(10000),
    price_at_added: priceSchema,
    quantity: quantitySchema,
});

const updateCartItemBodySchema = z.object({
    quantity: quantitySchema,
});

const applyDiscountBodySchema = z.object({
    code: promoCodeSchema,
});

const mergeCartBodySchema = z.object({
    session_key: sessionKeySchema,
}).refine(
    (d) => d.session_key,
    { message: 'Session key is required', path: ['session_key'] }
);

const clearCartQuerySchema = z.object({
    keep_discount: z.string().transform(v => v === 'true').default('false'),
});

const createGuestCartBodySchema = z.object({
    session_key: z.string().uuid(),
});

/**
 * ===== QUERY =====
 */

const getCartQuerySchema = z.object({
    include_items: z.string().transform(v => v === 'true').default('true'),
    format: z.enum(['summary', 'detail', 'checkout']).default('summary'),
});

/**
 * ===== EXPORT =====
 */

module.exports = {
    // params
    ItemIdParamSchema,
    SessionParamSchema,

    // body
    addToCartItemBodySchema,
    updateCartItemBodySchema,
    applyDiscountBodySchema,
    mergeCartBodySchema,
    createGuestCartBodySchema,

    // query
    getCartQuerySchema,
    clearCartQuerySchema,

    // base
    objectIdSchema,
    objectIdOptionalSchema,
    sessionKeySchema,
    skuSchema,
    promoCodeSchema,
    priceSchema,
    quantitySchema,
};