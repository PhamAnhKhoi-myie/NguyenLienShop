const express = require('express');
const router = express.Router();
const validate = require('../../middlewares/validate.middleware');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/authorize.middleware');
const CartController = require('./cart.controller');

const {
    addToCartItemSchema,
    updateCartItemSchema,
    removeCartItemSchema,
    applyDiscountSchema,
    removeDiscountSchema,
    mergeCartSchema,
    getCartSchema,
    checkoutCartSchema,
    abandonCartSchema,
    clearCartSchema,
    createGuestCartSchema,
} = require('./cart.validator');

// ============================================================================
// ===== CART ROUTES =====
// ============================================================================

// ===== PUBLIC ENDPOINTS (No Authentication) =====

/**
 * POST /api/v1/carts/guest
 * Create guest cart (initialize session cart)
 * 
 * ✅ No authentication required
 * ✅ Client generates UUID v4 as session_key
 * ✅ Server stores it in MongoDB
 * 
 * Body:
 * - session_key (required, UUID v4)
 * 
 * Response: Cart DTO (empty cart)
 * 
 * Status: 201 Created
 */
router.post(
    '/guest',
    validate(createGuestCartSchema),
    CartController.createGuestCart
);

/**
 * GET /api/v1/carts/guest/:sessionKey
 * Get guest cart (by session_key)
 * 
 * ✅ No authentication required
 * ✅ Extends expiry on access (7 more days)
 * 
 * Path params:
 * - sessionKey (UUID v4)
 * 
 * Query params:
 * - include_items (optional, default true)
 * - format (optional: summary|detail|checkout, default summary)
 * 
 * Response: Cart DTO
 * 
 * Status: 200 OK
 */
router.get(
    '/guest/:sessionKey',
    validate(getCartSchema, 'query'),
    CartController.getGuestCart
);

// ===== AUTHENTICATED ENDPOINTS =====

/**
 * GET /api/v1/carts
 * Get current user's cart
 * 
 * ✅ Authentication required (JWT token)
 * ✅ Extends expiry on access
 * 
 * Query params:
 * - include_items (optional, default true)
 * - format (optional: summary|detail|checkout, default summary)
 * 
 * Response: Cart DTO (appropriate format)
 * - summary: item_count, totals (lightweight)
 * - detail: full items, discount, detailed totals
 * - checkout: ready for order creation
 * 
 * Status: 200 OK
 * 
 * Error: 401 Unauthorized, 404 Not Found
 */
router.get(
    '/',
    authenticate,
    validate(getCartSchema, 'query'),
    CartController.getUserCart
);

/**
 * POST /api/v1/carts/items
 * Add item to cart (or update quantity if exists)
 * 
 * ✅ Validates product/variant/unit exist
 * ✅ Checks stock availability
 * ✅ Snapshots price at add time
 * ✅ Uses atomic $push/$inc to prevent race conditions
 * 
 * Authentication:
 * - Option 1: JWT token (user cart)
 * - Option 2: ?session_key=UUID query param (guest cart)
 * 
 * Body:
 * - product_id (required, ObjectId)
 * - variant_id (required, ObjectId)
 * - unit_id (required, ObjectId)
 * - sku (required, uppercase alphanumeric)
 * - variant_label (required, e.g., "20x25 - Vải Không Dệt")
 * - product_name (required)
 * - product_image (optional, URL)
 * - display_name (required, e.g., "Gói 100")
 * - pack_size (required, positive integer)
 * - price_at_added (required, non-negative number)
 * - quantity (required, 1-999 packs)
 * 
 * Response: Updated cart DTO
 * 
 * Status: 200 OK
 * 
 * Errors:
 * - 400 Bad Request: Invalid data, product unavailable, stock insufficient
 * - 401 Unauthorized: No auth + no session_key
 * - 404 Not Found: Product/variant/unit not found
 */
router.post(
    '/items',
    validate(addToCartItemSchema),
    CartController.addItem
);

