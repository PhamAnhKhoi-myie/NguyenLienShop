const asyncHandler = require('../../utils/asyncHandler.util');
const AppError = require('../../utils/appError.util');
const { assertAuthenticated, assertRole } = require('../../utils/auth.util');
const PaymentService = require('./payment.service');
const PaymentMapper = require('./payment.mapper');

// ===== PUBLIC =====

const handleVNPayWebhook = asyncHandler(async (req, res) => {
    try {
        const result = await PaymentService.handleVNPayWebhook(req.body);

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error('[VNPay Webhook Error]', error.message);

        return res.status(200).json({
            success: false,
            code: error.errorCode || 'WEBHOOK_ERROR',
            message: error.message,
        });
    }
});

const handleVNPayReturn = asyncHandler(async (req, res) => {
    const { vnp_ResponseCode, vnp_OrderInfo, vnp_TxnRef } = req.query;

    if (vnp_ResponseCode === '00') {
        return res.redirect(
            `/checkout/success?order=${vnp_OrderInfo || ''}&txn_ref=${vnp_TxnRef || ''}`
        );
    } else {
        return res.redirect(
            `/checkout/failed?code=${vnp_ResponseCode || 'UNKNOWN'}&order=${vnp_OrderInfo || ''}`
        );
    }
});

const handleStripeWebhook = asyncHandler(async (req, res) => {
    const signature = req.headers['x-stripe-signature'];

    if (!signature) {
        throw new AppError(
            'Missing x-stripe-signature header',
            400,
            'MISSING_WEBHOOK_SIGNATURE'
        );
    }

    const result = await PaymentService.handleStripeWebhook(
        req.body,
        signature
    );

    return res.status(200).json({
        success: true,
        data: result,
    });
});

const handlePayPalWebhook = asyncHandler(async (req, res) => {
    const result = await PaymentService.handlePayPalWebhook(req.body);

    return res.status(200).json({
        success: true,
        data: result,
    });
});

// ===== CUSTOMER =====

const createPayment = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);

    const { order_id: orderId, provider = 'vnpay' } = req.body;

    const result = await PaymentService.createPayment(
        orderId,
        user.userId,
        provider
    );

    return res.status(201).json({
        success: true,
        data: result,
    });
});

const getPayment = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);

    const { payment_id: paymentId } = req.params;

    const payment = await PaymentService.getPaymentById(paymentId);

    if (
        payment.user_id !== user.userId &&
        !user.roles.includes('ADMIN')
    ) {
        throw new AppError(
            'You do not have permission to view this payment',
            403,
            'FORBIDDEN'
        );
    }

    const dto = user.roles.includes('ADMIN')
        ? PaymentMapper.toAdminDTO(payment)
        : PaymentMapper.toCustomerDTO(payment);

    return res.status(200).json({
        success: true,
        data: dto,
    });
});

const listPayments = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);

    const { page, limit, status, provider, date_from, date_to } = req.query;

    let result;

    if (user.roles.includes('ADMIN')) {
        result = await PaymentService.getAllPayments(page, limit, {
            status: status?.length > 0 ? status : undefined,
            provider,
            date_from,
            date_to,
        });
    } else {
        result = await PaymentService.getUserPayments(
            user.userId,
            page,
            limit,
            {
                status: status?.length > 0 ? status : undefined,
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

const getPaymentByOrder = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);

    const { order_id: orderId } = req.params;

    const order = await require('../orders/order.model').findOne({
        _id: orderId,
        user_id: user.userId,
    });

    if (!order) {
        throw new AppError(
            'Order not found',
            404,
            'ORDER_NOT_FOUND'
        );
    }

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

const retryPayment = asyncHandler(async (req, res) => {
    assertAuthenticated(req.user);

    const { payment_id: paymentId } = req.params;

    const result = await PaymentService.retryPayment(paymentId);

    return res.status(200).json({
        success: true,
        data: result,
    });
});

const cancelPayment = asyncHandler(async (req, res) => {
    assertAuthenticated(req.user);

    const { payment_id: paymentId } = req.params;
    const { reason } = req.body;

    const result = await PaymentService.cancelPayment(
        paymentId,
        reason || 'User cancelled'
    );

    return res.status(200).json({
        success: true,
        data: result,
    });
});

// ===== ADMIN =====

const adminListPayments = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    assertRole(user, ['ADMIN']);

    const { page, limit, status, provider, date_from, date_to } = req.query;

    const result = await PaymentService.getAllPayments(page, limit, {
        status: status?.length > 0 ? status : undefined,
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

const getPaymentStats = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    assertRole(user, ['ADMIN']);

    const stats = await PaymentService.getPaymentStats();

    return res.status(200).json({
        success: true,
        data: stats,
    });
});

const adminVerifyPayment = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    assertRole(user, ['ADMIN']);

    const { payment_id: paymentId } = req.params;

    const payment = await require('./payment.model').findById(paymentId);

    if (!payment) {
        throw new AppError(
            'Payment not found',
            404,
            'PAYMENT_NOT_FOUND'
        );
    }

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

const adminDeletePayment = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    assertRole(user, ['ADMIN']);

    const { payment_id: paymentId } = req.params;

    const result = await PaymentService.softDeletePayment(paymentId);

    return res.status(200).json({
        success: true,
        data: result,
    });
});

module.exports = {
    handleVNPayWebhook,
    handleVNPayReturn,
    handleStripeWebhook,
    handlePayPalWebhook,

    createPayment,
    getPayment,
    listPayments,
    getPaymentByOrder,
    retryPayment,
    cancelPayment,

    adminListPayments,
    getPaymentStats,
    adminVerifyPayment,
    adminDeletePayment,
};