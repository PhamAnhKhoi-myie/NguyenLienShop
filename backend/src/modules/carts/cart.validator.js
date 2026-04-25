const { z } = require('zod');
const mongoose = require('mongoose');

/**
 * ============================================
 * CART VALIDATORS (Zod Schemas)
 * ============================================
 * 
 * ✅ Validate request bodies before controller logic
 * ✅ Follow project conventions (snake_case fields, camelCase validation)
 * ✅ Provide clear Vietnamese + English error messages
 * ✅ Use custom refine() for cross-field validation
 */

// ===== CUSTOM VALIDATORS =====

/**
 * ✅ FIX #1: MongoDB ObjectId validator
 * Consistent pattern with category.validator.js
 */
const objectIdSchema = z
    .string()
    .refine(
        (val) => mongoose.Types.ObjectId.isValid(val),
        { message: 'Invalid MongoDB ObjectId' }
    );

const objectIdOptionalSchema = z
    .string()
    .refine(
        (val) => mongoose.Types.ObjectId.isValid(val),
        { message: 'Invalid MongoDB ObjectId' }
    )
    .optional()
    .nullable();

/**
 * ✅ FIX #2: UUID validator for session_key (guest cart)
 * Format: v4 UUID (36 chars with hyphens)
 */
const sessionKeySchema = z
    .string()
    .uuid({ message: 'Session key must be valid UUID v4' })
    .optional()
    .nullable();

/**
 * ✅ FIX #3: SKU validator
 * Format: uppercase alphanumeric + hyphens
 */
const skuSchema = z
    .string()
    .min(3, 'SKU must be at least 3 characters')
    .max(50, 'SKU must not exceed 50 characters')
    .regex(/^[A-Z0-9\-]+$/, 'SKU must be uppercase alphanumeric with hyphens')
    .toUpperCase();

/**
 * ✅ FIX #4: Promo code validator
 * Format: uppercase alphanumeric + hyphens
 */
const promoCodeSchema = z
    .string()
    .min(3, 'Promo code must be at least 3 characters')
    .max(20, 'Promo code must not exceed 20 characters')
    .regex(/^[A-Z0-9\-]+$/, 'Promo code must be uppercase alphanumeric')
    .toUpperCase();

/**
 * ✅ FIX #5: Price validator
 * Non-negative integer (in VND: 0 to 999,999,999)
 */
const priceSchema = z
    .number()
    .int('Price must be an integer')
    .min(0, 'Price cannot be negative')
    .max(999999999, 'Price exceeds maximum (999,999,999 VND)');

/**
 * ✅ FIX #6: Quantity validator (packs, not individual items)
 * 1 to 999 packs per item
 */
const quantitySchema = z
    .number()
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1')
    .max(999, 'Quantity cannot exceed 999 packs');

// ===== ADD TO CART SCHEMA =====

/**
 * ✅ POST /api/v1/carts/items
 * Add item to cart (or update quantity if exists)
 * 
 * Validates:
 * - product_id / variant_id / unit_id: ObjectIds
 * - sku, variant_label, product_name, product_image: denormalized data
 * - pack_size, price_at_added, quantity: pricing & quantity
 */
const addToCartItemSchema = z.object({
    // ===== RELATIONSHIPS =====
    product_id: objectIdSchema,
    variant_id: objectIdSchema,
    unit_id: objectIdSchema,

    // ===== DENORMALIZED PRODUCT INFO (from client) =====
    // ✅ Client sends this after fetching product details
    // Service will verify these match DB, then snapshot them
    sku: skuSchema,

    variant_label: z
        .string()
        .min(1, 'Variant label is required')
        .max(100, 'Variant label must not exceed 100 characters')
        .trim(),

    product_name: z
        .string()
        .min(1, 'Product name is required')
        .max(200, 'Product name must not exceed 200 characters')
        .trim(),

    product_image: z
        .string()
        .url('Product image must be valid URL')
        .optional()
        .nullable(),

    display_name: z
        .string()
        .min(1, 'Display name is required')
        .max(50, 'Display name must not exceed 50 characters')
        .trim(),
    // Example: "Gói 100", "Hộp 50"

    // ===== PRICING & QUANTITY =====
    pack_size: z
        .number()
        .int('Pack size must be an integer')
        .min(1, 'Pack size must be at least 1')
        .max(10000, 'Pack size cannot exceed 10,000'),
    // Number of items per pack (cái)

    price_at_added: priceSchema,
    // Price per pack (VND)

    quantity: quantitySchema,
    // Number of packs
});