/**
 * PATCH /api/v1/carts/items/:itemId
 * Update item quantity
 * 
 * ✅ Authentication required
 * ⚠️ Can only update quantity (price_at_added is immutable snapshot)
 * ✅ Validates stock for new quantity
 * 
 * Path params:
 * - itemId (MongoDB ObjectId of item in cart)
 * 
 * Body:
 * - quantity (required, 1-999 packs)
 * 
 * Response: Updated cart DTO
 * 
 * Status: 200 OK
 * 
 * Errors:
 * - 400 Bad Request: Invalid quantity, insufficient stock
 * - 401 Unauthorized
 * - 404 Not Found: Item not found in cart
 */
router.patch(
    '/items/:itemId',
    authenticate,
    validate(updateCartItemSchema),
    CartController.updateItem
);

/**
 * DELETE /api/v1/carts/items/:itemId
 * Remove item from cart
 * 
 * ✅ Authentication required
 * 
 * Path params:
 * - itemId (MongoDB ObjectId of item in cart)
 * 
 * Response: Updated cart DTO
 * 
 * Status: 200 OK
 * 
 * Errors:
 * - 401 Unauthorized
 * - 404 Not Found: Item not found in cart
 */
router.delete(
    '/items/:itemId',
    authenticate,
    CartController.removeItem
);

/**
 * POST /api/v1/carts/discount
 * Apply promo code to cart
 * 
 * ✅ Authentication required
 * ✅ Validates promo code format
 * ✅ Service verifies code exists + not expired + min_purchase met
 * ✅ Calculates discount_amount
 * 
 * Body:
 * - code (required, uppercase alphanumeric, 3-20 chars)
 * 
 * Response: Updated cart DTO with discount applied
 * {
 *   ...cart,
 *   discount: {
 *     code, type, value, discount_amount, applied_at, expires_at
 *   },
 *   totals: { subtotal, discount_amount, total, ... }
 * }
 * 
 * Status: 200 OK
 * 
 * Errors:
 * - 400 Bad Request:
 *   - EMPTY_CART: Cannot apply discount to empty cart
 *   - INVALID_PROMO: Code doesn't exist or inactive
 *   - PROMO_EXPIRED: Code has expired
 *   - MIN_PURCHASE_NOT_MET: Cart subtotal < min_purchase
 * - 401 Unauthorized
 */
router.post(
    '/discount',
    authenticate,
    validate(applyDiscountSchema),
    CartController.applyDiscount
);

/**
 * DELETE /api/v1/carts/discount
 * Remove applied discount from cart
 * 
 * ✅ Authentication required
 * 
 * Response: Updated cart DTO (discount removed)
 * 
 * Status: 200 OK
 * 
 * Errors:
 * - 400 Bad Request: NO_DISCOUNT (no discount currently applied)
 * - 401 Unauthorized
 */
router.delete(
    '/discount',
    authenticate,
    CartController.removeDiscount
);

/**
 * POST /api/v1/carts/merge
 * Merge guest cart to user cart (on login)
 * 
 * ✅ Authentication required (user just logged in)
 * ✅ Called AFTER login, BEFORE redirecting to dashboard
 * ✅ Uses MongoDB transaction for atomicity
 * 
 * Flow:
 * 1. Fetch guest cart (by session_key)
 * 2. Fetch or create user cart
 * 3. Merge items (upsert by SKU)
 * 4. Inherit discount if user cart empty
 * 5. Mark guest cart as abandoned
 * 
 * Body:
 * - session_key (required, UUID v4 from guest cart)
 * 
 * Response: Merged user cart DTO
 * 
 * Status: 200 OK
 * 
 * Errors:
 * - 400 Bad Request: MISSING_SESSION_KEY
 * - 401 Unauthorized
 * - Note: No error if guest cart doesn't exist (returns user cart)
 */
router.post(
    '/merge',
    authenticate,
    validate(mergeCartSchema),
    CartController.mergeCart
);

