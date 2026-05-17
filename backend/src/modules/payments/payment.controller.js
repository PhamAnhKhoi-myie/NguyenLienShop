const asyncHandler = require('../../utils/asyncHandler.util');
const AppError = require('../../utils/appError.util');
const { assertAuthenticated, assertRole } = require('../../utils/auth.util');
const PaymentService = require('./payment.service');
const PaymentMapper = require('./payment.mapper');

// ===== PUBLIC =====

const handleVNPayWebhook = asyncHandler(async (req, res) => {
    try {
        const webhookData = req.method === 'GET' ? req.query : req.body;

        const result = await PaymentService.handleVNPayWebhook(webhookData);

        if (
            result?.message === 'Payment already processed (idempotent)' ||
            result?.message === 'Payment failure already processed (idempotent)'
        ) {
            return res.status(200).json({
                RspCode: '02',
                Message: 'Order already confirmed',
            });
        }

        return res.status(200).json({
            RspCode: '00',
            Message: 'Confirm Success',
        });
    } catch (error) {
        console.error('[VNPay IPN Error]', error.message);

        const errorCode = error.errorCode;

        if (errorCode === 'WEBHOOK_VERIFICATION_FAILED') {
            return res.status(200).json({
                RspCode: '97',
                Message: 'Checksum failed',
            });
        }

        if (errorCode === 'PAYMENT_NOT_FOUND') {
            return res.status(200).json({
                RspCode: '01',
                Message: 'Order not found',
            });
        }

        if (errorCode === 'AMOUNT_MISMATCH_FRAUD_ATTEMPT') {
            return res.status(200).json({
                RspCode: '04',
                Message: 'Invalid amount',
            });
        }

        if (errorCode === 'INVALID_PAYMENT_STATUS') {
            return res.status(200).json({
                RspCode: '02',
                Message: 'Order already confirmed',
            });
        }

        return res.status(200).json({
            RspCode: '99',
            Message: 'Unknown error',
        });
    }
});

const handleVNPayReturn = asyncHandler(async (req, res) => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    try {
        const result = await PaymentService.handleVNPayReturn(req.query);

        if (result.isSuccess) {
            return res.redirect(
                `${frontendUrl}/payment/vnpay-return?status=success&order_id=${result.orderId}&payment_id=${result.paymentId}&txn_ref=${result.txnRef}`
            );
        }

        return res.redirect(
            `${frontendUrl}/payment/vnpay-return?status=failed&order_id=${result.orderId}&payment_id=${result.paymentId}&txn_ref=${result.txnRef}&code=${result.responseCode || 'UNKNOWN'}`
        );
    } catch (error) {
        console.error('[VNPay Return Error]', error.message);

        return res.redirect(
            `${frontendUrl}/payment/vnpay-return?status=invalid&code=${error.errorCode || 'RETURN_VERIFY_FAILED'}`
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

    const paymentUserId = payment.user_id?.toString();

    if (
        paymentUserId !== user.userId &&
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
    const user = assertAuthenticated(req.user);

    const { payment_id: paymentId } = req.params;

    const result = await PaymentService.retryPayment(
        paymentId,
        user.userId
    );

    return res.status(200).json({
        success: true,
        data: result,
    });
});

const cancelPayment = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);

    const { payment_id: paymentId } = req.params;
    const { reason } = req.body;

    const result = await PaymentService.cancelPayment(
        paymentId,
        user.userId,
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