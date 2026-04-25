const asyncHandler = require('../../utils/asyncHandler.util');
const AppError = require('../../utils/appError.util');
const { assertAuthenticated } = require('../../utils/auth.util');
const { validateObjectId } = require('../../utils/validator.util');
const CartService = require('./cart.service');
const CartMapper = require('./cart.mapper');
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

// ===== PUBLIC ENDPOINTS (No Auth) =====

/**
 * POST /api/v1/carts/guest
 * Create guest cart (initialize session cart)
 * 
 * ✅ No authentication required
 * ✅ Client generates UUID v4 as session_key
 * 
 * Body:
 * - session_key (required, UUID v4)
 * 
 * Response: Cart DTO (empty cart with session_key)
 */
const createGuestCart = asyncHandler(async (req, res) => {
    // req.body already validated by validate middleware
    const { session_key } = createGuestCartSchema.parse(req.body);

    const cart = await CartService.getGuestCart(session_key, {
        extend: false,
    });

    res.status(201).json({
        success: true,
        data: cart,
    });
});

/**
 * GET /api/v1/carts/guest/:sessionKey
 * Get guest cart (by session_key)
 * 
 * ✅ No authentication required
 * 
 * Path params:
 * - sessionKey (UUID v4)
 * 
 * Query params:
 * - include_items (optional, default true)
 * - format (optional: summary|detail|checkout, default summary)
 * 
 * Response: Cart DTO
 */
const getGuestCart = asyncHandler(async (req, res) => {
    const { session_key: sessionKey } = createGuestCartSchema.parse({
        session_key: req.params.sessionKey,
    });

    const { include_items, format } = getCartSchema.parse(req.query);

    const cart = await CartService.getGuestCart(sessionKey, {
        extend: true, // Extend expiry on access
    });

    // ✅ Map to appropriate DTO based on format
    let response = cart;
    if (format === 'detail') {
        response = CartMapper.toDetailDTO(cart);
    } else if (format === 'checkout') {
        response = CartMapper.toDetailDTO(cart);
    } else {
        response = CartMapper.toSummaryDTO(cart);
    }

    res.status(200).json({
        success: true,
        data: response,
    });
});

// ===== AUTHENTICATED ENDPOINTS =====

/**
 * GET /api/v1/carts
 * Get current user's cart
 * 
 * ✅ Authentication required
 * 
 * Query params:
 * - include_items (optional, default true)
 * - format (optional: summary|detail|checkout, default summary)
 * 
 * Response: Cart DTO
 */
const getUserCart = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    const { include_items, format } = getCartSchema.parse(req.query);

    const cart = await CartService.getUserCart(user.userId, {
        extend: true, // Extend expiry on access
    });

    // ✅ Map to appropriate DTO based on format
    let response = cart;
    if (format === 'detail') {
        response = CartMapper.toDetailDTO(cart);
    } else if (format === 'checkout') {
        response = CartMapper.toDetailDTO(cart);
    } else {
        response = CartMapper.toSummaryDTO(cart);
    }

    res.status(200).json({
        success: true,
        data: response,
    });
});

/**
 * POST /api/v1/carts/items
 * Add item to cart (or update quantity if exists)
 * 
 * ✅ Authentication required OR session_key provided
 * ✅ Validates product/variant/unit exist
 * ✅ Checks stock availability
 * ✅ Snapshots price at add time
 * 
 * Header (for user cart):
 * - Authorization: Bearer <token>
 * 
 * OR Query param (for guest cart):
 * - session_key (UUID v4)
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
 */
const addItem = asyncHandler(async (req, res) => {
    // req.body already validated by validate middleware
    const itemData = addToCartItemSchema.parse(req.body);

    // ✅ FIX #1: Determine user type (authenticated user or guest)
    let userId, userType;
    const user = req.user;
    const sessionKey = req.query.session_key;

    if (user && user.userId) {
        // Authenticated user
        userId = user.userId;
        userType = 'user';
    } else if (sessionKey) {
        // Guest cart
        userId = sessionKey;
        userType = 'guest';
    } else {
        throw new AppError(
            'Authentication or session_key required',
            401,
            'UNAUTHORIZED'
        );
    }

    const cart = await CartService.addItemToCart(
        userId,
        userType,
        itemData
    );

    res.status(200).json({
        success: true,
        data: cart,
        message: 'Item added to cart successfully',
    });
});

