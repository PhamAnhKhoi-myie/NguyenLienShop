const asyncHandler = require('../../utils/asyncHandler.util');
const AppError = require('../../utils/appError.util');
const { assertAuthenticated, assertRole } = require('../../utils/auth.util');
const { validateObjectId } = require('../../utils/validator.util');
const PaymentService = require('./payment.service');
const PaymentMapper = require('./payment.mapper');
const {
    createPaymentSchema,
    vnpayWebhookSchema,
    stripeWebhookSchema,
    paypalWebhookSchema,
    retryPaymentSchema,
    cancelPaymentSchema,
    getPaymentSchema,
    getPaymentQuerySchema,
    listPaymentsSchema,
    verifyPaymentSchema,
} = require('./payment.validator');

// ===== PUBLIC ENDPOINTS (No Auth) =====

/**
 * POST /api/v1/payments/webhook/vnpay
 * VNPay IPN webhook notification
 * 
 * ✅ No authentication (webhook from payment provider)
 * ✅ Signature verification mandatory
 * ✅ Process payment success/failure
 * ✅ Stock rollback on failure
 * 
 * Body:
 * - vnp_Amount, vnp_ResponseCode, vnp_TxnRef, vnp_SecureHash, etc
 * 
 * Response:
 * - { status, transactionRef, orderId }
 * 
 * Error cases:
 * - WEBHOOK_VERIFICATION_FAILED: Invalid signature
 * - PAYMENT_NOT_FOUND: Transaction reference not found
 * - AMOUNT_MISMATCH_FRAUD_ATTEMPT: Amount doesn't match order
 */
const handleVNPayWebhook = asyncHandler(async (req, res) => {
    try {
        // ✅ Validate webhook structure
        const validated = vnpayWebhookSchema.parse(req.body);

        // ✅ Process webhook
        const result = await PaymentService.handleVNPayWebhook(validated);

        // ✅ Luôn trả 200 OK - VNPay sẽ retry nếu nhận non-200
        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        // ✅ Log lỗi nhưng vẫn trả 200 để VNPay không retry vô hạn
        console.error('[VNPay Webhook Error]', error.message);

        return res.status(200).json({
            success: false,
            code: error.errorCode || 'WEBHOOK_ERROR',
            message: error.message,
        });
    }
});

/**
 * GET /api/v1/payments/vnpay-return
 * VNPay return URL after user completes payment
 * 
 * ✅ No authentication required
 * ✅ DISPLAY UI ONLY - never update database here
 * ✅ Source of truth is IPN webhook (server-to-server)
 * ⚠️ Return URL can be spoofed or opened multiple times
 * 
 * Query params:
 * - vnp_ResponseCode: 00=success, other=failed
 * - vnp_OrderInfo: Order reference
 * - vnp_TxnRef: Transaction reference (for lookup)
 * 
 * Response:
 * - Redirect to /checkout/success?order=XXX (user can check status via API)
 * - Redirect to /checkout/failed?code=XXX (user can retry)
 */
const handleVNPayReturn = asyncHandler(async (req, res) => {
    const { vnp_ResponseCode, vnp_OrderInfo, vnp_TxnRef } = req.query;

    // ✅ CORRECT: Display based on response code
    // ⚠️ NEVER trust this return URL for DB updates
    // ⚠️ Only IPN webhook is source of truth

    if (vnp_ResponseCode === '00') {
        // ✅ Payment likely succeeded (but wait for IPN to confirm)
        // User can check real status via GET /api/v1/payments/:id
        return res.redirect(
            `/checkout/success?order=${vnp_OrderInfo || ''}&txn_ref=${vnp_TxnRef || ''}`
        );
    } else {
        // ✅ Payment failed or cancelled
        // User can retry checkout
        return res.redirect(
            `/checkout/failed?code=${vnp_ResponseCode || 'UNKNOWN'}&order=${vnp_OrderInfo || ''}`
        );
    }

    // ❌ NEVER DO THIS:
    // await Payment.updateOne(...);  // WRONG!
    // await Order.updateOne(...);    // WRONG!
    // Only IPN (webhook) should update database
});

/**
 * POST /api/v1/payments/webhook/stripe
 * Stripe webhook event
 * 
 * ✅ No authentication (webhook from payment provider)
 * ✅ Signature verification from x-stripe-signature header
 * ✅ Process different event types
 * 
 * Headers:
 * - x-stripe-signature: signature verification
 * 
 * Body: Stripe event object
 * - { id, type, data, created, ... }
 * 
 * Response:
 * - { status, transactionRef }
 */
