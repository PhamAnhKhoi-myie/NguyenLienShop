const express = require('express');
const validate = require('../../middlewares/validate.middleware');
const { authenticate } = require('../../middlewares/auth.middleware');
const PaymentController = require('./payment.controller');
const {
    createPaymentSchema,
    cancelPaymentSchema,
} = require('./payment.validator');

const router = express.Router();

// ===== PUBLIC ENDPOINTS (No Auth) =====

// GET /api/v1/payments/vnpay-return
router.get('/vnpay-return', PaymentController.handleVNPayReturn);

// POST /api/v1/payments/webhook/vnpay
router.post('/webhook/vnpay', PaymentController.handleVNPayWebhook);

// POST /api/v1/payments/webhook/stripe
router.post('/webhook/stripe', PaymentController.handleStripeWebhook);

// POST /api/v1/payments/webhook/paypal
router.post('/webhook/paypal', PaymentController.handlePayPalWebhook);

// ===== ADMIN ENDPOINTS =====
// ⚠️ Đặt TRƯỚC /:paymentId để tránh conflict route

// GET /api/v1/payments/admin/stats
router.get(
    '/admin/stats',
    authenticate,
    PaymentController.getPaymentStats
);

// GET /api/v1/payments/admin
router.get(
    '/admin',
    authenticate,
    PaymentController.adminListPayments
);

// POST /api/v1/payments/admin/:paymentId/verify
router.post(
    '/admin/:payment_id/verify',
    authenticate,
    PaymentController.adminVerifyPayment
);

// DELETE /api/v1/payments/admin/:paymentId
router.delete(
    '/admin/:payment_id',
    authenticate,
    PaymentController.adminDeletePayment
);

// ===== CUSTOMER ENDPOINTS (Authenticated) =====

// POST /api/v1/payments
router.post(
    '/',
    authenticate,
    validate(createPaymentSchema),
    PaymentController.createPayment
);

// GET /api/v1/payments
router.get(
    '/',
    authenticate,
    PaymentController.listPayments
);

// GET /api/v1/payments/:payment_id
router.get(
    '/:payment_id',
    authenticate,
    PaymentController.getPayment
);

// POST /api/v1/payments/:payment_id/retry
router.post(
    '/:payment_id/retry',
    authenticate,
    PaymentController.retryPayment
);

// POST /api/v1/payments/:payment_id/cancel
router.post(
    '/:payment_id/cancel',
    authenticate,
    validate(cancelPaymentSchema),
    PaymentController.cancelPayment
);

module.exports = router;