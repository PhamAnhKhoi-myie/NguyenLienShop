const mongoose = require('mongoose');
const crypto = require('crypto');
const { PayOS } = require('@payos/node');
const Payment = require('./payment.model');
const PaymentMapper = require('./payment.mapper');
const AppError = require('../../utils/appError.util');
const PaymentAuditLogService = require('../audit_logs/payment_audit_log/payment_log.service');
const { AUDIT_ACTIONS } = require('../../constants/audit');
const { assertPaymentProviderEnabled } = require('./payment_provider.util');

const Order = require('../orders/order.model');
const OrderService = require('../orders/order.service');
const Variant = require('../products/variant.model');
const NotificationEventService = require('../notifications/notification_event.service');

let payOSClient = null;

const logger = {
    info: (data) => console.log(JSON.stringify({
        level: 'info',
        timestamp: new Date().toISOString(),
        ...data
    })),

    error: (data) => console.error(JSON.stringify({
        level: 'error',
        timestamp: new Date().toISOString(),
        ...data
    }))
};







class PaymentService {

    static async createPayment(orderId, userId, provider = 'vnpay', metadata = {}) {
        if (!orderId || !userId) {
            throw new AppError(
                'Order ID and user ID required',
                400,
                'MISSING_REQUIRED_PARAMS'
            );
        }

        provider = String(provider || 'vnpay').trim().toLowerCase();

        this._assertPaymentProviderEnabled(provider);

        const order = await Order.findOne({
            _id: orderId,
            user_id: userId,
            status: 'PENDING',
        });

        if (!order) {
            throw new AppError(
                'Order not found or already processed',
                404,
                'ORDER_NOT_FOUND'
            );
        }

        this._assertProviderMatchesOrder(order, provider);

        const lockedAmount = order.pricing.total_amount;
        const currency = order.currency || 'VND';

        if (lockedAmount <= 0) {
            throw new AppError(
                'Order total must be greater than 0',
                400,
                'INVALID_ORDER_TOTAL'
            );
        }

        const idempotencyKey = Payment.generateIdempotencyKey(userId, orderId);

        const existingPayment = await Payment.findOne({
            order_id: orderId,
            user_id: userId,
            status: 'pending',
        });

        if (
            existingPayment &&
            existingPayment.expires_at &&
            new Date() < new Date(existingPayment.expires_at)
        ) {
            if (existingPayment.provider !== provider) {
                throw new AppError(
                    'Pending payment already exists with another provider',
                    409,
                    'PAYMENT_PROVIDER_MISMATCH'
                );
            }

            if (
                provider === 'vnpay' &&
                !existingPayment.provider_data?.vnp_txn_ref
            ) {
                existingPayment.provider_data = {
                    ...existingPayment.provider_data,
                    vnp_txn_ref: this._generateVNPayTxnRef(
                        existingPayment.order_id
                    ),
                };

                await existingPayment.save();
            }

            if (
                provider === 'payos' &&
                !existingPayment.provider_data?.payos_order_code
            ) {
                existingPayment.provider_data = {
                    ...existingPayment.provider_data,
                    payos_order_code: this._generatePayOSOrderCode(),
                };

                await existingPayment.save();
            }

            return {
                paymentId: existingPayment._id.toString(),
                payment: PaymentMapper.toResponseDTO(existingPayment),
                paymentUrl: await this._generatePaymentUrl(
                    existingPayment,
                    provider,
                    metadata
                ),
            };
        }
        const paymentExpiresAt = this._getPaymentExpiresAt(provider);

        const txnRef = this._generateVNPayTxnRef(orderId);

        const providerData = {};

        if (provider === 'vnpay') {
            providerData.vnp_txn_ref = txnRef;
        }

        if (provider === 'payos') {
            providerData.payos_order_code = this._generatePayOSOrderCode();
        }

        let payment;

        try {
            payment = await Payment.create({
                order_id: orderId,
                user_id: userId,
                provider: provider,

                amount: lockedAmount,
                currency: currency,

                status: 'pending',
                verification_status: 'pending',

                idempotency_key: idempotencyKey,

                expires_at: paymentExpiresAt,

                provider_data: providerData,
            });
        } catch (error) {
            if (!this._isDuplicateKeyError(error)) {
                throw error;
            }

            const duplicatedPayment = await Payment.findOne({
                order_id: orderId,
                user_id: userId,
                status: 'pending',
            });

            if (
                duplicatedPayment &&
                duplicatedPayment.expires_at &&
                new Date() < new Date(duplicatedPayment.expires_at)
            ) {
                if (duplicatedPayment.provider !== provider) {
                    throw new AppError(
                        'Pending payment already exists with another provider',
                        409,
                        'PAYMENT_PROVIDER_MISMATCH'
                    );
                }

                return {
                    paymentId: duplicatedPayment._id.toString(),
                    payment: PaymentMapper.toResponseDTO(duplicatedPayment),
                    paymentUrl: await this._generatePaymentUrl(
                        duplicatedPayment,
                        provider,
                        metadata
                    ),
                };
            }

            throw new AppError(
                'Payment already exists for this order',
                409,
                'PAYMENT_ALREADY_EXISTS'
            );
        }

        const paymentUrl = await this._generatePaymentUrl(
            payment,
            provider,
            metadata
        );

        await this._createPaymentAuditLog({
            action: AUDIT_ACTIONS.CREATE_PAYMENT,
            payment,
            actorId: userId,
            metadata,
            changes: {
                status: {
                    from: null,
                    to: payment.status,
                },
                amount: {
                    from: null,
                    to: payment.amount,
                },
            },
        });

        return {
            paymentId: payment._id.toString(),
            payment: PaymentMapper.toResponseDTO(payment),
            paymentUrl: paymentUrl,
        };
    }

    static async handleVNPayWebhook(webhookData, metadata = {}) {
        const {
            vnp_TmnCode,
            vnp_TxnRef,
            vnp_Amount,
            vnp_ResponseCode,
            vnp_TransactionStatus,
            vnp_TransactionNo,
            vnp_BankCode,
            vnp_PayDate,
            vnp_SecureHash,
            ...restData
        } = webhookData;

        const isSignatureValid = this._verifyVNPaySignature(webhookData);
        if (!isSignatureValid) {
            throw new AppError(
                'Webhook signature verification failed',
                401,
                'WEBHOOK_VERIFICATION_FAILED'
            );
        }

        this._verifyVNPayTmnCode(vnp_TmnCode);

        const payment = await Payment.findByVNPayTxnRef(vnp_TxnRef);
        if (!payment) {
            throw new AppError(
                'Payment not found',
                404,
                'PAYMENT_NOT_FOUND'
            );
        }

        const receivedAmount = Number(vnp_Amount);
        const expectedAmount = Math.round(Number(payment.amount) * 100);

        if (!Number.isFinite(receivedAmount) || receivedAmount !== expectedAmount) {
            await Payment.updateOne(
                { _id: payment._id },
                {
                    $set: {
                        verification_status: 'failed',
                        failure_reason: 'AMOUNT_MISMATCH',
                        failure_code: 'FRAUD_ATTEMPT',
                        failure_message: `Expected ${expectedAmount}, received ${vnp_Amount}`,
                        webhook_verified_at: new Date(),
                    },
                }
            );

            await this._createPaymentAuditLog({
                action: AUDIT_ACTIONS.PAYMENT_WEBHOOK_AMOUNT_MISMATCH,
                payment,
                metadata,
                changes: {
                    amount: {
                        from: expectedAmount,
                        to: receivedAmount,
                    },
                    provider: {
                        from: null,
                        to: 'vnpay',
                    },
                },
            });

            throw new AppError(
                'Payment amount mismatch - possible fraud',
                409,
                'AMOUNT_MISMATCH_FRAUD_ATTEMPT'
            );
        }

        const isPaymentSuccess =
            vnp_ResponseCode === '00' &&
            vnp_TransactionStatus === '00';

        if (isPaymentSuccess) {
            return await this._processPaymentSuccess(payment, {
                vnp_TxnRef,
                vnp_TransactionNo,
                vnp_ResponseCode,
                vnp_TransactionStatus,
                vnp_BankCode,
                vnp_PayDate,
                raw_ipn: webhookData,
                audit_action: AUDIT_ACTIONS.VNPAY_WEBHOOK_PAYMENT,
                audit_metadata: metadata,
            });
        }

        return await this._processPaymentFailure(payment, {
            vnp_ResponseCode,
            vnp_TransactionStatus,
            raw_ipn: webhookData,
            audit_action: AUDIT_ACTIONS.VNPAY_WEBHOOK_PAYMENT,
            audit_metadata: metadata,
        });
    }

    static async handleVNPayReturn(returnData) {
        const {
            vnp_TmnCode,
            vnp_TxnRef,
            vnp_ResponseCode,
            vnp_TransactionStatus,
            vnp_SecureHash,
        } = returnData;

        const isSignatureValid = this._verifyVNPaySignature(returnData);

        if (!isSignatureValid) {
            throw new AppError(
                'Return URL signature verification failed',
                401,
                'RETURN_URL_VERIFICATION_FAILED'
            );
        }

        this._verifyVNPayTmnCode(vnp_TmnCode);

        const payment = await Payment.findByVNPayTxnRef(vnp_TxnRef);

        if (!payment) {
            throw new AppError(
                'Payment not found',
                404,
                'PAYMENT_NOT_FOUND'
            );
        }

        return {
            isSuccess:
                vnp_ResponseCode === '00' &&
                vnp_TransactionStatus === '00',

            paymentId: payment._id.toString(),
            orderId: payment.order_id.toString(),
            txnRef: vnp_TxnRef,
            responseCode: vnp_ResponseCode,
            transactionStatus: vnp_TransactionStatus,
        };
    }