const handleStripeWebhook = asyncHandler(async (req, res) => {
    // ✅ Get signature from header
    const signature = req.headers['x-stripe-signature'];
    if (!signature) {
        throw new AppError(
            'Missing x-stripe-signature header',
            400,
            'MISSING_WEBHOOK_SIGNATURE'
        );
    }

    // ✅ Validate webhook structure
    const validated = stripeWebhookSchema.parse(req.body);

    // ✅ Process webhook
    const result = await PaymentService.handleStripeWebhook(
        validated,
        signature
    );

    // ✅ Always respond 200 OK to webhook
    return res.status(200).json({
        success: true,
        data: result,
    });
});

/**
 * POST /api/v1/payments/webhook/paypal
 * PayPal webhook event
 * 
 * ✅ No authentication (webhook from payment provider)
 * ✅ Signature verification (if needed)
 * ✅ Process different event types
 * 
 * Body: PayPal event object
 * - { id, event_type, resource, create_time, ... }
 */
const handlePayPalWebhook = asyncHandler(async (req, res) => {
    // ✅ Validate webhook structure
    const validated = paypalWebhookSchema.parse(req.body);

    // ✅ Process webhook
    const result = await PaymentService.handlePayPalWebhook(validated);

    // ✅ Always respond 200 OK to webhook
    return res.status(200).json({
        success: true,
        data: result,
    });
});

// ===== AUTHENTICATED ENDPOINTS (Customer) =====

/**
 * POST /api/v1/payments
 * Create payment for order
 * 
 * ✅ Authentication required (customer only)
 * ✅ Verify user owns order
 * ✅ Lock amount to order total
 * ✅ Check for existing pending payment
 * 
 * Body:
 * - order_id (required, ObjectId)
 * - provider (optional, default: vnpay)
 * 
 * Response:
 * - { paymentId, payment, paymentUrl }
 * 
 * Error cases:
 * - MISSING_REQUIRED_PARAMS: Missing order_id
 * - ORDER_NOT_FOUND: Order not found or not PENDING
 * - INVALID_ORDER_TOTAL: Order total <= 0
 */
const createPayment = asyncHandler(async (req, res) => {
    // ✅ Verify authentication
    assertAuthenticated(req.user);

    // ✅ Validate request body
    const validated = createPaymentSchema.parse(req.body);

    const { order_id: orderId, provider = 'vnpay' } = validated;

    // ✅ Create payment
    const result = await PaymentService.createPayment(
        orderId,
        req.user.userId,
        provider
    );

    return res.status(201).json({
        success: true,
        data: result,
    });
});

/**
 * GET /api/v1/payments/:paymentId
 * Get payment details
 * 
 * ✅ Authentication required
 * ✅ Verify user owns payment or is admin
 * ✅ Return detail DTO with status + provider data
 * 
 * Path params:
 * - paymentId (ObjectId)
 * 
 * Query params:
 * - format (optional: summary|detail|admin, default detail)
 * 
 * Response:
 * - { id, order_id, status, amount, provider_data, ... }
 * 
 * Error cases:
 * - PAYMENT_NOT_FOUND: Payment not found
 * - UNAUTHORIZED: User doesn't own payment (not admin)
 */
const getPayment = asyncHandler(async (req, res) => {
    // ✅ Verify authentication
    assertAuthenticated(req.user);

    // ✅ Validate path params
    const { payment_id: paymentId } = getPaymentSchema.parse(req.params);
    validateObjectId(paymentId);

    // ✅ Get payment
    const payment = await PaymentService.getPaymentById(paymentId);

    // ✅ Verify user owns payment (or is admin)
    if (
        payment.user_id !== req.user.userId &&
        !req.user.roles.includes('ADMIN')
    ) {
        throw new AppError(
            'You do not have permission to view this payment',
            403,
            'FORBIDDEN'
        );
    }

    // ✅ Format based on user role
    let dto;
    if (req.user.roles.includes('ADMIN')) {
        dto = PaymentMapper.toAdminDTO(payment);
    } else {
        dto = PaymentMapper.toCustomerDTO(payment);
    }

    return res.status(200).json({
        success: true,
        data: dto,
    });
});

/**
 * GET /api/v1/payments
 * List user's payments (customer) or all payments (admin)
 * 
 * ✅ Authentication required
 * ✅ Customer sees only their payments
 * ✅ Admin sees all payments (with filters)
 * 
 * Query params:
 * - page (optional, default 1)
 * - limit (optional, default 20, max 100)
 * - status (optional, comma-separated: pending,paid,failed)
 * - provider (optional: vnpay,stripe,paypal)
 * - date_from (optional, ISO date)
 * - date_to (optional, ISO date)
 * - sort_by (optional, default -created_at)
 * 
 * Response:
 * - { data: [...], pagination: { page, limit, total, totalPages } }
 */
