const asyncHandler = require('../../utils/asyncHandler.util');
const AppError = require('../../utils/appError.util');
const { assertAuthenticated } = require('../../utils/auth.util');
const CartService = require('./cart.service');
const CartMapper = require('./cart.mapper');

// ===== PUBLIC =====

const createGuestCart = asyncHandler(async (req, res) => {
    const { session_key } = req.body;

    const cart = await CartService.getGuestCart(session_key, {
        extend: false,
    });

    res.status(201).json({
        success: true,
        data: cart,
    });
});

const getGuestCart = asyncHandler(async (req, res) => {
    const { sessionKey } = req.params;
    const { include_items, format } = req.query;

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
    const sessionKey = req.query.session_key;

    if (user && user.userId) {
        userId = user.userId;
        userType = 'user';
    } else if (sessionKey) {
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
        quantity
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
        itemId
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

    const cart = await CartService.applyDiscount(userCart.id, code);

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

    const cart = await CartService.removeDiscount(userCart.id);

    res.status(200).json({
        success: true,
        data: cart,
        message: 'Discount removed successfully',
    });
});

const mergeCart = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    const { session_key } = req.body;

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

const clearCart = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    const { keep_discount } = req.query;

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

    const snapshot = await CartService.checkoutCart(userCart.id);

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