    static async handleStripeWebhook(rawBody, signature, metadata = {}) {
        const isSignatureValid = this._verifyStripeSignature(
            rawBody,
            signature
        );
        if (!isSignatureValid) {
            throw new AppError(
                'Stripe webhook signature verification failed',
                401,
                'WEBHOOK_VERIFICATION_FAILED'
            );
        }

        const webhookEvent = this._parseStripeWebhookBody(rawBody);
        const { type, data } = webhookEvent;
        const object = data?.object;

        if (!type || !object?.id) {
            throw new AppError(
                'Invalid Stripe webhook payload',
                400,
                'INVALID_WEBHOOK_PAYLOAD'
            );
        }

        const payment = await Payment.findOne({
            'provider_data.stripe_pi_id': object.id,
            provider: 'stripe',
            is_deleted: false,
        });

        if (!payment) {
            throw new AppError(
                'Payment not found',
                404,
                'PAYMENT_NOT_FOUND'
            );
        }

        if (payment.amount !== object.amount) {
            await Payment.updateOne(
                { _id: payment._id },
                {
                    $set: {
                        verification_status: 'failed',
                        failure_reason: 'AMOUNT_MISMATCH',
                        failure_message: `Expected ${payment.amount}, received ${object.amount}`,
                    },
                }
            );

            await this._createPaymentAuditLog({
                action: AUDIT_ACTIONS.PAYMENT_WEBHOOK_AMOUNT_MISMATCH,
                payment,
                metadata,
                changes: {
                    amount: {
                        from: payment.amount,
                        to: object.amount,
                    },
                    provider: {
                        from: null,
                        to: 'stripe',
                    },
                },
            });

            throw new AppError(
                'Payment amount mismatch',
                409,
                'AMOUNT_MISMATCH_FRAUD_ATTEMPT'
            );
        }

        if (type === 'payment_intent.succeeded') {
            return await this._processPaymentSuccess(payment, {
                stripe_pi_id: object.id,
                stripe_status: object.status,
                raw_return: webhookEvent,
                audit_action: AUDIT_ACTIONS.STRIPE_WEBHOOK_PAYMENT,
                audit_metadata: metadata,
            });
        } else if (
            type === 'payment_intent.payment_failed' ||
            type === 'payment_intent.canceled'
        ) {
            return await this._processPaymentFailure(payment, {
                stripe_status: object.status,
                raw_ipn: webhookEvent,
                audit_action: AUDIT_ACTIONS.STRIPE_WEBHOOK_PAYMENT,
                audit_metadata: metadata,
            });
        }

        return {
            status: 'pending',
            transactionRef: object.id,
        };
    }

    static async handlePayPalWebhook(webhookEvent, webhookHeaders = {}, metadata = {}) {
        await this._verifyPayPalWebhook(webhookEvent, webhookHeaders);

        const { event_type, resource } = webhookEvent;
        const paypalOrderId = this._extractPayPalOrderId(resource);
        const paypalCaptureId = this._extractPayPalCaptureId(resource);

        if (!event_type || (!paypalOrderId && !paypalCaptureId)) {
            throw new AppError(
                'Invalid PayPal webhook payload',
                400,
                'INVALID_WEBHOOK_PAYLOAD'
            );
        }

        const lookup = [];

        if (paypalOrderId) {
            lookup.push({ 'provider_data.paypal_order_id': paypalOrderId });
        }

        if (paypalCaptureId) {
            lookup.push({ 'provider_data.paypal_capture_id': paypalCaptureId });
        }

        const payment = await Payment.findOne({
            provider: 'paypal',
            is_deleted: false,
            $or: lookup,
        });

        if (!payment) {
            throw new AppError(
                'Payment not found',
                404,
                'PAYMENT_NOT_FOUND'
            );
        }

        if (
            event_type === 'CHECKOUT.ORDER.COMPLETED' ||
            event_type === 'PAYMENT.CAPTURE.COMPLETED'
        ) {
            await this._assertPayPalAmountMatches(payment, resource, metadata);

            return await this._processPaymentSuccess(payment, {
                paypal_order_id: paypalOrderId || payment.provider_data?.paypal_order_id,
                paypal_capture_id: paypalCaptureId,
                paypal_payer_id: resource.payer?.payer_id,
                paypal_status: resource.status,
                ...this._getPayPalProviderAmount(payment, resource),
                raw_ipn: webhookEvent,
                audit_action: AUDIT_ACTIONS.PAYPAL_WEBHOOK_PAYMENT,
                audit_metadata: metadata,
            });
        } else if (
            event_type === 'PAYMENT.CAPTURE.DENIED' ||
            event_type === 'PAYMENT.CAPTURE.REFUNDED' ||
            event_type === 'CHECKOUT.ORDER.VOIDED'
        ) {
            return await this._processPaymentFailure(payment, {
                paypal_capture_id: paypalCaptureId,
                paypal_status: resource.status,
                raw_ipn: webhookEvent,
                audit_action: AUDIT_ACTIONS.PAYPAL_WEBHOOK_PAYMENT,
                audit_metadata: metadata,
            });
        }

        return {
            status: 'pending',
            transactionRef: paypalCaptureId || paypalOrderId,
        };
    }

    static async handlePayPalReturn(returnData = {}, metadata = {}) {
        const paypalOrderId = returnData.token || returnData.orderId;

        if (!paypalOrderId) {
            throw new AppError(
                'PayPal return token is missing',
                400,
                'PAYPAL_RETURN_TOKEN_MISSING'
            );
        }

        const payment = await Payment.findOne({
            'provider_data.paypal_order_id': paypalOrderId,
            provider: 'paypal',
            is_deleted: false,
        });

        if (!payment) {
            throw new AppError(
                'Payment not found',
                404,
                'PAYMENT_NOT_FOUND'
            );
        }

        if (payment.status === 'paid') {
            return {
                isSuccess: true,
                status: 'paid',
                orderId: payment.order_id.toString(),
                paymentId: payment._id.toString(),
                transactionRef:
                    payment.provider_data?.paypal_capture_id ||
                    payment.provider_data?.paypal_order_id,
                code: 'ALREADY_PAID',
            };
        }

        if (payment.status !== 'pending') {
            return {
                isSuccess: false,
                status: payment.status,
                orderId: payment.order_id.toString(),
                paymentId: payment._id.toString(),
                transactionRef: payment.provider_data?.paypal_order_id,
                code: 'PAYMENT_NOT_PENDING',
            };
        }

        const capture = await this._capturePayPalOrder(paypalOrderId);
        await this._assertPayPalAmountMatches(payment, capture, metadata);

        const captureId = this._extractPayPalCaptureId(capture);
        const payerId =
            capture.payer?.payer_id ||
            capture.payment_source?.paypal?.account_id ||
            returnData.PayerID;
        const isSuccess = capture.status === 'COMPLETED';
        const providerAmount = this._getPayPalProviderAmount(payment, capture);

        if (isSuccess) {
            const result = await this._processPaymentSuccess(payment, {
                paypal_order_id: paypalOrderId,
                paypal_capture_id: captureId,
                paypal_payer_id: payerId,
                paypal_status: capture.status,
                ...providerAmount,
                raw_return: capture,
                audit_action: AUDIT_ACTIONS.PAYPAL_WEBHOOK_PAYMENT,
                audit_metadata: metadata,
            });

            return {
                isSuccess: true,
                status: result.status,
                orderId: result.orderId,
                paymentId: result.paymentId,
                transactionRef: captureId || paypalOrderId,
                code: capture.status,
            };
        }

        const result = await this._processPaymentFailure(payment, {
            paypal_capture_id: captureId,
            paypal_status: capture.status,
            failure_reason: 'PAYPAL_PAYMENT_REJECTED',
            failure_message: `PayPal order ended with status: ${capture.status}`,
            raw_return: capture,
            audit_action: AUDIT_ACTIONS.PAYPAL_WEBHOOK_PAYMENT,
            audit_metadata: metadata,
        });

        return {
            isSuccess: false,
            status: result.status,
            orderId: payment.order_id.toString(),
            paymentId: payment._id.toString(),
            transactionRef: captureId || paypalOrderId,
            code: capture.status,
        };
    }