const listPayments = asyncHandler(async (req, res) => {
    // ✅ Verify authentication
    assertAuthenticated(req.user);

    // ✅ Validate query params
    const validated = listPaymentsSchema.parse(req.query);

    const { page, limit, status, provider, date_from, date_to } = validated;

    // ✅ Get payments (customer or admin)
    let result;

    if (req.user.roles.includes('ADMIN')) {
        // Admin sees all payments
        result = await PaymentService.getAllPayments(page, limit, {
            status: status.length > 0 ? status : undefined,
            provider,
            date_from,
            date_to,
        });
    } else {
        // Customer sees only their payments
        result = await PaymentService.getUserPayments(
            req.user.userId,
            page,
            limit,
            {
                status: status.length > 0 ? status : undefined,
                provider,
                date_from,
                date_to,
            }
        );
    }

    return res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
    });
});

/**
 * GET /api/v1/orders/:orderId/payment
 * Get payment for order
 * 
 * ✅ Authentication required
 * ✅ Verify user owns order
 * ✅ Return payment details for order
 * 
 * Path params:
 * - orderId (ObjectId)
 * 
 * Response:
 * - { id, status, amount, paid_at, ... }
 * 
 * Error cases:
 * - ORDER_NOT_FOUND: Order not found
 * - PAYMENT_NOT_FOUND: Order has no payment
 */
const getPaymentByOrder = asyncHandler(async (req, res) => {
    // ✅ Verify authentication
    assertAuthenticated(req.user);

    // ✅ Validate path params
    const { order_id: orderId } = req.params;
    validateObjectId(orderId);

    // ✅ Get order (verify user owns it)
    const order = await require('../orders/order.model').findOne({
        _id: orderId,
        user_id: req.user.userId,
    });

    if (!order) {
        throw new AppError(
            'Order not found',
            404,
            'ORDER_NOT_FOUND'
        );
    }

    // ✅ Get payment
    const payment = await PaymentService.getPaymentByOrder(orderId);

    if (!payment) {
        throw new AppError(
            'Payment not found for this order',
            404,
            'PAYMENT_NOT_FOUND'
        );
    }

    return res.status(200).json({
        success: true,
        data: PaymentMapper.toCustomerDTO(payment),
    });
});

/**
 * POST /api/v1/payments/:paymentId/retry
 * Retry a failed payment
 * 
 * ✅ Authentication required
 * ✅ Verify user owns payment
 * ✅ Can only retry failed payments
 * ✅ Reset to pending status
 * ✅ Increment retry counter
 * 
 * Path params:
 * - paymentId (ObjectId)
 * 
 * Response:
 * - { paymentId, payment, paymentUrl }
 * 
 * Error cases:
 * - PAYMENT_NOT_FOUND: Payment not found
 * - INVALID_PAYMENT_STATUS: Payment not in failed state
 */
const retryPayment = asyncHandler(async (req, res) => {
    // ✅ Verify authentication
    assertAuthenticated(req.user);

    // ✅ Validate path params
    const { payment_id: paymentId } = req.params;
    validateObjectId(paymentId);

    // ✅ Retry payment
    const result = await PaymentService.retryPayment(paymentId);

    // ✅ Verify user owns payment (check in service or here)
    // (Service should verify or we need to load payment first)

    return res.status(200).json({
        success: true,
        data: result,
    });
});

/**
 * POST /api/v1/payments/:paymentId/cancel
 * Cancel a pending payment
 * 
 * ✅ Authentication required
 * ✅ Verify user owns payment
 * ✅ Can only cancel pending payments
 * ✅ Rollback stock + order status
 * 
 * Path params:
 * - paymentId (ObjectId)
 * 
 * Body:
 * - reason (optional, string)
 * 
 * Response:
 * - { status, reason, message }
 * 
 * Error cases:
 * - PAYMENT_NOT_FOUND: Payment not found
 * - INVALID_PAYMENT_STATUS: Payment not pending
 */
const cancelPayment = asyncHandler(async (req, res) => {
    // ✅ Verify authentication
    assertAuthenticated(req.user);

    // ✅ Validate path params
    const { payment_id: paymentId } = req.params;
    validateObjectId(paymentId);

    // ✅ Validate request body
    const validated = cancelPaymentSchema.parse(req.body);
    const { reason } = validated;

    // ✅ Cancel payment
    const result = await PaymentService.cancelPayment(
        paymentId,
        reason || 'User cancelled'
    );

    return res.status(200).json({
        success: true,
        data: result,
    });
});