/**
 * PATCH /api/v1/carts/items/:itemId
 * Update item quantity
 * 
 * ✅ Authentication required OR session_key provided
 * ⚠️ Can only update quantity (price is immutable snapshot)
 * 
 * Path params:
 * - itemId (MongoDB ObjectId of item in cart)
 * 
 * Query param (for guest):
 * - session_key (UUID v4)
 * 
 * Body:
 * - quantity (required, 1-999 packs)
 * 
 * Response: Updated cart DTO
 */
const updateItem = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    const { quantity } = updateCartItemSchema.parse(req.body);

    validateObjectId(req.params.itemId);

    // ✅ Get user's cart
    const userCart = await CartService.getUserCart(user.userId, {
        extend: false,
    });

    const cart = await CartService.updateItemQuantity(
        userCart.id,
        req.params.itemId,
        quantity
    );

    res.status(200).json({
        success: true,
        data: cart,
        message: 'Item quantity updated successfully',
    });
});

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
 */
const removeItem = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);

    validateObjectId(req.params.itemId);

    // ✅ Get user's cart
    const userCart = await CartService.getUserCart(user.userId, {
        extend: false,
    });

    const cart = await CartService.removeItemFromCart(
        userCart.id,
        req.params.itemId
    );

    res.status(200).json({
        success: true,
        data: cart,
        message: 'Item removed from cart successfully',
    });
});

/**
 * POST /api/v1/carts/discount
 * Apply promo code to cart
 * 
 * ✅ Authentication required
 * ✅ Validates promo code format
 * ✅ Service verifies code exists + not expired + min_purchase met
 * 
 * Body:
 * - code (required, uppercase alphanumeric, 3-20 chars)
 * 
 * Response: Updated cart DTO with discount applied
 * 
 * Error cases:
 * - INVALID_PROMO: Code doesn't exist
 * - PROMO_EXPIRED: Code has expired
 * - MIN_PURCHASE_NOT_MET: Cart subtotal < min_purchase
 * - EMPTY_CART: Cannot apply discount to empty cart
 */
const applyDiscount = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    const { code } = applyDiscountSchema.parse(req.body);

    // ✅ Get user's cart
    const userCart = await CartService.getUserCart(user.userId, {
        extend: false,
    });

    const cart = await CartService.applyDiscount(userCart.id, code);

    res.status(200).json({
        success: true,
        data: cart,
        message: 'Discount applied successfully',
    });
});

/**
 * DELETE /api/v1/carts/discount
 * Remove applied discount from cart
 * 
 * ✅ Authentication required
 * 
 * Response: Updated cart DTO (discount removed)
 * 
 * Error cases:
 * - NO_DISCOUNT: No discount currently applied
 */
const removeDiscount = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);

    // ✅ Get user's cart
    const userCart = await CartService.getUserCart(user.userId, {
        extend: false,
    });

    const cart = await CartService.removeDiscount(userCart.id);

    res.status(200).json({
        success: true,
        data: cart,
        message: 'Discount removed successfully',
    });
});

/**
 * POST /api/v1/carts/merge
 * Merge guest cart to user cart (on login)
 * 
 * ✅ Authentication required (user just logged in)
 * ✅ Called AFTER login, BEFORE redirecting to dashboard
 * 
 * Body:
 * - session_key (required, UUID v4 from guest cart)
 * 
 * Flow:
 * 1. Fetch guest cart
 * 2. Fetch or create user cart
 * 3. Merge items (upsert by SKU)
 * 4. Inherit discount if user cart empty
 * 5. Mark guest cart as abandoned
 * 
 * Response: Merged user cart DTO
 * 
 * Error cases:
 * - MISSING_SESSION_KEY: session_key not provided
 * - No error if guest cart doesn't exist (returns user cart)
 */
const mergeCart = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    const { session_key } = mergeCartSchema.parse(req.body);

    const mergedCart = await CartService.mergeGuestCartToUser(
        session_key,
        user.userId
    );

    res.status(200).json({
        success: true,
        data: mergedCart,
        message: 'Cart merged successfully',
    });
});

