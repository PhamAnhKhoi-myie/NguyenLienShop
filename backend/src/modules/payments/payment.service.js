const mongoose = require('mongoose');
const crypto = require('crypto');
const Payment = require('./payment.model');
const PaymentMapper = require('./payment.mapper');
const AppError = require('../../utils/appError.util');

const Order = require('../orders/order.model');
const Variant = require('../products/variant.model');

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

    static async createPayment(orderId, userId, provider = 'vnpay') {
        if (!orderId || !userId) {
            throw new AppError(
                'Order ID and user ID required',
                400,
                'MISSING_REQUIRED_PARAMS'
            );
        }

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
            status: 'pending',
        });

        if (
            existingPayment &&
            existingPayment.expires_at &&
            new Date() < new Date(existingPayment.expires_at)
        ) {
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

        const payment = await Payment.create({
            order_id: orderId,
            user_id: userId,
            provider: provider,

            amount: lockedAmount,
            currency: currency,

            status: 'pending',
            verification_status: 'pending',

            idempotency_key: idempotencyKey,

            expires_at: thirtyMinutesFromNow,

            provider_data: {
            },
        });

        const paymentUrl = await this._generatePaymentUrl(payment, provider);

        return {
            paymentId: payment._id.toString(),
            payment: PaymentMapper.toResponseDTO(payment),
            paymentUrl: paymentUrl,
        };
    }

    static async handleVNPayWebhook(webhookData) {
        const {
            vnp_TxnRef,
            vnp_Amount,
            vnp_ResponseCode,
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

        const payment = await Payment.findByVNPayTxnRef(vnp_TxnRef);
        if (!payment) {
            throw new AppError(
                'Payment not found',
                404,
                'PAYMENT_NOT_FOUND'
            );
        }

        if (payment.amount !== vnp_Amount) {
            await Payment.updateOne(
                { _id: payment._id },
                {
                    $set: {
                        verification_status: 'failed',
                        failure_reason: 'AMOUNT_MISMATCH',
                        failure_code: 'FRAUD_ATTEMPT',
                        failure_message: `Expected ${payment.amount}, received ${vnp_Amount}`,
                        webhook_verified_at: new Date(),
                    },
                }
            );

            throw new AppError(
                'Payment amount mismatch - possible fraud',
                409,
                'AMOUNT_MISMATCH_FRAUD_ATTEMPT'
            );
        }

        if (vnp_ResponseCode === '00') {
            return await this._processPaymentSuccess(payment, {
                vnp_TxnRef,
                vnp_TransactionNo,
                vnp_ResponseCode,
                vnp_BankCode,
                vnp_PayDate,
                raw_ipn: webhookData,
            });
        } else {
            return await this._processPaymentFailure(payment, {
                vnp_ResponseCode,
                raw_ipn: webhookData,
            });
        }
    }

    static async handleStripeWebhook(webhookEvent, signature) {
        const isSignatureValid = this._verifyStripeSignature(
            webhookEvent,
            signature
        );
        if (!isSignatureValid) {
            throw new AppError(
                'Stripe webhook signature verification failed',
                401,
                'WEBHOOK_VERIFICATION_FAILED'
            );
        }

        const { type, data } = webhookEvent;
        const { object } = data;

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
            });
        } else if (
            type === 'payment_intent.payment_failed' ||
            type === 'payment_intent.canceled'
        ) {
            return await this._processPaymentFailure(payment, {
                stripe_status: object.status,
                raw_ipn: webhookEvent,
            });
        }

        return {
            status: 'pending',
            transactionRef: object.id,
        };
    }

    static async handlePayPalWebhook(webhookEvent) {
        const { event_type, resource } = webhookEvent;

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
            });
        } else if (event_type === 'PAYMENT.CAPTURE.DENIED') {
            return await this._processPaymentFailure(payment, {
                paypal_status: resource.status,
                raw_ipn: webhookEvent,
            });
        }

        return {
            status: 'pending',
            transactionRef: resource.id,
        };
    }

    static async _processPaymentSuccess(payment, providerData) {
        const result = await Payment.updateOne(
            {
                _id: payment._id,
                status: 'pending', // ← MANDATORY condition
            },
            {
                $set: {
                    status: 'paid',
                    verification_status: 'verified',
                    webhook_verified_at: new Date(),
                    paid_at: new Date(),
                    'provider_data.vnp_transaction_no':
                        providerData.vnp_TransactionNo,
                    'provider_data.vnp_response_code':
                        providerData.vnp_ResponseCode,
                    'provider_data.vnp_bank_code': providerData.vnp_BankCode,
                    'provider_data.vnp_pay_date': providerData.vnp_PayDate,
                    'provider_data.stripe_status':
                        providerData.stripe_status,
                    'provider_data.paypal_status':
                        providerData.paypal_status,
                    raw_ipn: providerData.raw_ipn,
                    raw_return: providerData.raw_return,
                },
                $unset: {
                    expires_at: 1, // ← CRITICAL: Remove TTL field to prevent auto-deletion
                },
            }
        );

        if (result.modifiedCount === 0) {
            const currentPayment = await Payment.findById(payment._id);

            logger.info({
                event: 'payment_success_idempotent',
                payment_id: payment._id.toString(),
                order_id: payment.order_id.toString(),
                message: 'Payment already processed (idempotent retry)'
            });

            return {
                status: currentPayment.status,
                transactionRef: PaymentMapper.getTransactionRef(
                    currentPayment.provider_data
                ),
                message: 'Payment already processed (idempotent)',
            };
        }

        const order = await Order.findByIdAndUpdate(
            payment.order_id,
            { 'payment.status': 'PAID', 'payment.paid_at': new Date() },
            { new: true }
        );

        if (!order) {
            console.error(
                `[Payment] Order not found after payment success: ${payment.order_id}`
            );
        }

        // ✅ CRITICAL: FINALIZE STOCK (reserved → sold)
        // This is the point where stock is permanently locked
        if (order && order.items && order.items.length > 0) {
            for (const item of order.items) {
                // ✅ quantity_ordered = number of packs
                // ✅ pack_size = items per pack
                // ✅ total physical items = quantity_ordered * pack_size
                const qtyToFinalize = item.quantity_ordered * item.pack_size;

                const stockResult = await Variant.updateOne(
                    {
                        _id: item.variant_id,
                        'stock.reserved': { $gte: qtyToFinalize }  // ← Must have reserved
                    },
                    {
                        $inc: {
                            'stock.reserved': -qtyToFinalize,     // Remove from reserved
                            'stock.sold': +qtyToFinalize          // Move to sold (PERMANENT)
                        }
                    }
                );

                if (stockResult.modifiedCount === 0) {
                    // ⚠️ Critical issue: reserved stock missing
                    // This should not happen if checkout was atomic
                    logger.error({
                        event: 'stock_finalize_failed',
                        order_id: payment.order_id.toString(),
                        variant_id: item.variant_id.toString(),
                        item_name: item.product_name,
                        qty_expected: qtyToFinalize
                    });

                    throw new AppError(
                        `Stock finalization failed for ${item.product_name}`,
                        500,
                        'STOCK_FINALIZE_FAILED'
                    );
                }

                logger.info({
                    event: 'stock_finalized',
                    order_id: payment.order_id.toString(),
                    variant_id: item.variant_id.toString(),
                    qty_finalized: qtyToFinalize,
                    product_name: item.product_name
                });
            }
        }

        logger.info({
            event: 'payment_success',
            payment_id: payment._id.toString(),
            order_id: payment.order_id.toString(),
            user_id: payment.user_id.toString(),
            amount: payment.amount,
            currency: payment.currency
        });

        return {
            status: 'paid',
            transactionRef: PaymentMapper.getTransactionRef(
                providerData
            ),
            orderId: payment.order_id.toString(),
        };
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

    static async retryPayment(paymentId) {
        const payment = await Payment.findById(paymentId);
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

        const order = await Order.findOne({
            _id: payment.order_id,
            status: 'FAILED',
        });

        if (!order) {
            throw new AppError(
                'Order not found or already processed',
                404,
                'ORDER_NOT_FOUND'
            );
        }

        const thirtyMinutesFromNow = new Date();
        thirtyMinutesFromNow.setMinutes(thirtyMinutesFromNow.getMinutes() + 30);

        const updatedPayment = await Payment.findByIdAndUpdate(
            paymentId,
            {
                status: 'pending',
                verification_status: 'pending',
                expires_at: thirtyMinutesFromNow,
                $inc: { retry_count: 1 },
                last_retry_at: new Date(),
            },
            { new: true }
        );

        const paymentUrl = await this._generatePaymentUrl(
            updatedPayment,
            payment.provider
        );

        return {
            paymentId: updatedPayment._id.toString(),
            payment: PaymentMapper.toResponseDTO(updatedPayment),
            paymentUrl: paymentUrl,
        };
    }

    static async cancelPayment(paymentId, reason = 'User cancelled') {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const payment = await Payment.findById(paymentId).session(session);
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

            await Payment.updateOne(
                { _id: paymentId },
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

            const order = await Order.findById(payment.order_id).session(
                session
            );

            if (order) {
                for (const item of order.items) {
                    const qtyItems = item.quantity_ordered * item.pack_size;

                    await Variant.updateOne(
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
                }

                await Order.updateOne(
                    { _id: order._id },
                    { status: 'FAILED' },
                    { session }
                );
            }

            await session.commitTransaction();

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

        return PaymentMapper.toDetailDTO(payment);
    }

    static async getPaymentByOrder(orderId, status = null) {
        const query = { order_id: orderId };

        if (status) {
            query.status = status;
        }

        const payment = await Payment.findOne(query);

        return payment ? PaymentMapper.toDetailDTO(payment) : null;
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
                                revenue: { $sum: '$amount' },
                            },
                        },
                    ],
                    providerBreakdown: [
                        {
                            $group: {
                                _id: '$provider',
                                count: { $sum: 1 },
                                revenue: { $sum: '$amount' },
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

    // ===== INTERNAL HELPERS =====

    static _verifyVNPaySignature(webhookData) {
        const {
            vnp_SecureHash,
            vnp_SecureHashType,
            ...dataToHash
        } = webhookData;

        const sortedKeys = Object.keys(dataToHash).sort();
        const queryString = sortedKeys
            .map((key) => `${key}=${dataToHash[key]}`)
            .join('&');

        const rawAlgorithm = (process.env.VNPAY_HASH_ALGORITHM || 'SHA512').toUpperCase();
        const SUPPORTED_ALGORITHMS = ['SHA256', 'SHA512'];
        const algorithm = SUPPORTED_ALGORITHMS.includes(rawAlgorithm) ? rawAlgorithm.toLowerCase() : 'sha512';
        const computed = crypto
            .createHmac(algorithm, process.env.VNPAY_SECURE_SECRET || '')
            .update(queryString)
            .digest('hex');

        return computed.toLowerCase() === vnp_SecureHash.toLowerCase();
    }

    static _verifyStripeSignature(webhookEvent, signature) {
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

        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
        const signedContent = `${timestamp}.${JSON.stringify(webhookEvent)}`;
        const computed = crypto
            .createHmac('sha256', webhookSecret)
            .update(signedContent)
            .digest('hex');

        return crypto.timingSafeEqual(
            Buffer.from(computed),
            Buffer.from(signedHash)
        );
    }

    static async _generatePaymentUrl(payment, provider) {

        if (provider === 'vnpay') {
            return `https://sandbox.vnpayment.vn/paygate?...`; // Mock
        }

        if (provider === 'stripe') {
            return `https://checkout.stripe.com/...`; // Mock
        }

        if (provider === 'paypal') {
            return `https://www.sandbox.paypal.com/...`; // Mock
        }

        throw new AppError(
            'Unsupported payment provider',
            400,
            'UNSUPPORTED_PROVIDER'
        );
    }

    static async cleanupExpiredPayments() {
        const expired = await Payment.find({
            status: 'pending',
            expires_at: { $lt: new Date() },
        });

        console.log(
            `[Payment] Found ${expired.length} expired pending payments`
        );


        return expired.length;
    }

    static async softDeletePayment(paymentId) {
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

        return PaymentMapper.toAdminDTO(payment);
    }
}

module.exports = PaymentService;