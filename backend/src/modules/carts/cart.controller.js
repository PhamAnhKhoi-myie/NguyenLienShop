const { randomUUID } = require('crypto');
const asyncHandler = require('../../utils/asyncHandler.util');
const AppError = require('../../utils/appError.util');
const { assertAuthenticated } = require('../../utils/auth.util');
const { buildAuditMetadata } = require('../../utils/audit.util');
const CartService = require('./cart.service');
const CartMapper = require('./cart.mapper');

// ===== PUBLIC =====

const GUEST_CART_COOKIE_NAME = 'guest_cart_session';
const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const getGuestCartCookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/api/v1/carts',
    maxAge: 7 * 24 * 60 * 60 * 1000,
});

const getGuestSessionKey = (req) =>
    req.params?.sessionKey ||
    req.get('x-cart-session-key') ||
    req.cookies?.[GUEST_CART_COOKIE_NAME] ||
    req.query?.session_key ||
    req.body?.session_key;

const resolveGuestSessionKey = (req, res, options = {}) => {
    const sessionKey = getGuestSessionKey(req) || (
        options.create ? randomUUID() : null
    );

    if (!sessionKey) {
        throw new AppError(
            'Guest cart session required',
            400,
            'MISSING_SESSION_KEY'
        );
    }

    if (!UUID_PATTERN.test(sessionKey)) {
        throw new AppError(
            'Invalid guest cart session',
            400,
            'INVALID_SESSION_KEY'
        );
    }

    res.cookie(
        GUEST_CART_COOKIE_NAME,
        sessionKey,
        getGuestCartCookieOptions()
    );

    return sessionKey;
};

const createGuestCart = asyncHandler(async (req, res) => {
    const sessionKey = resolveGuestSessionKey(req, res, { create: true });

    const cart = await CartService.getGuestCart(sessionKey, {
        extend: false,
    });

    res.status(201).json({
        success: true,
        data: cart,
    });
});

const getGuestCart = asyncHandler(async (req, res) => {
    const { include_items, format } = req.query;
    const sessionKey = resolveGuestSessionKey(req, res, { create: true });

    const cart = await CartService.getGuestCart(sessionKey, {
        extend: true,
    });

    let response = cart;
    if (format === 'detail' || format === 'checkout') {
        response = CartMapper.toDetailDTO(cart);
    } else {
        response = CartMapper.toSummaryDTO(cart);
    }

    res.status(200).json({
        success: true,
        data: response,
    });
});

// ===== AUTH =====

const getUserCart = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    const { include_items, format } = req.query;

    const cart = await CartService.getUserCart(user.userId, {
        extend: true,
    });

    let response = cart;
    if (format === 'detail' || format === 'checkout') {
        response = CartMapper.toDetailDTO(cart);
    } else {
        response = CartMapper.toSummaryDTO(cart);
    }

    res.status(200).json({
        success: true,
        data: response,
    });
});

const addItem = asyncHandler(async (req, res) => {
    const itemData = req.body;

    let userId, userType;
    const user = req.user;

    if (user && user.userId) {
        userId = user.userId;
        userType = 'user';
    } else {
        const sessionKey = resolveGuestSessionKey(req, res, { create: true });
        userId = sessionKey;
        userType = 'guest';
    }

    const cart = await CartService.addItemToCart(
        userId,
        userType,
        itemData,
        buildAuditMetadata(req)
    );

    res.status(200).json({
        success: true,
        data: cart,
        message: 'Item added to cart successfully',
    });
});

const updateItem = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    const { itemId } = req.params;
    const { quantity } = req.body;

    const userCart = await CartService.getUserCart(user.userId, {
        extend: false,
    });

    const cart = await CartService.updateItemQuantity(
        userCart.id,
        itemId,
        quantity,
        user.userId,
        buildAuditMetadata(req)
    );

    res.status(200).json({
        success: true,
        data: cart,
        message: 'Item quantity updated successfully',
    });
});

const removeItem = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    const { itemId } = req.params;

    const userCart = await CartService.getUserCart(user.userId, {
        extend: false,
    });

    const cart = await CartService.removeItemFromCart(
        userCart.id,
        itemId,
        user.userId,
        buildAuditMetadata(req)
    );

    res.status(200).json({
        success: true,
        data: cart,
        message: 'Item removed from cart successfully',
    });
});

const applyDiscount = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    const { code } = req.body;

    const userCart = await CartService.getUserCart(user.userId, {
        extend: false,
    });

    const cart = await CartService.applyDiscount(
        userCart.id,
        code,
        user.userId,
        buildAuditMetadata(req)
    );

    res.status(200).json({
        success: true,
        data: cart,
        message: 'Discount applied successfully',
    });
});

const removeDiscount = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);

    const userCart = await CartService.getUserCart(user.userId, {
        extend: false,
    });

    const cart = await CartService.removeDiscount(
        userCart.id,
        user.userId,
        buildAuditMetadata(req)
    );

    res.status(200).json({
        success: true,
        data: cart,
        message: 'Discount removed successfully',
    });
});

const mergeCart = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    const sessionKey = resolveGuestSessionKey(req, res);

    const mergedCart = await CartService.mergeGuestCartToUser(
        sessionKey,
        user.userId,
        buildAuditMetadata(req)
    );

    res.status(200).json({
        success: true,
        data: mergedCart,
        message: 'Cart merged successfully',
    });
});

const clearCart = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    const { keep_discount } = req.query;

    const userCart = await CartService.getUserCart(user.userId, {
        extend: false,
    });

    const cart = await CartService.clearCart(
        userCart.id,
        { keep_discount },
        user.userId,
        buildAuditMetadata(req)
    );

    res.status(200).json({
        success: true,
        data: cart,
        message: 'Cart cleared successfully',
    });
});

const abandonCart = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);

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

const checkoutCart = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);

    const userCart = await CartService.getUserCart(user.userId, {
        extend: false,
    });

    const snapshot = await CartService.checkoutCart(
        userCart.id,
        user.userId,
        buildAuditMetadata(req)
    );

    res.status(200).json({
        success: true,
        data: snapshot,
        message: 'Cart validated for checkout',
    });
});

const validateCart = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);

    const userCart = await CartService.getUserCart(user.userId, {
        extend: false,
    });

    const validation = await CartService.validateCart(userCart.id);

    res.status(200).json({
        success: true,
        data: validation,
    });
});

// ===== ADMIN =====

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
    createGuestCart,
    getGuestCart,

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

    getAbandonedCarts,
};