// ===== UPDATE CART ITEM SCHEMA =====

/**
 * ✅ PATCH /api/v1/carts/items/:itemId
 * Update item quantity only
 * 
 * Note: Cannot update other fields (price_at_added is snapshot)
 */
const updateCartItemSchema = z.object({
    quantity: quantitySchema,
});

// ===== REMOVE CART ITEM SCHEMA =====

/**
 * ✅ DELETE /api/v1/carts/items/:itemId
 * Remove item from cart
 * 
 * No body validation needed (path param validated by controller)
 */
const removeCartItemSchema = z.object({});

// ===== APPLY DISCOUNT SCHEMA =====

/**
 * ✅ POST /api/v1/carts/apply-discount
 * Apply promo code to cart
 * 
 * Validates:
 * - code: promo code format
 * 
 * Service will verify:
 * - code exists in DB
 * - not expired
 * - min_purchase met
 * - calculate discount_amount
 */
const applyDiscountSchema = z.object({
    code: promoCodeSchema,
});

// ===== REMOVE DISCOUNT SCHEMA =====

/**
 * ✅ DELETE /api/v1/carts/discount
 * Remove applied discount from cart
 * 
 * No body validation needed
 */
const removeDiscountSchema = z.object({});

// ===== MERGE CART SCHEMA =====

/**
 * ✅ POST /api/v1/carts/merge
 * Merge guest cart to user cart (on login)
 * 
 * Validates:
 * - session_key: UUID (required for guest cart identification)
 * 
 * Note: user_id comes from JWT token (in req.user)
 */
const mergeCartSchema = z.object({
    session_key: sessionKeySchema,
}).refine(
    (data) => data.session_key !== undefined && data.session_key !== null,
    {
        message: 'Session key is required for cart merge',
        path: ['session_key'],
    }
);

// ===== GET CART SCHEMA (Query Params) =====

/**
 * ✅ GET /api/v1/carts
 * Get user cart (or session cart)
 * 
 * Query params:
 * - include_items: boolean (default true) → include full items or just summary
 * - format: 'summary' | 'detail' | 'checkout' (default 'summary')
 */
const getCartSchema = z.object({
    include_items: z
        .string()
        .transform((val) => val === 'true')
        .default('true'),

    format: z
        .enum(['summary', 'detail', 'checkout'])
        .default('summary'),
});

// ===== CHECKOUT SCHEMA =====

/**
 * ✅ POST /api/v1/carts/checkout
 * Validate cart before creating order
 * 
 * Validates:
 * - Cart not empty
 * - Items have valid quantity
 * - Total > 0
 * 
 * Service will:
 * - Verify stock availability
 * - Lock cart from further modifications
 * - Create order snapshot
 */
const checkoutCartSchema = z.object({
    // Empty: validation done in service after loading cart
});

// ===== ABANDON CART SCHEMA =====

/**
 * ✅ POST /api/v1/carts/abandon
 * Explicitly mark cart as abandoned (for user cleanup)
 * 
 * No body validation needed
 */
const abandonCartSchema = z.object({});

// ===== CLEAR CART SCHEMA =====

/**
 * ✅ DELETE /api/v1/carts
 * Clear all items from cart
 * 
 * Optional: keep_discount (boolean) → keep promo code applied
 */
const clearCartSchema = z.object({
    keep_discount: z
        .string()
        .transform((val) => val === 'true')
        .default('false'),
});

// ===== GUEST CART CREATE SCHEMA =====

/**
 * ✅ POST /api/v1/carts/guest
 * Create guest cart with session_key
 * 
 * Called client-side when user enters site (no auth)
 * Client generates UUID, server stores it
 */
const createGuestCartSchema = z.object({
    session_key: z
        .string()
        .uuid({ message: 'Session key must be valid UUID v4' }),
});

// ===== EXPORT ALL SCHEMAS =====

module.exports = {
    // Add item
    addToCartItemSchema,

    // Update item
    updateCartItemSchema,

    // Remove item
    removeCartItemSchema,

    // Discount operations
    applyDiscountSchema,
    removeDiscountSchema,

    // Cart operations
    mergeCartSchema,
    getCartSchema,
    checkoutCartSchema,
    abandonCartSchema,
    clearCartSchema,
    createGuestCartSchema,

    // ===== CUSTOM VALIDATORS (for reuse) =====
    // Export for use in other modules if needed
    objectIdSchema,
    objectIdOptionalSchema,
    sessionKeySchema,
    skuSchema,
    promoCodeSchema,
    priceSchema,
    quantitySchema,
};