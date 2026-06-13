const express = require('express');
const validate = require('../../middlewares/validate.middleware');
const { authenticate } = require('../../middlewares/auth.middleware');
const PaymentController = require('./payment.controller');

const {

    IdParamSchema,
    OrderIdParamSchema,


    createPaymentBodySchema,
    cancelPaymentBodySchema,
    vnpayWebhookBodySchema,
    payosWebhookBodySchema,


    listPaymentsQuerySchema,
} = require('./payment.validator');

const router = express.Router();



router.get(
    '/vnpay-return',
    PaymentController.handleVNPayReturn
);

router.get(
    '/webhook/vnpay',
    validate({ query: vnpayWebhookBodySchema }),
    PaymentController.handleVNPayWebhook
);

router.post(
    '/webhook/vnpay',
    validate({ body: vnpayWebhookBodySchema }),
    PaymentController.handleVNPayWebhook
);

router.post(
    '/webhook/stripe',
    PaymentController.handleStripeWebhook
);

router.post(
    '/webhook/paypal',
    PaymentController.handlePayPalWebhook
);

router.post(
    '/webhook/payos',
    validate({ body: payosWebhookBodySchema }),
    PaymentController.handlePayOSWebhook
);

router.post(
    '/payos/webhook',
    validate({ body: payosWebhookBodySchema }),
    PaymentController.handlePayOSWebhook
);



router.get(
    '/admin/stats',
    authenticate,
    validate({ query: listPaymentsQuerySchema }),
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
    '/order/:order_id',
    authenticate,
    validate({ params: OrderIdParamSchema }),
    PaymentController.getPaymentByOrder
);

router.get(
    '/:payment_id',
    authenticate,
    validate({ params: IdParamSchema }),
    PaymentController.getPayment
);

module.exports = router;