/**
 * DELETE /api/v1/carts
 * Clear all items from cart
 * 
 * ✅ Authentication required
 * 
 * Query param:
 * - keep_discount (optional, default false) - Keep promo code applied?
 * 
 * Response: Cleared cart DTO
 */
const clearCart = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    const { keep_discount } = clearCartSchema.parse(req.query);

    // ✅ Get user's cart
    const userCart = await CartService.getUserCart(user.userId, {
        extend: false,
    });

    const cart = await CartService.clearCart(userCart.id, {
        keep_discount,
    });

    res.status(200).json({
        success: true,
        data: cart,
        message: 'Cart cleared successfully',
    });
});

/**
 * POST /api/v1/carts/abandon
 * Explicitly mark cart as abandoned
 * 
 * ✅ Authentication required
 * 
 * Response: Abandoned cart info (for analytics)
 * 
 * Use case: User explicitly clears cart or navigates away
 */
const abandonCart = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);

    // ✅ Get user's cart
    const userCart = await CartService.getUserCart(user.userId, {
        extend: false,
    });

    const abandoned = await CartService.abandonCart(userCart.id);

    res.status(200).json({
        success: true,
        data: abandoned,
        message: 'Cart marked as abandoned',
    });
});

/**
 * POST /api/v1/carts/checkout
 * Validate cart + create order snapshot
 * 
 * ✅ Authentication required
 * 
 * Validates:
 * - Cart not empty
 * - All items have stock (re-check before order)
 * - Discount not expired
 * 
 * Response: Checkout snapshot (for order creation)
 * {
 *   source_cart_id: "...",
 *   items: [...],
 *   discount: {...},
 *   totals: {...},
 *   snapshot_at: "..."
 * }
 * 
 * Error cases:
 * - EMPTY_CART: Cart has no items
 * - PRODUCT_UNAVAILABLE: Product deleted
 * - STOCK_CHANGED: Stock insufficient (show updated quantity)
 * - DISCOUNT_EXPIRED: Applied discount has expired
 */
const checkoutCart = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);

    // ✅ Get user's cart
    const userCart = await CartService.getUserCart(user.userId, {
        extend: false,
    });

    const snapshot = await CartService.checkoutCart(userCart.id);

    res.status(200).json({
        success: true,
        data: snapshot,
        message: 'Cart validated for checkout',
    });
});

/**
 * GET /api/v1/carts/validate
 * Validate cart (dry-run checkout)
 * 
 * ✅ Authentication required
 * 
 * Response: Validation result { isValid, errors, totals }
 * 
 * Use case: Frontend validation before showing checkout button
 */
const validateCart = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);

    // ✅ Get user's cart
    const userCart = await CartService.getUserCart(user.userId, {
        extend: false,
    });

    const validation = await CartService.validateCart(userCart.id);

    res.status(200).json({
        success: true,
        data: validation,
    });
});

// ===== ADMIN ENDPOINTS =====

/**
 * GET /api/v1/admin/carts/abandoned
 * Get abandoned carts (for recovery campaigns)
 * 
 * ✅ Authentication required (admin only)
 * 
 * Query params:
 * - days_ago (optional, default 7) - Abandoned for > N days
 * - limit (optional, default 100, max 500)
 * 
 * Response: Array of abandoned carts with analytics
 */
const getAbandonedCarts = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    const { assertRole } = require('../../utils/auth.util');
    assertRole(user, ['ADMIN']);

    const daysAgo = parseInt(req.query.days_ago, 10) || 7;
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);

    const carts = await CartService.getAbandonedCarts(daysAgo, limit);

    res.status(200).json({
        success: true,
        data: carts,
        pagination: {
            total: carts.length,
            limit,
        },
    });
});

module.exports = {
    // Guest endpoints
    createGuestCart,
    getGuestCart,

    // User endpoints
    getUserCart,
    addItem,
    updateItem,
    removeItem,
    applyDiscount,
    removeDiscount,
    mergeCart,
    clearCart,
    abandonCart,
    checkoutCart,
    validateCart,

    // Admin endpoints
    getAbandonedCarts,
};