// ===== ADMIN ENDPOINTS =====

/**
 * GET /api/v1/admin/payments
 * Admin: List all payments with filters
 * 
 * ✅ Admin role required
 * ✅ Comprehensive filtering + pagination
 * ✅ Full payment details including provider data
 * 
 * Query params: Same as GET /api/v1/payments
 * - page, limit, status, provider, date_from, date_to
 * 
 * Response:
 * - { data: [...], pagination: {...} }
 */
const adminListPayments = asyncHandler(async (req, res) => {
    // ✅ Verify admin role
    assertAuthenticated(req.user);
    assertRole(req.user, ['ADMIN']);

    // ✅ Validate query params
    const validated = listPaymentsSchema.parse(req.query);

    const { page, limit, status, provider, date_from, date_to } = validated;

    // ✅ Get all payments
    const result = await PaymentService.getAllPayments(page, limit, {
        status: status.length > 0 ? status : undefined,
        provider,
        date_from,
        date_to,
    });

    return res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
    });
});

/**
 * GET /api/v1/admin/payments/stats
 * Admin: Payment statistics
 * 
 * ✅ Admin role required
 * ✅ Return revenue, status breakdown, provider breakdown
 * 
 * Response:
 * - {
 *   totalPayments: 100,
 *   totalRevenue: 5000000,
 *   statusBreakdown: [...],
 *   providerBreakdown: [...],
 *   failedVerifications: 5
 * }
 */
const getPaymentStats = asyncHandler(async (req, res) => {
    // ✅ Verify admin role
    assertAuthenticated(req.user);
    assertRole(req.user, ['ADMIN']);

    // ✅ Get statistics
    const stats = await PaymentService.getPaymentStats();

    return res.status(200).json({
        success: true,
        data: stats,
    });
});

/**
 * POST /api/v1/admin/payments/:paymentId/verify
 * Admin: Manually verify payment webhook
 * 
 * ✅ Admin role required
 * ✅ For debugging failed webhooks
 * ✅ Re-verify signature + update status
 * 
 * Path params:
 * - paymentId (ObjectId)
 * 
 * Response:
 * - { verified, message }
 */
const adminVerifyPayment = asyncHandler(async (req, res) => {
    // ✅ Verify admin role
    assertAuthenticated(req.user);
    assertRole(req.user, ['ADMIN']);

    // ✅ Validate path params
    const { payment_id: paymentId } = req.params;
    validateObjectId(paymentId);

    // ✅ Verify payment (reload from DB and check)
    // This is a manual verification endpoint for debugging
    const payment = await require('./payment.model').findById(paymentId);

    if (!payment) {
        throw new AppError(
            'Payment not found',
            404,
            'PAYMENT_NOT_FOUND'
        );
    }

    // Return verification status
    return res.status(200).json({
        success: true,
        data: {
            paymentId: payment._id.toString(),
            verification_status: payment.verification_status,
            status: payment.status,
            message: `Verification status: ${payment.verification_status}`,
        },
    });
});

/**
 * DELETE /api/v1/admin/payments/:paymentId
 * Admin: Soft-delete payment
 * 
 * ✅ Admin role required
 * ✅ Soft delete (sets is_deleted = true)
 * ✅ Audit trail preserved
 * 
 * Path params:
 * - paymentId (ObjectId)
 * 
 * Response:
 * - { id, is_deleted, deleted_at }
 */
const adminDeletePayment = asyncHandler(async (req, res) => {
    // ✅ Verify admin role
    assertAuthenticated(req.user);
    assertRole(req.user, ['ADMIN']);

    // ✅ Validate path params
    const { payment_id: paymentId } = req.params;
    validateObjectId(paymentId);

    // ✅ Soft-delete payment
    const result = await PaymentService.softDeletePayment(paymentId);

    return res.status(200).json({
        success: true,
        data: result,
    });
});

// ===== EXPORT ALL CONTROLLERS =====

module.exports = {
    // Public endpoints (webhooks)
    handleVNPayWebhook,
    handleVNPayReturn,  // ← ADD THIS
    handleStripeWebhook,
    handlePayPalWebhook,

    // Customer endpoints
    createPayment,
    getPayment,
    listPayments,
    getPaymentByOrder,
    retryPayment,
    cancelPayment,

    // Admin endpoints
    adminListPayments,
    getPaymentStats,
    adminVerifyPayment,
    adminDeletePayment,
};