/**
 * DELETE /api/v1/carts
 * Clear all items from cart
 * 
 * ✅ Authentication required
 * 
 * Query param:
 * - keep_discount (optional, default false)
 *   true: Keep promo code applied after clearing
 *   false: Remove both items and discount
 * 
 * Response: Cleared cart DTO
 * 
 * Status: 200 OK
 * 
 * Errors:
 * - 401 Unauthorized
 */
router.delete(
    '/',
    authenticate,
    validate(clearCartSchema, 'query'),
    CartController.clearCart
);

/**
 * POST /api/v1/carts/abandon
 * Explicitly mark cart as abandoned
 * 
 * ✅ Authentication required
 * 
 * Response: Abandoned cart info
 * {
 *   id, user_id, items, discount, totals,
 *   created_at, updated_at, expired_at,
 *   abandoned_since, status
 * }
 * 
 * Status: 200 OK
 * 
 * Use case: User explicitly clears cart or navigates away
 */
router.post(
    '/abandon',
    authenticate,
    CartController.abandonCart
);

/**
 * POST /api/v1/carts/checkout
 * Validate cart + create order snapshot
 * 
 * ✅ Authentication required
 * ✅ CRITICAL: Re-validates stock before checkout
 * ✅ Prevents race conditions (item added then sold out)
 * 
 * Validates:
 * - Cart not empty
 * - All items have stock (re-check at checkout time)
 * - Discount not expired
 * 
 * Response: Checkout snapshot (for order creation)
 * {
 *   source_cart_id: "...",
 *   items: [
 *     {
 *       product_id, variant_id, unit_id, sku, variant_label,
 *       product_name, product_image, display_name,
 *       pack_size, quantity, total_items,
 *       price_at_added, line_total, price_per_item
 *     }
 *   ],
 *   discount: { code, type, value, discount_amount },
 *   totals: { subtotal, discount_amount, total },
 *   snapshot_at: "..."
 * }
 * 
 * Status: 200 OK
 * 
 * Errors:
 * - 400 Bad Request:
 *   - EMPTY_CART: Cart has no items
 *   - PRODUCT_UNAVAILABLE: Product deleted
 *   - STOCK_CHANGED: Stock insufficient (show updated qty)
 *   - DISCOUNT_EXPIRED: Applied discount has expired
 * - 401 Unauthorized
 */
router.post(
    '/checkout',
    authenticate,
    validate(checkoutCartSchema),
    CartController.checkoutCart
);

/**
 * GET /api/v1/carts/validate
 * Validate cart (dry-run checkout)
 * 
 * ✅ Authentication required
 * ✅ No database writes (safe to call multiple times)
 * 
 * Response: Validation result
 * {
 *   isValid: boolean,
 *   errors: [string],
 *   totals: { subtotal, discount_amount, total }
 * }
 * 
 * Status: 200 OK
 * 
 * Use case: Frontend validation before showing checkout button
 */
router.get(
    '/validate',
    authenticate,
    CartController.validateCart
);

// ===== ADMIN ENDPOINTS =====

/**
 * GET /api/v1/admin/carts/abandoned
 * Get abandoned carts (for recovery campaigns)
 * 
 * ✅ Authentication required (admin only)
 * ✅ Used for cart recovery emails, analytics
 * 
 * Query params:
 * - days_ago (optional, default 7, min 1, max 365)
 *   Returns carts abandoned for > N days
 * - limit (optional, default 100, max 500)
 * 
 * Response: Array of abandoned carts with analytics
 * [
 *   {
 *     id, user_id, session_key, is_guest,
 *     items, discount, totals,
 *     created_at, updated_at, expired_at,
 *     days_since_creation, days_since_update, is_expired,
 *     status
 *   }
 * ]
 * 
 * Status: 200 OK
 * 
 * Pagination: { total, limit }
 * 
 * Errors:
 * - 401 Unauthorized
 * - 403 Forbidden: Not admin
 */
router.get(
    '/admin/abandoned',
    authenticate,
    authorize(['ADMIN']),
    CartController.getAbandonedCarts
);

module.exports = router;