const express = require('express');
const validate = require('../../middlewares/validate.middleware');
const { authenticate } = require('../../middlewares/auth.middleware');
const PaymentController = require('./payment.controller');

const {
    // params
    IdParamSchema,

    // body
    createPaymentBodySchema,
    cancelPaymentBodySchema,
    vnpayWebhookBodySchema,
    stripeWebhookBodySchema,
    paypalWebhookBodySchema,

    // query
    listPaymentsQuerySchema,
} = require('./payment.validator');

const router = express.Router();

// ===== PUBLIC =====

router.get(
    '/vnpay-return',
    PaymentController.handleVNPayReturn
);

router.post(
    '/webhook/vnpay',
    validate({ body: vnpayWebhookBodySchema }),
    PaymentController.handleVNPayWebhook
);

router.post(
    '/webhook/stripe',
    validate({ body: stripeWebhookBodySchema }),
    PaymentController.handleStripeWebhook
);

router.post(
    '/webhook/paypal',
    validate({ body: paypalWebhookBodySchema }),
    PaymentController.handlePayPalWebhook
);

// ===== ADMIN =====

router.get(
    '/admin/stats',
    authenticate,
    PaymentController.getPaymentStats
);

router.get(
    '/admin',
    authenticate,
    validate({ query: listPaymentsQuerySchema }),
    PaymentController.adminListPayments
);

router.post(
    '/admin/:payment_id/verify',
    authenticate,
    validate({ params: IdParamSchema }),
    PaymentController.adminVerifyPayment
);

router.delete(
    '/admin/:payment_id',
    authenticate,
    validate({ params: IdParamSchema }),
    PaymentController.adminDeletePayment
);

// ===== CUSTOMER =====

router.post(
    '/',
    authenticate,
    validate({ body: createPaymentBodySchema }),
    PaymentController.createPayment
);

router.get(
    '/',
    authenticate,
    validate({ query: listPaymentsQuerySchema }),
    PaymentController.listPayments
);

// ===== PARAM ROUTES (specific first) =====

router.post(
    '/:payment_id/retry',
    authenticate,
    validate({ params: IdParamSchema }),
    PaymentController.retryPayment
);

router.post(
    '/:payment_id/cancel',
    authenticate,
    validate({
        params: IdParamSchema,
        body: cancelPaymentBodySchema,
    }),
    PaymentController.cancelPayment
);

router.get(
    '/:payment_id',
    authenticate,
    validate({ params: IdParamSchema }),
    PaymentController.getPayment
);

module.exports = router;