const asyncHandler = require('../../utils/asyncHandler.util');
const AppError = require('../../utils/appError.util');
const { assertAuthenticated, assertRole } = require('../../utils/auth.util');
const PaymentService = require('./payment.service');
const PaymentMapper = require('./payment.mapper');
const { buildAuditMetadata } = require('../../utils/audit.util');
const { FINANCE_VIEW_ROLES, FINANCE_ADMIN_ROLES } = require('../../constants/roles');

const shouldAuditWebhookRejection = (error) =>
    (error?.code || error?.errorCode) !== 'AMOUNT_MISMATCH_FRAUD_ATTEMPT';



const handleVNPayWebhook = asyncHandler(async (req, res) => {
    const metadata = buildAuditMetadata(req);

    try {
        const webhookData = req.method === 'GET' ? req.query : req.body;

        const result = await PaymentService.handleVNPayWebhook(
            webhookData,
            metadata
        );

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

        if (shouldAuditWebhookRejection(error)) {
            await PaymentService.auditPaymentWebhookRejected(
                'vnpay',
                error,
                metadata
            );
        }

        const errorCode = error.code || error.errorCode;

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
    const metadata = buildAuditMetadata(req);
    const signature = req.headers['x-stripe-signature'];

    if (!signature) {
        const error = new AppError(
            'Missing x-stripe-signature header',
            400,
            'MISSING_WEBHOOK_SIGNATURE'
        );

        await PaymentService.auditPaymentWebhookRejected(
            'stripe',
            error,
            metadata
        );

        throw error;
    }

    let result;

    try {
        result = await PaymentService.handleStripeWebhook(
            req.body,
            signature,
            metadata
        );
    } catch (error) {
        if (shouldAuditWebhookRejection(error)) {
            await PaymentService.auditPaymentWebhookRejected(
                'stripe',
                error,
                metadata
            );
        }
        throw error;
    }

    return res.status(200).json({
        success: true,
        data: result,
    });
});

const handlePayPalWebhook = asyncHandler(async (req, res) => {
    const metadata = buildAuditMetadata(req);
    const webhookHeaders = {
        transmission_id: req.headers['paypal-transmission-id'],
        transmission_time: req.headers['paypal-transmission-time'],
        cert_url: req.headers['paypal-cert-url'],
        auth_algo: req.headers['paypal-auth-algo'],
        transmission_sig: req.headers['paypal-transmission-sig'],
    };

    let result;

    try {
        result = await PaymentService.handlePayPalWebhook(
            req.body,
            webhookHeaders,
            metadata
        );
    } catch (error) {
        if (shouldAuditWebhookRejection(error)) {
            await PaymentService.auditPaymentWebhookRejected(
                'paypal',
                error,
                metadata
            );
        }
        throw error;
    }

    return res.status(200).json({
        success: true,
        data: result,
    });
});

const handlePayPalReturn = asyncHandler(async (req, res) => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    try {
        const result = await PaymentService.handlePayPalReturn(
            req.query,
            buildAuditMetadata(req)
        );

        const params = new URLSearchParams({
            provider: 'paypal',
            status: result.isSuccess ? 'success' : 'failed',
            order_id: result.orderId,
            payment_id: result.paymentId,
            txn_ref: result.transactionRef || '',
            code: result.code || 'UNKNOWN',
        });

        return res.redirect(`${frontendUrl}/payment-return?${params.toString()}`);
    } catch (error) {
        console.error('[PayPal Return Error]', error.message);

        const params = new URLSearchParams({
            provider: 'paypal',
            status: 'invalid',
            code: error.errorCode || error.code || 'PAYPAL_RETURN_FAILED',
        });

        if (req.query.order_id) {
            params.set('order_id', req.query.order_id);
        }

        if (req.query.payment_id) {
            params.set('payment_id', req.query.payment_id);
        }

        return res.redirect(`${frontendUrl}/payment-return?${params.toString()}`);
    }
});

const handlePayOSWebhook = asyncHandler(async (req, res) => {
    const metadata = buildAuditMetadata(req);

    let result;

    try {
        result = await PaymentService.handlePayOSWebhook(req.body, metadata);
    } catch (error) {
        if (shouldAuditWebhookRejection(error)) {
            await PaymentService.auditPaymentWebhookRejected(
                'payos',
                error,
                metadata
            );
        }
        throw error;
    }

    return res.status(200).json({
        success: true,
        data: result,
    });
});



const createPayment = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);

    const { order_id: orderId, provider = 'vnpay' } = req.body;

    const result = await PaymentService.createPayment(
        orderId,
        user.userId,
        provider,
        buildAuditMetadata(req)
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
    const canViewFinance = FINANCE_VIEW_ROLES.some((role) =>
        (user.roles || []).includes(role)
    );

    if (
        paymentUserId !== user.userId &&
        !canViewFinance
    ) {
        throw new AppError(
            'You do not have permission to view this payment',
            403,
            'FORBIDDEN'
        );
    }

    const dto = canViewFinance
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
        user.userId,
        buildAuditMetadata(req)
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
        reason || 'User cancelled',
        buildAuditMetadata(req)
    );

    return res.status(200).json({
        success: true,
        data: result,
    });
});



const adminListPayments = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    assertRole(user, FINANCE_VIEW_ROLES);

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
    assertRole(user, FINANCE_VIEW_ROLES);

    const { status, provider, date_from, date_to } = req.query;

    const stats = await PaymentService.getPaymentStats({
        status: status?.length > 0 ? status : undefined,
        provider,
        date_from,
        date_to,
    });

    return res.status(200).json({
        success: true,
        data: stats,
    });
});

const adminVerifyPayment = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    assertRole(user, FINANCE_ADMIN_ROLES);

    const { payment_id: paymentId } = req.params;

    const payment = await require('./payment.model').findById(paymentId);

    if (!payment) {
        throw new AppError(
            'Payment not found',
            404,
            'PAYMENT_NOT_FOUND'
        );
    }

    await PaymentService.auditAdminVerifyPayment(
        payment,
        user.userId,
        buildAuditMetadata(req)
    );

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
    assertRole(user, FINANCE_ADMIN_ROLES);

    const { payment_id: paymentId } = req.params;

    const result = await PaymentService.softDeletePayment(
        paymentId,
        user.userId,
        buildAuditMetadata(req)
    );

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
    handlePayPalReturn,
    handlePayOSWebhook,

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