    static async handlePayOSWebhook(webhookEvent, metadata = {}) {
        const webhookData = await this._verifyPayOSWebhook(webhookEvent);

        if (!webhookData?.orderCode || !webhookData?.paymentLinkId) {
            throw new AppError(
                'Invalid PayOS webhook payload',
                400,
                'INVALID_WEBHOOK_PAYLOAD'
            );
        }

        const payment = await Payment.findByPayOSOrderCode(webhookData.orderCode) ||
            await Payment.findByPayOSPaymentLinkId(webhookData.paymentLinkId);

        if (!payment) {
            if (this._isPayOSValidationWebhook(webhookData)) {
                return {
                    status: 'ignored',
                    transactionRef: webhookData.paymentLinkId,
                    message: 'PayOS webhook validation accepted',
                };
            }

            throw new AppError(
                'Payment not found',
                404,
                'PAYMENT_NOT_FOUND'
            );
        }

        const receivedAmount = Number(webhookData.amount);
        const expectedAmount = Math.round(Number(payment.amount));

        if (!Number.isFinite(receivedAmount) || receivedAmount !== expectedAmount) {
            await Payment.updateOne(
                { _id: payment._id },
                {
                    $set: {
                        verification_status: 'failed',
                        failure_reason: 'AMOUNT_MISMATCH',
                        failure_code: 'FRAUD_ATTEMPT',
                        failure_message: `Expected ${expectedAmount}, received ${webhookData.amount}`,
                        webhook_verified_at: new Date(),
                    },
                }
            );

            await this._createPaymentAuditLog({
                action: AUDIT_ACTIONS.PAYMENT_WEBHOOK_AMOUNT_MISMATCH,
                payment,
                metadata,
                changes: {
                    amount: {
                        from: expectedAmount,
                        to: receivedAmount,
                    },
                    provider: {
                        from: null,
                        to: 'payos',
                    },
                },
            });

            throw new AppError(
                'Payment amount mismatch',
                409,
                'AMOUNT_MISMATCH_FRAUD_ATTEMPT'
            );
        }

        const isPaymentSuccess =
            webhookEvent.success === true &&
            webhookData.code === '00';

        if (isPaymentSuccess) {
            return await this._processPaymentSuccess(payment, {
                payos_order_code: webhookData.orderCode,
                payos_payment_link_id: webhookData.paymentLinkId,
                payos_status: webhookData.code,
                payos_reference: webhookData.reference,
                payos_transaction_date_time: webhookData.transactionDateTime,
                raw_ipn: webhookEvent,
                audit_action: AUDIT_ACTIONS.PAYOS_WEBHOOK_PAYMENT,
                audit_metadata: metadata,
            });
        }

        return await this._processPaymentFailure(payment, {
            payos_status: webhookData.code,
            failure_reason: 'PAYOS_PAYMENT_REJECTED',
            failure_message: webhookData.desc || webhookEvent.desc,
            raw_ipn: webhookEvent,
            audit_action: AUDIT_ACTIONS.PAYOS_WEBHOOK_PAYMENT,
            audit_metadata: metadata,
        });
    }

    static async _processPaymentSuccess(payment, providerData) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const paidAt = new Date();

            const vnpPayDate = providerData.vnp_PayDate
                ? this._parseVNPayDate(providerData.vnp_PayDate)
                : null;

            const result = await Payment.updateOne(
                {
                    _id: payment._id,
                    status: 'pending',
                },
                {
                    $set: {
                        status: 'paid',
                        verification_status: 'verified',
                        webhook_verified_at: paidAt,
                        paid_at: paidAt,

                        'provider_data.vnp_transaction_no':
                            providerData.vnp_TransactionNo,
                        'provider_data.vnp_response_code':
                            providerData.vnp_ResponseCode,
                        'provider_data.vnp_transaction_status':
                            providerData.vnp_TransactionStatus,
                        'provider_data.vnp_bank_code': providerData.vnp_BankCode,
                        'provider_data.vnp_pay_date': vnpPayDate,

                        'provider_data.stripe_status':
                            providerData.stripe_status,
                        'provider_data.paypal_status':
                            providerData.paypal_status,
                        'provider_data.paypal_order_id':
                            providerData.paypal_order_id,
                        'provider_data.paypal_capture_id':
                            providerData.paypal_capture_id,
                        'provider_data.paypal_payer_id':
                            providerData.paypal_payer_id,
                        'provider_data.paypal_amount_value':
                            providerData.paypal_amount_value,
                        'provider_data.paypal_currency':
                            providerData.paypal_currency,
                        'provider_data.paypal_exchange_rate':
                            providerData.paypal_exchange_rate,
                        'provider_data.payos_order_code':
                            providerData.payos_order_code,
                        'provider_data.payos_payment_link_id':
                            providerData.payos_payment_link_id,
                        'provider_data.payos_status':
                            providerData.payos_status,
                        'provider_data.payos_reference':
                            providerData.payos_reference,
                        'provider_data.payos_transaction_date_time':
                            providerData.payos_transaction_date_time,

                        raw_ipn: providerData.raw_ipn,
                        raw_return: providerData.raw_return,
                    },
                    $unset: {
                        expires_at: 1,
                    },
                },
                { session }
            );

            if (result.modifiedCount === 0) {
                const currentPayment = await Payment.findById(payment._id).session(session);
                await session.commitTransaction();

                logger.info({
                    event: 'payment_success_idempotent',
                    payment_id: payment._id.toString(),
                    order_id: payment.order_id.toString(),
                    message: 'Payment already processed (idempotent retry)'
                });

                return {
                    status: currentPayment.status,
                    orderId: payment.order_id.toString(),
                    paymentId: payment._id.toString(),
                    message: 'Payment already processed (idempotent)',
                };
            }

            const confirmedOrder = await OrderService.confirmPayment(
                payment.order_id,
                {
                    paid_at: paidAt,
                    payment_id: payment._id,
                    note: 'Payment confirmed',
                },
                { session }
            );

            await session.commitTransaction();

            logger.info({
                event: 'payment_paid',
                payment_id: payment._id.toString(),
                order_id: payment.order_id.toString(),
                user_id: payment.user_id.toString(),
            });

            if (providerData.audit_action) {
                await this._createPaymentAuditLog({
                    action: providerData.audit_action,
                    payment,
                    metadata: providerData.audit_metadata || {},
                    changes: {
                        status: {
                            from: 'pending',
                            to: 'paid',
                        },
                        verification_status: {
                            from: payment.verification_status,
                            to: 'verified',
                        },
                        transaction_ref: {
                            from: null,
                            to: providerData.vnp_TxnRef ||
                                providerData.stripe_pi_id ||
                                providerData.paypal_capture_id ||
                                providerData.paypal_order_id ||
                                providerData.payos_reference ||
                                providerData.payos_payment_link_id ||
                                providerData.payos_order_code ||
                                null,
                        },
                    },
                });
            }

            await NotificationEventService.paymentSucceeded(confirmedOrder, payment);

            return {
                status: 'paid',
                orderId: payment.order_id.toString(),
                paymentId: payment._id.toString(),
                transactionRef:
                    providerData.vnp_TxnRef ||
                    providerData.stripe_pi_id ||
                    providerData.paypal_capture_id ||
                    providerData.paypal_order_id ||
                    providerData.payos_reference ||
                    providerData.payos_payment_link_id ||
                    providerData.payos_order_code ||
                    null,
                message: 'Payment confirmed',
            };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    static async _processPaymentFailure(payment, failureData) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const result = await Payment.updateOne(
                {
                    _id: payment._id,
                    status: 'pending',
                },
                {
                    $set: {
                        status: 'failed',
                        verification_status: 'verified',
                        webhook_verified_at: new Date(),
                        failure_reason: failureData.failure_reason || 'PAYMENT_REJECTED',
                        failure_code: failureData.vnp_ResponseCode
                            || failureData.stripe_status
                            || failureData.paypal_status
                            || failureData.payos_status
                            || 'UNKNOWN',
                        failure_message:
                            failureData.failure_message ||
                            `Payment failed with code: ${failureData.vnp_ResponseCode || failureData.stripe_status || failureData.paypal_status || failureData.payos_status || 'UNKNOWN'}`,
                        'provider_data.paypal_status': failureData.paypal_status,
                        'provider_data.paypal_capture_id': failureData.paypal_capture_id,
                        'provider_data.payos_status': failureData.payos_status,
                        raw_ipn: failureData.raw_ipn,
                        raw_return: failureData.raw_return,
                    },
                    $unset: {
                        expires_at: 1,
                    },
                },
                { session }
            );

            if (result.modifiedCount === 0) {
                const currentPayment = await Payment.findById(payment._id);
                await session.commitTransaction();

                logger.info({
                    event: 'payment_failure_idempotent',
                    payment_id: payment._id.toString(),
                    order_id: payment.order_id.toString(),
                    message: 'Payment failure already processed (idempotent retry)'
                });

                return {
                    status: currentPayment.status,
                    message: 'Payment failure already processed (idempotent)',
                };
            }

            const order = await Order.findById(payment.order_id).session(
                session
            );
            if (!order) {
                throw new AppError(
                    'Order not found for stock restoration',
                    404,
                    'ORDER_NOT_FOUND'
                );
            }

            for (const item of order.items) {
                const qtyItems = item.quantity_ordered * item.pack_size;

                const stockResult = await Variant.updateOne(
                    {
                        _id: item.variant_id,
                        'stock.reserved': { $gte: qtyItems },
                    },
                    {
                        $inc: {
                            'stock.available': +qtyItems,
                            'stock.reserved': -qtyItems,
                        },
                    },
                    { session }
                );

                if (stockResult.modifiedCount === 0) {
                    throw new AppError(
                        `Stock restoration failed for item ${item.product_name}`,
                        500,
                        'STOCK_RESTORATION_FAILED'
                    );
                }

                logger.info({
                    event: 'stock_released',
                    order_id: payment.order_id.toString(),
                    variant_id: item.variant_id.toString(),
                    qty_released: qtyItems,
                    product_name: item.product_name
                });
            }

            await Order.updateOne(
                { _id: order._id },
                { 'payment.status': 'FAILED', status: 'FAILED' },
                { session }
            );

            await session.commitTransaction();

            logger.info({
                event: 'payment_failed',
                payment_id: payment._id.toString(),
                order_id: payment.order_id.toString(),
                user_id: payment.user_id.toString(),
                failure_reason: failureData.failure_reason || 'PAYMENT_REJECTED',
                failure_code: failureData.vnp_ResponseCode ||
                    failureData.stripe_status ||
                    failureData.paypal_status ||
                    failureData.payos_status ||
                    'UNKNOWN'
            });

            if (failureData.audit_action) {
                await this._createPaymentAuditLog({
                    action: failureData.audit_action,
                    payment,
                    metadata: failureData.audit_metadata || {},
                    changes: {
                        status: {
                            from: 'pending',
                            to: 'failed',
                        },
                        failure_code: {
                            from: null,
                            to: failureData.vnp_ResponseCode ||
                                failureData.stripe_status ||
                                failureData.paypal_status ||
                                failureData.payos_status ||
                                'UNKNOWN',
                        },
                    },
                });
            }

