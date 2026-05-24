const mongoose = require('mongoose');
const crypto = require('crypto');
const Payment = require('./payment.model');
const PaymentMapper = require('./payment.mapper');
const AppError = require('../../utils/appError.util');
const PaymentAuditLogService = require('../audit_logs/payment_audit_log/payment_log.service');
const { AUDIT_ACTIONS } = require('../../constants/audit');

const Order = require('../orders/order.model');
const OrderService = require('../orders/order.service');
const Variant = require('../products/variant.model');
const NotificationEventService = require('../notifications/notification_event.service');

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

/**
 * ============================================
 * PAYMENT SERVICE
 * ============================================
 */

class PaymentService {

    static async createPayment(orderId, userId, provider = 'vnpay', metadata = {}) {
        if (!orderId || !userId) {
            throw new AppError(
                'Order ID and user ID required',
                400,
                'MISSING_REQUIRED_PARAMS'
            );
        }

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
            if (
                provider === 'vnpay' &&
                !existingPayment.provider_data?.vnp_txn_ref
            ) {
                existingPayment.provider_data = {
                    ...existingPayment.provider_data,
                    vnp_txn_ref: `${Date.now()}_${existingPayment.order_id.toString()}`,
                };

                await existingPayment.save();
            }

            return {
                paymentId: existingPayment._id.toString(),
                payment: PaymentMapper.toResponseDTO(existingPayment),
                paymentUrl: await this._generatePaymentUrl(
                    existingPayment,
                    provider
                ),
            };
        }
        const thirtyMinutesFromNow = new Date();
        thirtyMinutesFromNow.setMinutes(thirtyMinutesFromNow.getMinutes() + 30);

        const txnRef = `${Date.now()}_${orderId}`;

        const providerData = {};

        if (provider === 'vnpay') {
            providerData.vnp_txn_ref = txnRef;
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

                expires_at: thirtyMinutesFromNow,

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
                return {
                    paymentId: duplicatedPayment._id.toString(),
                    payment: PaymentMapper.toResponseDTO(duplicatedPayment),
                    paymentUrl: await this._generatePaymentUrl(
                        duplicatedPayment,
                        provider
                    ),
                };
            }

            throw new AppError(
                'Payment already exists for this order',
                409,
                'PAYMENT_ALREADY_EXISTS'
            );
        }

        const paymentUrl = await this._generatePaymentUrl(payment, provider);

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

        if (!event_type || !resource?.id) {
            throw new AppError(
                'Invalid PayPal webhook payload',
                400,
                'INVALID_WEBHOOK_PAYLOAD'
            );
        }

        const payment = await Payment.findOne({
            'provider_data.paypal_order_id': resource.id,
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

        if (
            event_type === 'CHECKOUT.ORDER.COMPLETED' ||
            event_type === 'PAYMENT.CAPTURE.COMPLETED'
        ) {
            return await this._processPaymentSuccess(payment, {
                paypal_order_id: resource.id,
                paypal_status: resource.status,
                raw_return: webhookEvent,
                audit_action: AUDIT_ACTIONS.PAYPAL_WEBHOOK_PAYMENT,
                audit_metadata: metadata,
            });
        } else if (event_type === 'PAYMENT.CAPTURE.DENIED') {
            return await this._processPaymentFailure(payment, {
                paypal_status: resource.status,
                raw_ipn: webhookEvent,
                audit_action: AUDIT_ACTIONS.PAYPAL_WEBHOOK_PAYMENT,
                audit_metadata: metadata,
            });
        }

        return {
            status: 'pending',
            transactionRef: resource.id,
        };
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
                                providerData.paypal_order_id ||
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
                    providerData.paypal_order_id ||
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
                    status: 'pending', // ← MANDATORY condition
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
                            || 'UNKNOWN',
                        failure_message:
                            failureData.failure_message ||
                            `Payment failed with code: ${failureData.vnp_ResponseCode || failureData.stripe_status}`,
                        raw_ipn: failureData.raw_ipn,
                    },
                    $unset: {
                        expires_at: 1, // ← Remove TTL field
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
                        'stock.reserved': { $gte: qtyItems }, // ← Must have reserved
                    },
                    {
                        $inc: {
                            'stock.available': +qtyItems, // Restore
                            'stock.reserved': -qtyItems, // Release
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
                failure_code: failureData.vnp_ResponseCode || failureData.stripe_status || 'UNKNOWN'
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
                                'UNKNOWN',
                        },
                    },
                });
            }

            await NotificationEventService.paymentFailed(order, payment, {
                failure_code: failureData.vnp_ResponseCode ||
                    failureData.stripe_status ||
                    failureData.paypal_status ||
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
            const thirtyMinutesFromNow = new Date(now);
            thirtyMinutesFromNow.setMinutes(thirtyMinutesFromNow.getMinutes() + 30);

            const providerData = {
                ...(payment.provider_data?.toObject
                    ? payment.provider_data.toObject()
                    : payment.provider_data),
            };

            if (payment.provider === 'vnpay') {
                providerData.vnp_txn_ref = `${Date.now()}_${payment.order_id.toString()}`;
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
                        expires_at: thirtyMinutesFromNow,
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
                        payment_expires_at: thirtyMinutesFromNow,
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
                payment.provider
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

        if (filters.date_from || filters.date_to) {
            query.created_at = {};
            if (filters.date_from) {
                query.created_at.$gte = new Date(filters.date_from);
            }
            if (filters.date_to) {
                query.created_at.$lte = new Date(filters.date_to);
            }
        }

        const total = await Payment.countDocuments(query);
        const payments = await Payment.find(query)
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit);

        return {
            data: payments.map(PaymentMapper.toListDTO),
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

        if (filters.date_from || filters.date_to) {
            query.created_at = {};
            if (filters.date_from) {
                query.created_at.$gte = new Date(filters.date_from);
            }
            if (filters.date_to) {
                query.created_at.$lte = new Date(filters.date_to);
            }
        }

        const total = await Payment.countDocuments(query);
        const payments = await Payment.find(query)
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit);

        return {
            data: payments.map(PaymentMapper.toAdminDTO),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    static async getPaymentStats() {
        const stats = await Payment.aggregate([
            { $match: { is_deleted: false } },
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

    // ===== INTERNAL HELPERS =====

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

    static _isDuplicateKeyError(error) {
        return error?.code === 11000;
    }

    static async _generatePaymentUrl(payment, provider) {
        this._assertPaymentProviderEnabled(provider);

        if (provider === 'vnpay') {
            return this._generateVNPayPaymentUrl(payment);
        }

        throw new AppError(
            'Unsupported payment provider',
            400,
            'UNSUPPORTED_PROVIDER'
        );
    }

    static _assertPaymentProviderEnabled(provider) {
        if (provider === 'vnpay') {
            return true;
        }

        throw new AppError(
            'Payment provider is not enabled',
            400,
            'PAYMENT_PROVIDER_NOT_ENABLED'
        );
    }

    static _generateVNPayPaymentUrl(payment) {
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
            vnp_IpAddr: '127.0.0.1',
            vnp_CreateDate: createDate,
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
