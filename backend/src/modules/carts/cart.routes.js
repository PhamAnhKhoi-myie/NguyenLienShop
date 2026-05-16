const express = require('express');
const router = express.Router();
const validate = require('../../middlewares/validate.middleware');
const {
    authenticate,
    optionalAuthenticate,
} = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/authorize.middleware');
const CartController = require('./cart.controller');

const {
    ItemIdParamSchema,
    SessionParamSchema,

    addToCartItemBodySchema,
    updateCartItemBodySchema,
    applyDiscountBodySchema,
    mergeCartBodySchema,
    createGuestCartBodySchema,

    getCartQuerySchema,
    clearCartQuerySchema,
} = require('./cart.validator');

// ===== PUBLIC =====

router.post(
    '/guest',
    validate({ body: createGuestCartBodySchema }),
    CartController.createGuestCart
);

router.get(
    '/guest',
    validate({
        query: getCartQuerySchema,
    }),
    CartController.getGuestCart
);

router.get(
    '/guest/:sessionKey',
    validate({
        params: SessionParamSchema,
        query: getCartQuerySchema,
    }),
    CartController.getGuestCart
);

// ===== AUTH =====

router.get(
    '/',
    authenticate,
    validate({ query: getCartQuerySchema }),
    CartController.getUserCart
);

router.post(
    '/items',
    optionalAuthenticate,
    validate({ body: addToCartItemBodySchema }),
    CartController.addItem
);

router.patch(
    '/items/:itemId',
    authenticate,
    validate({
        params: ItemIdParamSchema,
        body: updateCartItemBodySchema,
    }),
    CartController.updateItem
);

router.delete(
    '/items/:itemId',
    authenticate,
    validate({ params: ItemIdParamSchema }),
    CartController.removeItem
);

router.post(
    '/discount',
    authenticate,
    validate({ body: applyDiscountBodySchema }),
    CartController.applyDiscount
);

router.delete(
    '/discount',
    authenticate,
    CartController.removeDiscount
);

router.post(
    '/merge',
    authenticate,
    validate({ body: mergeCartBodySchema }),
    CartController.mergeCart
);

router.delete(
    '/',
    authenticate,
    validate({ query: clearCartQuerySchema }),
    CartController.clearCart
);

router.post(
    '/abandon',
    authenticate,
    CartController.abandonCart
);

router.post(
    '/checkout',
    authenticate,
    CartController.checkoutCart
);

router.get(
    '/validate',
    authenticate,
    CartController.validateCart
);

// ===== ADMIN =====

router.get(
    '/admin/abandoned',
    authenticate,
    authorize(['ADMIN']),
    CartController.getAbandonedCarts
);

module.exports = router;