            await NotificationEventService.paymentFailed(order, payment, {
                failure_code: failureData.vnp_ResponseCode ||
                    failureData.stripe_status ||
                    failureData.paypal_status ||
                    failureData.payos_status ||
                    'UNKNOWN',
                failure_reason: failureData.failure_reason || 'PAYMENT_REJECTED',
            });

            return {
                status: 'failed',
                orderId: payment.order_id.toString(),
                failureReason: failureData.failure_reason,
                message: 'Payment failed - stock restored',
            };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    static async retryPayment(paymentId, userId, metadata = {}) {
        if (!paymentId || !userId) {
            throw new AppError(
                'Payment ID and user ID required',
                400,
                'MISSING_REQUIRED_PARAMS'
            );
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const payment = await Payment.findOne({
                _id: paymentId,
                user_id: userId,
            }).session(session);

            if (!payment) {
                throw new AppError(
                    'Payment not found',
                    404,
                    'PAYMENT_NOT_FOUND'
                );
            }

            if (payment.status !== 'failed') {
                throw new AppError(
                    'Can only retry failed payments',
                    409,
                    'INVALID_PAYMENT_STATUS'
                );
            }

            this._assertPaymentProviderEnabled(payment.provider);

            const order = await Order.findOne({
                _id: payment.order_id,
                user_id: userId,
                status: 'FAILED',
            }).session(session);

            if (!order) {
                throw new AppError(
                    'Order not found or already processed',
                    404,
                    'ORDER_NOT_FOUND'
                );
            }

            for (const item of order.items) {
                const qtyItems = item.quantity_ordered * item.pack_size;

                const stockResult = await Variant.updateOne(
                    {
                        _id: item.variant_id,
                        status: 'ACTIVE',
                        'stock.available': { $gte: qtyItems },
                    },
                    {
                        $inc: {
                            'stock.available': -qtyItems,
                            'stock.reserved': +qtyItems,
                        },
                    },
                    { session }
                );

                if (stockResult.modifiedCount === 0) {
                    throw new AppError(
                        `Insufficient stock for ${item.product_name}`,
                        409,
                        'INSUFFICIENT_STOCK'
                    );
                }
            }

            const now = new Date();
            const paymentExpiresAt = this._getPaymentExpiresAt(payment.provider);

            const providerData = {
                ...(payment.provider_data?.toObject
                    ? payment.provider_data.toObject()
                    : payment.provider_data),
            };

            if (payment.provider === 'vnpay') {
                providerData.vnp_txn_ref = `${Date.now()}_${payment.order_id.toString()}`;
            }

            if (payment.provider === 'payos') {
                providerData.payos_order_code = this._generatePayOSOrderCode();
                delete providerData.payos_payment_link_id;
                delete providerData.payos_checkout_url;
                delete providerData.payos_qr_code;
                delete providerData.payos_status;
                delete providerData.payos_reference;
                delete providerData.payos_transaction_date_time;
            }

            if (payment.provider === 'paypal') {
                delete providerData.paypal_order_id;
                delete providerData.paypal_capture_id;
                delete providerData.paypal_checkout_url;
                delete providerData.paypal_payer_id;
                delete providerData.paypal_status;
                delete providerData.paypal_amount_value;
                delete providerData.paypal_currency;
                delete providerData.paypal_exchange_rate;
            }

            const updatedPayment = await Payment.findOneAndUpdate(
                {
                    _id: paymentId,
                    user_id: userId,
                    status: 'failed',
                },
                {
                    $set: {
                        status: 'pending',
                        verification_status: 'pending',
                        expires_at: paymentExpiresAt,
                        last_retry_at: now,
                        provider_data: providerData,
                    },
                    $inc: {
                        retry_count: 1,
                    },
                    $unset: {
                        failure_reason: 1,
                        failure_code: 1,
                        failure_message: 1,
                        webhook_verified_at: 1,
                        paid_at: 1,
                        raw_ipn: 1,
                        raw_return: 1,
                    },
                },
                { new: true, session }
            );

            if (!updatedPayment) {
                throw new AppError(
                    'Payment not found or cannot be retried',
                    404,
                    'PAYMENT_NOT_FOUND'
                );
            }

            const orderResult = await Order.updateOne(
                {
                    _id: order._id,
                    user_id: userId,
                    status: 'FAILED',
                },
                {
                    $set: {
                        status: 'PENDING',
                        'payment.status': 'PENDING',
                        payment_expires_at: paymentExpiresAt,
                    },
                    $unset: {
                        'payment.paid_at': 1,
                        payment_id: 1,
                    },
                    $push: {
                        status_history: {
                            from: 'FAILED',
                            to: 'PENDING',
                            changed_at: now,
                            changed_by: null,
                            note: 'Payment retry requested',
                        },
                    },
                },
                { session }
            );

            if (orderResult.modifiedCount === 0) {
                throw new AppError(
                    'Order not found or cannot be retried',
                    409,
                    'INVALID_ORDER_STATUS'
                );
            }

            const paymentUrl = await this._generatePaymentUrl(
                updatedPayment,
                payment.provider,
                metadata,
                { session }
            );

            await session.commitTransaction();

            await this._createPaymentAuditLog({
                action: AUDIT_ACTIONS.RETRY_PAYMENT,
                payment: updatedPayment,
                actorId: userId,
                metadata,
                changes: {
                    status: {
                        from: 'failed',
                        to: 'pending',
                    },
                    retry_count: {
                        from: payment.retry_count,
                        to: updatedPayment.retry_count,
                    },
                },
            });

            return {
                paymentId: updatedPayment._id.toString(),
                payment: PaymentMapper.toResponseDTO(updatedPayment),
                paymentUrl,
            };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    static async cancelPayment(paymentId, userId, reason = 'User cancelled', metadata = {}) {
        if (!paymentId || !userId) {
            throw new AppError(
                'Payment ID and user ID required',
                400,
                'MISSING_REQUIRED_PARAMS'
            );
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const payment = await Payment.findOne({
                _id: paymentId,
                user_id: userId,
            }).session(session);

            if (!payment) {
                throw new AppError(
                    'Payment not found',
                    404,
                    'PAYMENT_NOT_FOUND'
                );
            }

            if (payment.status !== 'pending') {
                throw new AppError(
                    'Can only cancel pending payments',
                    409,
                    'INVALID_PAYMENT_STATUS'
                );
            }

            if (payment.provider === 'payos') {
                await this._cancelPayOSPaymentLink(payment, reason);
            }

            const result = await Payment.updateOne(
                {
                    _id: paymentId,
                    user_id: userId,
                    status: 'pending',
                },
                {
                    $set: {
                        status: 'failed',
                        verification_status: 'verified',
                        webhook_verified_at: new Date(),
                        failure_reason: 'CANCELLED_BY_USER',
                        failure_message: reason,
                    },
                    $unset: {
                        expires_at: 1,
                    },
                },
                { session }
            );

            if (result.modifiedCount === 0) {
                throw new AppError(
                    'Payment not found or cannot be cancelled',
                    404,
                    'PAYMENT_NOT_FOUND'
                );
            }

            const order = await Order.findOne({
                _id: payment.order_id,
                user_id: userId,
            }).session(session);

            if (order) {
                for (const item of order.items) {
                    const qtyItems = item.quantity_ordered * item.pack_size;

                    const stockResult = await Variant.updateOne(
                        {
                            _id: item.variant_id,
                            'stock.reserved': { $gte: qtyItems },
                        },
                        {
                            $inc: {
                                'stock.available': +qtyItems,
                                'stock.reserved': -qtyItems,
                            },
                        },
                        { session }
                    );

                    if (stockResult.modifiedCount === 0) {
                        throw new AppError(
                            `Stock restoration failed for item ${item.product_name}`,
                            500,
                            'STOCK_RESTORATION_FAILED'
                        );
                    }
                }

                await Order.updateOne(
                    {
                        _id: order._id,
                        user_id: userId,
                    },
                    {
                        $set: {
                            status: 'FAILED',
                            'payment.status': 'FAILED',
                        },
                    },
                    { session }
                );
            }

            await session.commitTransaction();

            await this._createPaymentAuditLog({
                action: AUDIT_ACTIONS.CANCEL_PAYMENT,
                payment,
                actorId: userId,
                metadata,
                changes: {
                    status: {
                        from: 'pending',
                        to: 'failed',
                    },
                    failure_reason: {
                        from: null,
                        to: 'CANCELLED_BY_USER',
                    },
                    message: {
                        from: null,
                        to: reason,
                    },
                },
            });

            return {
                status: 'failed',
                reason: 'CANCELLED_BY_USER',
                message: reason,
            };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    static async getPaymentById(paymentId) {
        const payment = await Payment.findById(paymentId);

        if (!payment) {
            throw new AppError(
                'Payment not found',
                404,
                'PAYMENT_NOT_FOUND'
            );
        }

        return payment;
    }

    static async getPaymentByOrder(orderId, status = null) {
        const query = { order_id: orderId };

        if (status) {
            query.status = status;
        }

        return Payment.findOne(query);
    }

    static async getUserPayments(userId, page = 1, limit = 20, filters = {}) {
        const skip = (page - 1) * limit;
        const query = { user_id: userId };

        if (filters.status) {
            if (Array.isArray(filters.status)) {
                query.status = { $in: filters.status };
            } else {
                query.status = filters.status;
            }
        }

        if (filters.provider) {
            query.provider = filters.provider;
        }

        const createdAtRange = this._buildCreatedAtDateRange(filters);
        if (createdAtRange) {
            query.created_at = createdAtRange;
        }

        const total = await Payment.countDocuments(query);
        const payments = await Payment.find(query)
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit);

        return {
            data: payments.map((payment) => PaymentMapper.toListDTO(payment)),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    static async getAllPayments(page = 1, limit = 20, filters = {}) {
        const skip = (page - 1) * limit;
        const query = { is_deleted: false };

        if (filters.status) {
            if (Array.isArray(filters.status)) {
                query.status = { $in: filters.status };
            } else {
                query.status = filters.status;
            }
        }

        if (filters.verification_status) {
            query.verification_status = filters.verification_status;
        }

        if (filters.provider) {
            query.provider = filters.provider;
        }

        const createdAtRange = this._buildCreatedAtDateRange(filters);
        if (createdAtRange) {
            query.created_at = createdAtRange;
        }

        const total = await Payment.countDocuments(query);
        const payments = await Payment.find(query)
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit);

        return {
            data: payments.map((payment) => PaymentMapper.toAdminDTO(payment)),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    static async getPaymentStats(filters = {}) {
        const query = { is_deleted: false };

        if (filters.status) {
            if (Array.isArray(filters.status)) {
                query.status = { $in: filters.status };
            } else {
                query.status = filters.status;
            }
        }

        if (filters.provider) {
            query.provider = filters.provider;
        }

        const createdAtRange = this._buildCreatedAtDateRange(filters);
        if (createdAtRange) {
            query.created_at = createdAtRange;
        }

        const stats = await Payment.aggregate([
            { $match: query },
            {
                $facet: {
                    totalPayments: [{ $count: 'count' }],
                    totalRevenue: [
                        {
                            $match: {
                                status: 'paid',
                            },
                        },
                        {
                            $group: {
                                _id: null,
                                total: { $sum: '$amount' },
                            },
                        },
                    ],
                    statusBreakdown: [
                        {
                            $group: {
                                _id: '$status',
                                count: { $sum: 1 },
                                revenue: {
                                    $sum: {
                                        $cond: [
                                            { $eq: ['$status', 'paid'] },
                                            '$amount',
                                            0,
                                        ],
                                    },
                                },
                            },
                        },
                    ],
                    providerBreakdown: [
                        {
                            $group: {
                                _id: '$provider',
                                count: { $sum: 1 },
                                revenue: {
                                    $sum: {
                                        $cond: [
                                            { $eq: ['$status', 'paid'] },
                                            '$amount',
                                            0,
                                        ],
                                    },
                                },
                            },
                        },
                    ],
                    failedVerifications: [
                        {
                            $match: {
                                verification_status: 'failed',
                            },
                        },
                        { $count: 'count' },
                    ],
                },
            },
        ]);

        return stats[0];
    }

    static _buildCreatedAtDateRange(filters = {}) {
        if (!filters.date_from && !filters.date_to) {
            return null;
        }

        const range = {};

        if (filters.date_from) {
            const from = new Date(filters.date_from);
            from.setHours(0, 0, 0, 0);
            range.$gte = from;
        }

        if (filters.date_to) {
            const to = new Date(filters.date_to);
            to.setHours(23, 59, 59, 999);
            range.$lte = to;
        }

        return range;
    }

    static async auditAdminVerifyPayment(payment, actorId, metadata = {}) {
        await this._createPaymentAuditLog({
            action: AUDIT_ACTIONS.ADMIN_VERIFY_PAYMENT,
            payment,
            actorId,
            metadata,
            changes: {
                verification_status: {
                    from: null,
                    to: payment.verification_status,
                },
                status: {
                    from: null,
                    to: payment.status,
                },
            },
        });
    }

    static async auditPaymentWebhookRejected(provider, error, metadata = {}) {
        await PaymentAuditLogService.createLog({
            actor_id: null,
            action: AUDIT_ACTIONS.PAYMENT_WEBHOOK_REJECTED,
            payment_id: null,
            order_id: null,
            user_id: null,
            provider,
            changes: {
                error_code: {
                    from: null,
                    to: error?.code || error?.errorCode || 'WEBHOOK_REJECTED',
                },
                message: {
                    from: null,
                    to: error?.message || 'Webhook rejected',
                },
            },
            ip_address: metadata.ip || null,
            user_agent: metadata.userAgent || null,
        });
    }



    static async _createPaymentAuditLog({
        action,
        payment = null,
        actorId = null,
        metadata = {},
        changes = {},
    }) {
        await PaymentAuditLogService.createLog({
            actor_id: actorId,
            action,
            payment_id: payment?._id || null,
            order_id: payment?.order_id || null,
            user_id: payment?.user_id || null,
            provider: payment?.provider || null,
            changes,
            ip_address: metadata.ip || null,
            user_agent: metadata.userAgent || null,
        });
    }

    static _verifyVNPayTmnCode(vnpTmnCode) {
        const expectedTmnCode = process.env.VNPAY_TMN_CODE;

        if (!expectedTmnCode) {
            throw new AppError(
                'VNPay TMN code config is missing',
                500,
                'VNPAY_TMN_CODE_MISSING'
            );
        }

        if (!vnpTmnCode || vnpTmnCode !== expectedTmnCode) {
            throw new AppError(
                'VNPay TMN code mismatch',
                401,
                'VNPAY_TMN_CODE_MISMATCH'
            );
        }

        return true;
    }

    static _verifyVNPaySignature(vnpParams) {
        const {
            vnp_SecureHash,
            vnp_SecureHashType,
            ...dataToHash
        } = vnpParams;

        if (!vnp_SecureHash) {
            return false;
        }

        const secureSecret = process.env.VNPAY_SECURE_SECRET;

        if (!secureSecret) {
            return false;
        }

        const sortedParams = this._sortObject(dataToHash);
        const signData = this._buildVNPaySignData(sortedParams);
        const hashAlgorithm = this._getVNPayHashAlgorithm();

        const computedHash = crypto
            .createHmac(hashAlgorithm, secureSecret)
            .update(Buffer.from(signData, 'utf-8'))
            .digest('hex');

        const receivedHash = String(vnp_SecureHash).toLowerCase();
        const expectedHash = computedHash.toLowerCase();

        const receivedBuffer = Buffer.from(receivedHash, 'utf8');
        const expectedBuffer = Buffer.from(expectedHash, 'utf8');

        if (receivedBuffer.length !== expectedBuffer.length) {
            return false;
        }

        return crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
    }

    static _parseStripeWebhookBody(rawBody) {
        try {
            if (Buffer.isBuffer(rawBody)) {
                return JSON.parse(rawBody.toString('utf8'));
            }

            if (typeof rawBody === 'string') {
                return JSON.parse(rawBody);
            }

            if (rawBody && typeof rawBody === 'object') {
                return rawBody;
            }
        } catch (error) {
            throw new AppError(
                'Invalid Stripe webhook body',
                400,
                'INVALID_WEBHOOK_BODY'
            );
        }

        throw new AppError(
            'Invalid Stripe webhook body',
            400,
            'INVALID_WEBHOOK_BODY'
        );
    }

    static _verifyStripeSignature(rawBody, signature) {
        const parts = signature.split(',');
        let timestamp = null;
        let signedHash = null;

        for (const part of parts) {
            const [key, value] = part.split('=');
            if (key === 't') timestamp = value;
            if (key === 'v1') signedHash = value;
        }

        if (!timestamp || !signedHash) {
            return false;
        }

        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!webhookSecret) {
            return false;
        }

        const payload = Buffer.isBuffer(rawBody)
            ? rawBody.toString('utf8')
            : typeof rawBody === 'string'
                ? rawBody
                : JSON.stringify(rawBody);

        const signedContent = `${timestamp}.${payload}`;
        const computed = crypto
            .createHmac('sha256', webhookSecret)
            .update(signedContent)
            .digest('hex');

        const computedBuffer = Buffer.from(computed, 'utf8');
        const signedBuffer = Buffer.from(signedHash, 'utf8');

        if (computedBuffer.length !== signedBuffer.length) {
            return false;
        }

        return crypto.timingSafeEqual(computedBuffer, signedBuffer);
    }

    static async _verifyPayPalWebhook(webhookEvent, webhookHeaders) {
        const requiredHeaders = [
            'transmission_id',
            'transmission_time',
            'cert_url',
            'auth_algo',
            'transmission_sig',
        ];

        const missingHeader = requiredHeaders.find(
            (header) => !webhookHeaders?.[header]
        );

        if (missingHeader) {
            throw new AppError(
                `Missing PayPal webhook header: ${missingHeader}`,
                400,
                'MISSING_WEBHOOK_SIGNATURE'
            );
        }

        const webhookId = process.env.PAYPAL_WEBHOOK_ID;
        if (!webhookId) {
            throw new AppError(
                'PayPal webhook ID config is missing',
                500,
                'PAYPAL_WEBHOOK_ID_MISSING'
            );
        }

        const accessToken = await this._getPayPalAccessToken();
        const paypalApiBaseUrl = this._getPayPalApiBaseUrl();

        const response = await fetch(
            `${paypalApiBaseUrl}/v1/notifications/verify-webhook-signature`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    auth_algo: webhookHeaders.auth_algo,
                    cert_url: webhookHeaders.cert_url,
                    transmission_id: webhookHeaders.transmission_id,
                    transmission_sig: webhookHeaders.transmission_sig,
                    transmission_time: webhookHeaders.transmission_time,
                    webhook_id: webhookId,
                    webhook_event: webhookEvent,
                }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            logger.error({
                event: 'paypal_webhook_verification_request_failed',
                status: response.status,
                response: errorText,
            });

            throw new AppError(
                'PayPal webhook verification request failed',
                502,
                'PAYPAL_WEBHOOK_VERIFICATION_FAILED'
            );
        }

        const result = await response.json();

        if (result.verification_status !== 'SUCCESS') {
            throw new AppError(
                'PayPal webhook signature verification failed',
                401,
                'WEBHOOK_VERIFICATION_FAILED'
            );
        }

        return true;
    }

    static async _getPayPalAccessToken() {
        const clientId = process.env.PAYPAL_CLIENT_ID;
        const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            throw new AppError(
                'PayPal API credentials are missing',
                500,
                'PAYPAL_CONFIG_MISSING'
            );
        }

        const paypalApiBaseUrl = this._getPayPalApiBaseUrl();
        const credentials = Buffer
            .from(`${clientId}:${clientSecret}`)
            .toString('base64');

        const response = await fetch(`${paypalApiBaseUrl}/v1/oauth2/token`, {
            method: 'POST',
            headers: {
                Authorization: `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'grant_type=client_credentials',
        });

        if (!response.ok) {
            const errorText = await response.text();
            logger.error({
                event: 'paypal_access_token_request_failed',
                status: response.status,
                response: errorText,
            });

            throw new AppError(
                'PayPal access token request failed',
                502,
                'PAYPAL_AUTH_FAILED'
            );
        }

        const result = await response.json();

        if (!result.access_token) {
            throw new AppError(
                'PayPal access token missing in response',
                502,
                'PAYPAL_AUTH_FAILED'
            );
        }

        return result.access_token;
    }

    static _getPayPalApiBaseUrl() {
        if (process.env.PAYPAL_API_BASE_URL) {
            return process.env.PAYPAL_API_BASE_URL.replace(/\/$/, '');
        }

        return process.env.PAYPAL_MODE === 'live'
            ? 'https://api-m.paypal.com'
            : 'https://api-m.sandbox.paypal.com';
    }

    static _getPayPalCurrency() {
        return String(process.env.PAYPAL_CURRENCY || 'USD')
            .trim()
            .toUpperCase();
    }

    static _buildPayPalAmount(payment) {
        const paypalCurrency = this._getPayPalCurrency();
        const paymentCurrency = String(payment.currency || 'VND').toUpperCase();
        const amount = Number(payment.amount);

        if (!Number.isFinite(amount) || amount <= 0) {
            throw new AppError(
                'Invalid payment amount for PayPal',
                500,
                'INVALID_PAYMENT_DATA'
            );
        }

        if (paymentCurrency === paypalCurrency) {
            return {
                currency: paypalCurrency,
                value: this._formatPayPalAmount(amount, paypalCurrency),
                exchangeRate: null,
            };
        }

        if (paymentCurrency === 'VND' && paypalCurrency === 'USD') {
            const exchangeRate = Number(process.env.PAYPAL_VND_PER_USD);

            if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
                throw new AppError(
                    'PayPal VND to USD exchange rate config is missing',
                    500,
                    'PAYPAL_EXCHANGE_RATE_MISSING'
                );
            }

            return {
                currency: paypalCurrency,
                value: this._formatPayPalAmount(amount / exchangeRate, paypalCurrency),
                exchangeRate,
            };
        }

        throw new AppError(
            `PayPal currency conversion from ${paymentCurrency} to ${paypalCurrency} is not configured`,
            400,
            'PAYPAL_UNSUPPORTED_CURRENCY'
        );
    }

    static _formatPayPalAmount(amount, currency) {
        const zeroDecimalCurrencies = new Set(['HUF', 'JPY', 'TWD']);
        const normalizedCurrency = String(currency || '').toUpperCase();

        if (zeroDecimalCurrencies.has(normalizedCurrency)) {
            return String(Math.round(amount));
        }

        return (Math.ceil(amount * 100) / 100).toFixed(2);
    }

    static _extractPayPalApprovalUrl(paypalOrder) {
        const links = Array.isArray(paypalOrder?.links) ? paypalOrder.links : [];
        const approvalLink = links.find((link) =>
            ['approve', 'payer-action'].includes(String(link.rel || '').toLowerCase())
        );

        return approvalLink?.href || null;
    }

    static _buildPayPalDescription(order) {
        return `NguyenLien ${order.order_code || order._id.toString()}`.slice(0, 127);
    }

    static _buildPayPalReturnUrl(type, payment) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const backendUrl =
            process.env.BACKEND_URL ||
            `http://localhost:${process.env.PORT || 5000}`;
        const baseUrl = type === 'cancel'
            ? process.env.PAYPAL_CANCEL_URL || `${frontendUrl}/payment-return`
            : process.env.PAYPAL_RETURN_URL || `${backendUrl}/api/v1/payments/paypal-return`;

        return this._appendUrlParams(baseUrl, {
            provider: 'paypal',
            status: type === 'cancel' ? 'failed' : undefined,
            code: type === 'cancel' ? 'CANCELLED' : undefined,
            order_id: payment.order_id.toString(),
            payment_id: payment._id.toString(),
        });
    }

    static async _capturePayPalOrder(paypalOrderId) {
        const accessToken = await this._getPayPalAccessToken();
        const paypalApiBaseUrl = this._getPayPalApiBaseUrl();
        const response = await fetch(
            `${paypalApiBaseUrl}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'PayPal-Request-Id': `capture-${paypalOrderId}`,
                },
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            logger.error({
                event: 'paypal_capture_order_failed',
                paypal_order_id: paypalOrderId,
                status: response.status,
                response: errorText,
            });

            throw new AppError(
                'PayPal capture failed',
                502,
                'PAYPAL_CAPTURE_FAILED'
            );
        }

        return await response.json();
    }

    static _extractPayPalOrderId(resource = {}) {
        if (resource.amount) {
            return resource.supplementary_data?.related_ids?.order_id || null;
        }

        return (
            resource.supplementary_data?.related_ids?.order_id ||
            resource.purchase_units?.[0]?.payments?.captures?.[0]?.supplementary_data?.related_ids?.order_id ||
            resource.id ||
            null
        );
    }

    static _extractPayPalCaptureId(resource = {}) {
        return (
            resource.purchase_units?.[0]?.payments?.captures?.[0]?.id ||
            (String(resource?.id || '').startsWith('CAPTURE-') ? resource.id : null) ||
            (resource?.amount ? resource.id : null)
        );
    }

    static _getPayPalProviderAmount(payment, resource = {}) {
        const capture =
            resource.purchase_units?.[0]?.payments?.captures?.[0] ||
            resource;
        const amount = capture?.amount || resource.purchase_units?.[0]?.amount;
        const providerData = this._getProviderDataObject(payment.provider_data);

        return {
            paypal_amount_value:
                amount?.value ||
                providerData.paypal_amount_value ||
                null,
            paypal_currency:
                amount?.currency_code ||
                providerData.paypal_currency ||
                null,
            paypal_exchange_rate:
                providerData.paypal_exchange_rate ||
                null,
        };
    }

    static async _assertPayPalAmountMatches(payment, resource = {}, metadata = {}) {
        const providerData = this._getProviderDataObject(payment.provider_data);
        const received = this._getPayPalProviderAmount(payment, resource);
        const fallbackExpected = (!providerData.paypal_currency || !providerData.paypal_amount_value)
            ? this._buildPayPalAmount(payment)
            : null;
        const expectedCurrency =
            providerData.paypal_currency ||
            fallbackExpected?.currency;
        const expectedAmount =
            providerData.paypal_amount_value ||
            fallbackExpected?.value;

        if (!received.paypal_amount_value || !received.paypal_currency) {
            return true;
        }

        const receivedAmount = Number(received.paypal_amount_value);
        const normalizedReceived = receivedAmount.toFixed(2);
        const normalizedExpected = Number(expectedAmount).toFixed(2);
        const isMatch =
            received.paypal_currency === expectedCurrency &&
            normalizedReceived === normalizedExpected;

        if (isMatch) {
            return true;
        }

        await Payment.updateOne(
            { _id: payment._id },
            {
                $set: {
                    verification_status: 'failed',
                    failure_reason: 'AMOUNT_MISMATCH',
                    failure_code: 'FRAUD_ATTEMPT',
                    failure_message:
                        `Expected ${expectedAmount} ${expectedCurrency}, received ${received.paypal_amount_value} ${received.paypal_currency}`,
                    webhook_verified_at: new Date(),
                },
            }
        );

        await this._createPaymentAuditLog({
            action: AUDIT_ACTIONS.PAYMENT_WEBHOOK_AMOUNT_MISMATCH,
            payment,
            metadata,
            changes: {
                amount: {
                    from: `${expectedAmount} ${expectedCurrency}`,
                    to: `${received.paypal_amount_value} ${received.paypal_currency}`,
                },
                provider: {
                    from: null,
                    to: 'paypal',
                },
            },
        });

        throw new AppError(
            'PayPal payment amount mismatch',
            409,
            'AMOUNT_MISMATCH_FRAUD_ATTEMPT'
        );
    }

    static _isDuplicateKeyError(error) {
        return error?.code === 11000;
    }

    static async _generatePaymentUrl(payment, provider, metadata = {}, options = {}) {
        this._assertPaymentProviderEnabled(provider);

        if (String(provider || '').trim().toLowerCase() === 'vnpay') {
            return this._generateVNPayPaymentUrl(payment, metadata);
        }

        if (String(provider || '').trim().toLowerCase() === 'paypal') {
            return await this._generatePayPalPaymentUrl(payment, metadata, options);
        }

        if (String(provider || '').trim().toLowerCase() === 'payos') {
            return await this._generatePayOSPaymentUrl(payment, metadata, options);
        }

        throw new AppError(
            'Unsupported payment provider',
            400,
            'UNSUPPORTED_PROVIDER'
        );
    }

    static _assertPaymentProviderEnabled(provider) {
        assertPaymentProviderEnabled(provider);
    }

    static async _generatePayPalPaymentUrl(payment, metadata = {}, options = {}) {
        const providerData = this._getProviderDataObject(payment.provider_data);

        if (providerData.paypal_checkout_url) {
            return providerData.paypal_checkout_url;
        }

        const order = await Order.findById(payment.order_id)
            .session(options.session || null)
            .lean();

        if (!order) {
            throw new AppError(
                'Order not found',
                404,
                'ORDER_NOT_FOUND'
            );
        }

        const paypalAmount = this._buildPayPalAmount(payment);
        const accessToken = await this._getPayPalAccessToken();
        const paypalApiBaseUrl = this._getPayPalApiBaseUrl();
        const returnUrl = this._buildPayPalReturnUrl('return', payment);
        const cancelUrl = this._buildPayPalReturnUrl('cancel', payment);

        let paypalOrder;

        try {
            const response = await fetch(`${paypalApiBaseUrl}/v2/checkout/orders`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'PayPal-Request-Id': `payment-${payment._id.toString()}-${payment.retry_count || 0}`,
                },
                body: JSON.stringify({
                    intent: 'CAPTURE',
                    purchase_units: [
                        {
                            reference_id: payment._id.toString(),
                            custom_id: payment.order_id.toString(),
                            invoice_id: `${payment._id.toString()}-${payment.retry_count || 0}`,
                            description: this._buildPayPalDescription(order),
                            amount: {
                                currency_code: paypalAmount.currency,
                                value: paypalAmount.value,
                            },
                        },
                    ],
                    payment_source: {
                        paypal: {
                            experience_context: {
                                payment_method_preference: 'IMMEDIATE_PAYMENT_REQUIRED',
                                brand_name: 'NguyenLien Shop',
                                locale: 'en-US',
                                landing_page: 'LOGIN',
                                shipping_preference: 'NO_SHIPPING',
                                user_action: 'PAY_NOW',
                                return_url: returnUrl,
                                cancel_url: cancelUrl,
                            },
                        },
                    },
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                logger.error({
                    event: 'paypal_create_order_failed',
                    payment_id: payment._id.toString(),
                    order_id: payment.order_id.toString(),
                    status: response.status,
                    response: errorText,
                });

                throw new AppError(
                    'PayPal order creation failed',
                    502,
                    'PAYPAL_CREATE_ORDER_FAILED'
                );
            }

            paypalOrder = await response.json();
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }

            logger.error({
                event: 'paypal_create_order_request_failed',
                payment_id: payment._id.toString(),
                order_id: payment.order_id.toString(),
                error: error.message,
            });

            throw new AppError(
                'PayPal order creation failed',
                502,
                'PAYPAL_CREATE_ORDER_FAILED'
            );
        }

        const approvalUrl = this._extractPayPalApprovalUrl(paypalOrder);

        if (!paypalOrder.id || !approvalUrl) {
            throw new AppError(
                'PayPal approval URL missing',
                502,
                'PAYPAL_APPROVAL_URL_MISSING'
            );
        }

        const nextProviderData = {
            ...providerData,
            paypal_order_id: paypalOrder.id,
            paypal_checkout_url: approvalUrl,
            paypal_status: paypalOrder.status,
            paypal_amount_value: paypalAmount.value,
            paypal_currency: paypalAmount.currency,
            paypal_exchange_rate: paypalAmount.exchangeRate,
        };

        payment.provider_data = nextProviderData;

        await Payment.updateOne(
            { _id: payment._id },
            {
                $set: {
                    provider_data: nextProviderData,
                },
            },
            options.session ? { session: options.session } : undefined
        );

        return approvalUrl;
    }

    static async _generatePayOSPaymentUrl(payment, metadata = {}, options = {}) {
        const providerData = this._getProviderDataObject(payment.provider_data);

        if (providerData.payos_checkout_url) {
            return providerData.payos_checkout_url;
        }

        if (payment.currency !== 'VND') {
            throw new AppError(
                'PayOS only supports VND payments',
                400,
                'PAYOS_UNSUPPORTED_CURRENCY'
            );
        }

        const orderCode = providerData.payos_order_code ||
            this._generatePayOSOrderCode();
        const amount = Math.round(Number(payment.amount));

        if (!Number.isInteger(amount) || amount <= 0) {
            throw new AppError(
                'Invalid payment amount for PayOS',
                500,
                'INVALID_PAYMENT_DATA'
            );
        }

        const order = await Order.findById(payment.order_id)
            .session(options.session || null)
            .lean();

        if (!order) {
            throw new AppError(
                'Order not found',
                404,
                'ORDER_NOT_FOUND'
            );
        }

        let paymentLink;

        try {
            paymentLink = await this._getPayOSClient().paymentRequests.create({
                orderCode,
                amount,
                description: this._buildPayOSDescription(orderCode),
                cancelUrl: this._buildPayOSReturnUrl('cancel', payment),
                returnUrl: this._buildPayOSReturnUrl('return', payment),
                buyerName: order.address_snapshot?.receiver_name,
                buyerPhone: order.address_snapshot?.phone,
                buyerAddress: order.address_snapshot?.full_address,
                expiredAt: Math.floor(
                    new Date(payment.expires_at || this._getPaymentExpiresAt('payos')).getTime() / 1000
                ),
            });
        } catch (error) {
            logger.error({
                event: 'payos_create_payment_link_failed',
                payment_id: payment._id.toString(),
                order_id: payment.order_id.toString(),
                error: error.message,
            });

            throw new AppError(
                'PayOS payment link creation failed',
                502,
                'PAYOS_CREATE_PAYMENT_FAILED'
            );
        }

        const nextProviderData = {
            ...providerData,
            payos_order_code: paymentLink.orderCode || orderCode,
            payos_payment_link_id: paymentLink.paymentLinkId,
            payos_checkout_url: paymentLink.checkoutUrl,
            payos_qr_code: paymentLink.qrCode,
            payos_status: paymentLink.status,
        };

        payment.provider_data = nextProviderData;

        await Payment.updateOne(
            { _id: payment._id },
            {
                $set: {
                    provider_data: nextProviderData,
                },
            },
            options.session ? { session: options.session } : undefined
        );

        return paymentLink.checkoutUrl;
    }

    static _getPayOSClient() {
        const clientId = process.env.PAYOS_CLIENT_ID;
        const apiKey = process.env.PAYOS_API_KEY;
        const checksumKey = process.env.PAYOS_CHECKSUM_KEY;

        if (!clientId || !apiKey || !checksumKey) {
            throw new AppError(
                'PayOS config is missing',
                500,
                'PAYOS_CONFIG_MISSING'
            );
        }

        if (!payOSClient) {
            payOSClient = new PayOS({
                clientId,
                apiKey,
                checksumKey,
            });
        }

        return payOSClient;
    }

    static async _verifyPayOSWebhook(webhookEvent) {
        try {
            return await this._getPayOSClient().webhooks.verify(webhookEvent);
        } catch (error) {
            throw new AppError(
                'PayOS webhook signature verification failed',
                401,
                'WEBHOOK_VERIFICATION_FAILED'
            );
        }
    }

    static async _cancelPayOSPaymentLink(payment, reason) {
        const providerData = this._getProviderDataObject(payment.provider_data);
        const paymentLinkId =
            providerData.payos_payment_link_id ||
            providerData.payos_order_code;

        if (!paymentLinkId) {
            return null;
        }

        return await this._getPayOSClient().paymentRequests.cancel(
            paymentLinkId,
            reason
        );
    }

    static _isPayOSValidationWebhook(webhookData) {
        return Number(webhookData.orderCode) === 123 &&
            Number(webhookData.amount) === 3000 &&
            webhookData.description === 'VQRIO123';
    }

    static _buildPayOSReturnUrl(type, payment) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const baseUrl = type === 'cancel'
            ? process.env.PAYOS_CANCEL_URL || `${frontendUrl}/payment/cancel`
            : process.env.PAYOS_RETURN_URL || `${frontendUrl}/payment/success`;

        return this._appendUrlParams(baseUrl, {
            provider: 'payos',
            order_id: payment.order_id.toString(),
            payment_id: payment._id.toString(),
        });
    }

    static _appendUrlParams(url, params) {
        try {
            const parsedUrl = new URL(url);

            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    parsedUrl.searchParams.set(key, value);
                }
            });

            return parsedUrl.toString();
        } catch (error) {
            throw new AppError(
                'Invalid PayOS return URL config',
                500,
                'PAYOS_RETURN_URL_INVALID'
            );
        }
    }

    static _buildPayOSDescription(orderCode) {
        return `NLS${String(orderCode).slice(-6)}`;
    }

    static _getProviderDataObject(providerData) {
        if (!providerData) {
            return {};
        }

        return providerData.toObject ? providerData.toObject() : providerData;
    }

    static _getPaymentExpiresAt(provider) {
        const normalizedProvider = String(provider || '').trim().toLowerCase();
        const providerExpiryMinutes = {
            payos: process.env.PAYOS_PAYMENT_EXPIRE_MINUTES,
            paypal: process.env.PAYPAL_PAYMENT_EXPIRE_MINUTES,
        };
        const minutes = providerExpiryMinutes[normalizedProvider] !== undefined
            ? Number(providerExpiryMinutes[normalizedProvider] || 15)
            : 30;
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + minutes);
        return expiresAt;
    }

    static _generatePayOSOrderCode() {
        const timestampPart = Date.now() % 10000000000;
        const randomPart = crypto.randomInt(10, 99);
        return Number(`${timestampPart}${randomPart}`);
    }

    static _assertProviderMatchesOrder(order, provider) {
        const providerByPaymentMethod = {
            VNPAY: 'vnpay',
            PAYPAL: 'paypal',
            PAYOS: 'payos',
        };
        const expectedProvider = providerByPaymentMethod[order.payment?.method];

        if (expectedProvider && expectedProvider !== provider) {
            throw new AppError(
                'Payment provider does not match order payment method',
                409,
                'PAYMENT_PROVIDER_MISMATCH'
            );
        }
    }

    static _generateVNPayPaymentUrl(payment, metadata = {}) {
        const tmnCode = process.env.VNPAY_TMN_CODE;
        const secureSecret = process.env.VNPAY_SECURE_SECRET;
        const paymentUrl = process.env.VNPAY_PAYMENT_URL;
        const returnUrl = process.env.VNPAY_RETURN_URL;

        if (!tmnCode || !secureSecret || !returnUrl || !paymentUrl) {
            throw new AppError(
                'VNPay config is missing',
                500,
                'VNPAY_CONFIG_MISSING'
            );
        }

        if (!payment || !payment._id || !payment.order_id || !payment.amount) {
            throw new AppError(
                'Invalid payment data for VNPay',
                500,
                'INVALID_PAYMENT_DATA'
            );
        }

        const now = new Date();
        const createDate = this._formatVNPayDate(now);
        const expireDate = this._formatVNPayDate(
            payment.expires_at || new Date(now.getTime() + 15 * 60000)
        );
        const ipAddress = this._normalizeVNPayIpAddress(metadata.ip);

        const txnRef =
            payment.provider_data?.vnp_txn_ref ||
            payment._id.toString();

        const rawParams = {
            vnp_Version: '2.1.0',
            vnp_Command: 'pay',
            vnp_TmnCode: tmnCode,
            vnp_Amount: Math.round(Number(payment.amount) * 100),
            vnp_CurrCode: payment.currency || 'VND',
            vnp_TxnRef: txnRef,
            vnp_OrderInfo: `Thanh toan don hang ${payment.order_id.toString()}`,
            vnp_OrderType: 'other',
            vnp_Locale: 'vn',
            vnp_ReturnUrl: returnUrl,
            vnp_IpAddr: ipAddress,
            vnp_CreateDate: createDate,
            vnp_ExpireDate: expireDate,
        };

        const sortedParams = this._sortObject(rawParams);
        const signData = this._buildVNPaySignData(sortedParams);

        const hashAlgorithm = this._getVNPayHashAlgorithm();

        const secureHash = crypto
            .createHmac(hashAlgorithm, secureSecret)
            .update(Buffer.from(signData, 'utf-8'))
            .digest('hex');

        sortedParams.vnp_SecureHash = secureHash;

        const queryString = this._buildVNPayQueryString(sortedParams);

        return `${paymentUrl}?${queryString}`;
    }

    static _sortObject(obj) {
        const sorted = {};

        Object.keys(obj)
            .sort()
            .forEach((key) => {
                const value = obj[key];

                if (
                    value !== undefined &&
                    value !== null &&
                    value !== ''
                ) {
                    sorted[key] = value;
                }
            });

        return sorted;
    }

    static _buildVNPaySignData(params) {
        return Object.keys(params)
            .map((key) => {
                return `${encodeURIComponent(key)}=${encodeURIComponent(params[key]).replace(/%20/g, '+')}`;
            })
            .join('&');
    }

    static _buildVNPayQueryString(params) {
        return Object.keys(params)
            .map((key) => {
                return `${encodeURIComponent(key)}=${encodeURIComponent(params[key]).replace(/%20/g, '+')}`;
            })
            .join('&');
    }

    static _normalizeVNPayIpAddress(ipAddress) {
        const rawIp = String(ipAddress || '').trim();

        if (!rawIp) {
            return '127.0.0.1';
        }

        if (rawIp.startsWith('::ffff:')) {
            return rawIp.slice(7);
        }

        if (rawIp === '::1') {
            return '127.0.0.1';
        }

        return rawIp;
    }

    static _generateVNPayTxnRef(orderId) {
        const normalizedOrderId = String(orderId || '')
            .replace(/[^a-zA-Z0-9]/g, '')
            .toUpperCase();
        const timestamp = Date.now().toString();

        return `${timestamp}${normalizedOrderId}`.slice(0, 100);
    }

    static _formatVNPayDate(date) {
        const pad = (number) => number.toString().padStart(2, '0');

        const year = date.getFullYear();
        const month = pad(date.getMonth() + 1);
        const day = pad(date.getDate());
        const hour = pad(date.getHours());
        const minute = pad(date.getMinutes());
        const second = pad(date.getSeconds());

        return `${year}${month}${day}${hour}${minute}${second}`;
    }

    static _parseVNPayDate(vnpPayDate) {
        if (!vnpPayDate) {
            return null;
        }

        const raw = String(vnpPayDate);

        if (!/^\d{14}$/.test(raw)) {
            throw new AppError(
                'Invalid VNPay pay date format',
                400,
                'INVALID_VNPAY_PAY_DATE'
            );
        }

        const year = Number(raw.slice(0, 4));
        const month = Number(raw.slice(4, 6));
        const day = Number(raw.slice(6, 8));
        const hour = Number(raw.slice(8, 10));
        const minute = Number(raw.slice(10, 12));
        const second = Number(raw.slice(12, 14));

        const parsedDate = new Date(
            year,
            month - 1,
            day,
            hour,
            minute,
            second
        );

        if (Number.isNaN(parsedDate.getTime())) {
            throw new AppError(
                'Invalid VNPay pay date value',
                400,
                'INVALID_VNPAY_PAY_DATE'
            );
        }

        return parsedDate;
    }

    static _getVNPayHashAlgorithm() {
        const rawAlgorithm = (process.env.VNPAY_HASH_ALGORITHM || 'SHA512').toUpperCase();

        const supportedAlgorithms = {
            SHA256: 'sha256',
            SHA512: 'sha512',
        };

        return supportedAlgorithms[rawAlgorithm] || 'sha512';
    }

    static async cleanupExpiredPayments() {
        const expiredPayments = await Payment.find({
            status: 'pending',
            expires_at: { $lt: new Date() },
        });

        let processedCount = 0;
        let failedCount = 0;

        for (const payment of expiredPayments) {
            const session = await mongoose.startSession();
            session.startTransaction();

            try {
                const now = new Date();

                const result = await Payment.updateOne(
                    {
                        _id: payment._id,
                        status: 'pending',
                        expires_at: { $lt: now },
                    },
                    {
                        $set: {
                            status: 'failed',
                            verification_status: 'verified',
                            webhook_verified_at: now,
                            failure_reason: 'PAYMENT_EXPIRED',
                            failure_code: 'EXPIRED',
                            failure_message: 'Payment expired before completion',
                        },
                        $unset: {
                            expires_at: 1,
                        },
                    },
                    { session }
                );

                if (result.modifiedCount === 0) {
                    await session.commitTransaction();
                    continue;
                }

                const order = await Order.findById(payment.order_id).session(session);

                if (order) {
                    for (const item of order.items) {
                        const qtyItems = item.quantity_ordered * item.pack_size;

                        const stockResult = await Variant.updateOne(
                            {
                                _id: item.variant_id,
                                'stock.reserved': { $gte: qtyItems },
                            },
                            {
                                $inc: {
                                    'stock.available': qtyItems,
                                    'stock.reserved': -qtyItems,
                                },
                            },
                            { session }
                        );

                        if (stockResult.modifiedCount === 0) {
                            throw new AppError(
                                `Stock release failed for expired payment item ${item.product_name}`,
                                500,
                                'STOCK_RELEASE_FAILED'
                            );
                        }
                    }

                    await Order.updateOne(
                        { _id: order._id },
                        {
                            $set: {
                                status: 'FAILED',
                                'payment.status': 'FAILED',
                            },
                        },
                        { session }
                    );
                }

                await session.commitTransaction();

                processedCount += 1;

                logger.info({
                    event: 'expired_payment_processed',
                    payment_id: payment._id.toString(),
                    order_id: payment.order_id.toString(),
                });
            } catch (error) {
                await session.abortTransaction();

                failedCount += 1;

                logger.error({
                    event: 'expired_payment_process_failed',
                    payment_id: payment._id.toString(),
                    order_id: payment.order_id?.toString(),
                    error: error.message,
                });
            } finally {
                session.endSession();
            }
        }

        return {
            totalExpired: expiredPayments.length,
            processed: processedCount,
            failed: failedCount,
        };
    }

    static async softDeletePayment(paymentId, actorId = null, metadata = {}) {
        const payment = await Payment.findByIdAndUpdate(
            paymentId,
            {
                is_deleted: true,
                deleted_at: new Date(),
            },
            { new: true }
        );

        if (!payment) {
            throw new AppError(
                'Payment not found',
                404,
                'PAYMENT_NOT_FOUND'
            );
        }

        await this._createPaymentAuditLog({
            action: AUDIT_ACTIONS.DELETE_PAYMENT_SOFT,
            payment,
            actorId,
            metadata,
            changes: {
                is_deleted: {
                    from: false,
                    to: true,
                },
                deleted_at: {
                    from: null,
                    to: payment.deleted_at,
                },
            },
        });

        return PaymentMapper.toAdminDTO(payment);
    }
}

module.exports = PaymentService;
