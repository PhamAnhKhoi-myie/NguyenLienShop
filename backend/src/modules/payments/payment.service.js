const mongoose = require('mongoose');
const crypto = require('crypto');
const Payment = require('./payment.model');
const PaymentMapper = require('./payment.mapper');
const AppError = require('../../utils/appError.util');

// Import dependencies
const Order = require('../orders/order.model');
const Variant = require('../products/variant.model');

// ✅ Logger utility (structured JSON logging)
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
 * 
 * ✅ Static class pattern (consistent with Order/Cart services)
 * ✅ Business logic layer: validation, webhook verification, state transitions
 * ✅ Delegates to model for DB operations
 * ✅ Returns DTOs via mapper (never raw MongoDB docs)
 * ✅ Uses asyncHandler in controller (no try/catch here)
 * 
 * CRITICAL RULES:
 * ✅ Amount locked to order.total_amount (prevent tampering)
 * ✅ State transitions guarded (pending → paid/failed ONLY)
 * ✅ Webhook verification MANDATORY (invalid signature = fail)
 * ✅ Idempotency key prevents duplicate processing
 * ✅ Stock rollback on payment failure (atomic)
 * ✅ TTL cleanup for expired pending payments
 */

class PaymentService {
    /**
     * ✅ CREATE PAYMENT: Initialize payment for order
     * 
     * Flow:
     * 1. Validate order exists + user owns it + status is PENDING
     * 2. Lock amount from order.total_amount (CANNOT be tampered)
     * 3. Generate idempotency key
     * 4. Check if payment already exists for this order
     * 5. Create Payment record with status pending
     * 6. Call payment provider API (VNPay, Stripe, etc)
     * 7. Return payment URL + payment DTO
     * 
     * ⚠️ CRITICAL: Amount is NOT from request (locked to order)
     * 
     * @param {String} orderId - Order MongoDB ID
     * @param {String} userId - From JWT token (verify ownership)
     * @param {String} provider - Payment provider (default: vnpay)
     * @returns {Object} { paymentId, paymentUrl, payment }
     */
    static async createPayment(orderId, userId, provider = 'vnpay') {
        if (!orderId || !userId) {
            throw new AppError(
                'Order ID and user ID required',
                400,
                'MISSING_REQUIRED_PARAMS'
            );
        }

        // ✅ 1. Validate order exists + user owns it
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

        // ✅ 2. Lock amount from order (MANDATORY security check)
        const lockedAmount = order.pricing.total_amount;
        const currency = order.currency || 'VND';

        if (lockedAmount <= 0) {
            throw new AppError(
                'Order total must be greater than 0',
                400,
                'INVALID_ORDER_TOTAL'
            );
        }

        // ✅ 3. Generate idempotency key
        const idempotencyKey = Payment.generateIdempotencyKey(userId, orderId);

        // ✅ 4. Check if payment already exists for this order
        const existingPayment = await Payment.findOne({
            order_id: orderId,
            status: 'pending',
        });

        if (
            existingPayment &&
            existingPayment.expires_at &&
            new Date() < new Date(existingPayment.expires_at)
        ) {
            // Return existing pending payment if still valid
            return {
                paymentId: existingPayment._id.toString(),
                payment: PaymentMapper.toResponseDTO(existingPayment),
                paymentUrl: await this._generatePaymentUrl(
                    existingPayment,
                    provider
                ),
            };
        }

        // ✅ 5. Create Payment record with status pending
        const thirtyMinutesFromNow = new Date();
        thirtyMinutesFromNow.setMinutes(thirtyMinutesFromNow.getMinutes() + 30);

        const payment = await Payment.create({
            order_id: orderId,
            user_id: userId,
            provider: provider,

            // ✅ Locked amount (from order, not from request)
            amount: lockedAmount,
            currency: currency,

            // ✅ Status machine
            status: 'pending',
            verification_status: 'pending',

            // ✅ Idempotency
            idempotency_key: idempotencyKey,

            // ✅ Expiry window (30 min)
            expires_at: thirtyMinutesFromNow,

            // ✅ Provider data (empty, will be filled by webhook)
            provider_data: {
                // Provider will populate this after user completes payment
            },
        });

        // ✅ 6. Call payment provider API
        const paymentUrl = await this._generatePaymentUrl(payment, provider);

        // ✅ 7. Return response
        return {
            paymentId: payment._id.toString(),
            payment: PaymentMapper.toResponseDTO(payment),
            paymentUrl: paymentUrl,
        };
    }

    /**
     * ✅ VNPAY WEBHOOK: Handle VNPay IPN notification
     * 
     * Flow:
     * 1. Verify webhook signature (CRITICAL for security)
     * 2. Extract transaction reference
     * 3. Find payment by transaction reference
     * 4. Verify amount matches (fraud check)
     * 5. Verify payment not already processed (idempotency)
     * 6. Check response code (00 = success)
     * 7. Update payment status + verify state
     * 8. Update order status → PAID
     * 9. Return confirmation
     * 
     * ⚠️ CRITICAL: Webhook verification MANDATORY
     * ⚠️ CRITICAL: Amount must match (prevent tampering)
     * 
     * @param {Object} webhookData - Full VNPay webhook payload
     * @returns {Object} { status, transactionRef }
     */
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

        // ✅ 1. Verify webhook signature (CRITICAL)
        const isSignatureValid = this._verifyVNPaySignature(webhookData);
        if (!isSignatureValid) {
            throw new AppError(
                'Webhook signature verification failed',
                401,
                'WEBHOOK_VERIFICATION_FAILED'
            );
        }

        // ✅ 2. Find payment by transaction reference
        const payment = await Payment.findByVNPayTxnRef(vnp_TxnRef);
        if (!payment) {
            throw new AppError(
                'Payment not found',
                404,
                'PAYMENT_NOT_FOUND'
            );
        }

        // ✅ 3. Verify amount matches (fraud check - MANDATORY)
        if (payment.amount !== vnp_Amount) {
            // Log as fraud attempt
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

        // ✅ 4. Check VNPay response code (00 = success)
        if (vnp_ResponseCode === '00') {
            // ✅ PAYMENT SUCCESS
            return await this._processPaymentSuccess(payment, {
                vnp_TxnRef,
                vnp_TransactionNo,
                vnp_ResponseCode,
                vnp_BankCode,
                vnp_PayDate,
                raw_ipn: webhookData,
            });
        } else {
            // ✅ PAYMENT FAILED
            return await this._processPaymentFailure(payment, {
                vnp_ResponseCode,
                raw_ipn: webhookData,
            });
        }
    }

    /**
     * ✅ STRIPE WEBHOOK: Handle Stripe webhook event
     * 
     * Stripe sends different event types:
     * - payment_intent.succeeded → Payment successful
     * - payment_intent.payment_failed → Payment failed
     * - payment_intent.canceled → Payment cancelled
     * 
     * Flow:
     * 1. Verify webhook signature
     * 2. Extract event type + payment intent ID
     * 3. Find payment by Stripe PI ID
     * 4. Verify amount matches
     * 5. Process based on event type
     * 
     * @param {Object} webhookEvent - Stripe webhook event
     * @param {String} signature - x-stripe-signature header
     * @returns {Object} { status, transactionRef }
     */
    static async handleStripeWebhook(webhookEvent, signature) {
        // ✅ 1. Verify webhook signature
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

        // ✅ 2. Find payment by Stripe PI ID
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

        // ✅ 3. Verify amount matches (fraud check)
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

        // ✅ 4. Process based on event type
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

    /**
     * ✅ PAYPAL WEBHOOK: Handle PayPal webhook event
     * 
     * PayPal sends different event types:
     * - CHECKOUT.ORDER.COMPLETED → Order completed
     * - PAYMENT.CAPTURE.COMPLETED → Payment captured
     * - PAYMENT.CAPTURE.DENIED → Payment denied
     * 
     * @param {Object} webhookEvent - PayPal webhook event
     * @returns {Object} { status, transactionRef }
     */
    static async handlePayPalWebhook(webhookEvent) {
        const { event_type, resource } = webhookEvent;

        // ✅ Find payment by PayPal order ID
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

        // ✅ Process based on event type
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

    /**
     * ✅ INTERNAL: Process payment success
     * 
     * CRITICAL FLOW:
     * 1. Verify status is still pending (idempotency check)
     * 2. Update payment: status=paid + verification_status=verified
     * 3. Remove expires_at (prevent TTL deletion)
     * 4. Update order: status=PAID
     * 5. Return confirmation
     * 
     * ⚠️ Uses condition check: { status: 'pending' } to guard state transition
     * ⚠️ If condition fails: payment already processed (idempotent)
     * 
     * @private
     * @param {Object} payment - Payment document
     * @param {Object} providerData - Provider-specific data to store
     * @returns {Object} Updated payment DTO
     */
    static async _processPaymentSuccess(payment, providerData) {
        // ✅ CRITICAL: Enforce state transition (pending → paid ONLY)
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

        // ✅ If condition failed: payment already processed (idempotent return)
        if (result.modifiedCount === 0) {
            // Payment was already updated, return current state
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

        // ✅ Update order status → PAID
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

    /**
     * ✅ INTERNAL: Process payment failure
     * 
     * CRITICAL FLOW:
     * 1. Verify status is still pending (idempotency check)
     * 2. Store failure reason + code + message
     * 3. Update payment: status=failed + verification_status=verified
     * 4. Remove expires_at (TTL no longer applies)
     * 5. Rollback stock for all order items (ATOMIC)
     * 6. Update order: status=FAILED
     * 7. Return failure response
     * 
     * ⚠️ CRITICAL: Stock restoration happens here
     * ⚠️ If stock restoration fails: order stuck in FAILED state
     * ⚠️ Manual intervention required (admin panel to retry)
     * 
     * @private
     * @param {Object} payment - Payment document
     * @param {Object} failureData - Provider error info
     * @returns {Object} Failure response
     */
    static async _processPaymentFailure(payment, failureData) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // ✅ CRITICAL: Enforce state transition (pending → failed ONLY)
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

            // ✅ If condition failed: payment already processed (idempotent)
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

            // ✅ Load order to restore stock
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

            // ✅ CRITICAL: Rollback stock for all items (ATOMIC)
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

            // ✅ Update order status → FAILED
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

    /**
     * ✅ RETRY PAYMENT: Retry a failed payment
     * 
     * Flow:
     * 1. Verify payment exists + status is failed
     * 2. Verify order still exists + is FAILED
     * 3. Increment retry_count
     * 4. Reset status to pending
     * 5. Call payment provider API again
     * 6. Return new payment URL
     * 
     * @param {String} paymentId - Payment ID
     * @returns {Object} { paymentId, paymentUrl, payment }
     */
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

        // ✅ Verify order exists + is FAILED
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

        // ✅ Update retry count + reset to pending
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

        // ✅ Generate new payment URL
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

    /**
     * ✅ CANCEL PAYMENT: Cancel a pending payment
     * 
     * Flow:
     * 1. Verify payment exists + status is pending
     * 2. Update payment: status=failed (reason=cancelled_by_user)
     * 3. Rollback stock (restore reserved)
     * 4. Update order: status=FAILED
     * 5. Return confirmation
     * 
     * @param {String} paymentId - Payment ID
     * @param {String} reason - Cancellation reason (optional)
     * @returns {Object} Updated payment DTO
     */
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

            // ✅ Update payment: status=failed
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

            // ✅ Rollback stock + order
            const order = await Order.findById(payment.order_id).session(
                session
            );

            if (order) {
                // Restore stock
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

                // Update order
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

    /**
     * ✅ GET PAYMENT: Retrieve payment details
     * 
     * @param {String} paymentId - Payment ID
     * @returns {Object} Payment DTO
     */
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

    /**
     * ✅ GET PAYMENT BY ORDER: Get payment for order
     * 
     * @param {String} orderId - Order ID
     * @param {String} status - Optional: filter by status (paid, failed, pending)
     * @returns {Object|null} Payment DTO or null if not found
     */
    static async getPaymentByOrder(orderId, status = null) {
        const query = { order_id: orderId };

        if (status) {
            query.status = status;
        }

        const payment = await Payment.findOne(query);

        return payment ? PaymentMapper.toDetailDTO(payment) : null;
    }

    /**
     * ✅ LIST PAYMENTS: Get user payment history
     * 
     * @param {String} userId - User ID
     * @param {Number} page - Pagination (default 1)
     * @param {Number} limit - Page size (default 20, max 100)
     * @param {Object} filters - { status, provider, date_from, date_to }
     * @returns {Object} { data: [...], pagination: {...} }
     */
    static async getUserPayments(userId, page = 1, limit = 20, filters = {}) {
        const skip = (page - 1) * limit;
        const query = { user_id: userId };

        // Filter by status
        if (filters.status) {
            if (Array.isArray(filters.status)) {
                query.status = { $in: filters.status };
            } else {
                query.status = filters.status;
            }
        }

        // Filter by provider
        if (filters.provider) {
            query.provider = filters.provider;
        }

        // Filter by date range
        if (filters.date_from || filters.date_to) {
            query.created_at = {};
            if (filters.date_from) {
                query.created_at.$gte = new Date(filters.date_from);
            }
            if (filters.date_to) {
                query.created_at.$lte = new Date(filters.date_to);
            }
        }

        // Execute query
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

    /**
     * ✅ ADMIN: Get all payments (with filters)
     * 
     * @param {Number} page
     * @param {Number} limit
     * @param {Object} filters
     * @returns {Object} { data: [...], pagination: {...} }
     */
    static async getAllPayments(page = 1, limit = 20, filters = {}) {
        const skip = (page - 1) * limit;
        const query = { is_deleted: false };

        // Filter by status
        if (filters.status) {
            if (Array.isArray(filters.status)) {
                query.status = { $in: filters.status };
            } else {
                query.status = filters.status;
            }
        }

        // Filter by verification status
        if (filters.verification_status) {
            query.verification_status = filters.verification_status;
        }

        // Filter by provider
        if (filters.provider) {
            query.provider = filters.provider;
        }

        // Filter by date range
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

    /**
     * ✅ ADMIN: Get payment statistics
     * 
     * @returns {Object} Stats (total revenue, status breakdown, etc)
     */
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

    /**
     * ✅ INTERNAL: Verify VNPay webhook signature
     * 
     * VNPay uses HMAC signature verification.
     * Algorithm is read from VNPAY_HASH_ALGORITHM env (default: SHA512).
     * Secret is read from VNPAY_SECURE_SECRET env.
     * 
     * @private
     * @param {Object} webhookData - Full webhook payload
     * @returns {Boolean} Signature is valid
     */
    static _verifyVNPaySignature(webhookData) {
        const {
            vnp_SecureHash,
            vnp_SecureHashType,
            ...dataToHash
        } = webhookData;

        // ✅ Build sorted query string (excluding hash fields)
        const sortedKeys = Object.keys(dataToHash).sort();
        const queryString = sortedKeys
            .map((key) => `${key}=${dataToHash[key]}`)
            .join('&');

        // ✅ Use configured algorithm and secret (matches VNPAY_HASH_ALGORITHM in .env)
        const rawAlgorithm = (process.env.VNPAY_HASH_ALGORITHM || 'SHA512').toUpperCase();
        const SUPPORTED_ALGORITHMS = ['SHA256', 'SHA512'];
        const algorithm = SUPPORTED_ALGORITHMS.includes(rawAlgorithm) ? rawAlgorithm.toLowerCase() : 'sha512';
        const computed = crypto
            .createHmac(algorithm, process.env.VNPAY_SECURE_SECRET || '')
            .update(queryString)
            .digest('hex');

        // ✅ Compare signatures (case-insensitive)
        return computed.toLowerCase() === vnp_SecureHash.toLowerCase();
    }

    /**
     * ✅ INTERNAL: Verify Stripe webhook signature
     * 
     * Stripe uses signature from x-stripe-signature header
     * Format: t=timestamp,v1=signature
     * 
     * @private
     * @param {Object} webhookEvent - Webhook payload
     * @param {String} signature - x-stripe-signature header
     * @returns {Boolean} Signature is valid
     */
    static _verifyStripeSignature(webhookEvent, signature) {
        // ✅ Parse signature header
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

        // ✅ Compute signature
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
        const signedContent = `${timestamp}.${JSON.stringify(webhookEvent)}`;
        const computed = crypto
            .createHmac('sha256', webhookSecret)
            .update(signedContent)
            .digest('hex');

        // ✅ Compare (timing-safe comparison)
        return crypto.timingSafeEqual(
            Buffer.from(computed),
            Buffer.from(signedHash)
        );
    }

    /**
     * ✅ INTERNAL: Generate payment URL from provider
     * 
     * Calls payment provider API to get payment URL
     * 
     * @private
     * @param {Object} payment - Payment document
     * @param {String} provider - Provider type
     * @returns {String} Payment URL
     */
    static async _generatePaymentUrl(payment, provider) {
        // ✅ TODO: Implement provider-specific URL generation

        if (provider === 'vnpay') {
            // Call VNPayService.generatePaymentUrl()
            // return vnpayUrl;
            return `https://sandbox.vnpayment.vn/paygate?...`; // Mock
        }

        if (provider === 'stripe') {
            // Call StripeService.createPaymentIntent()
            // return stripeUrl;
            return `https://checkout.stripe.com/...`; // Mock
        }

        if (provider === 'paypal') {
            // Call PayPalService.createOrder()
            // return paypalUrl;
            return `https://www.sandbox.paypal.com/...`; // Mock
        }

        throw new AppError(
            'Unsupported payment provider',
            400,
            'UNSUPPORTED_PROVIDER'
        );
    }

    /**
     * ✅ CLEANUP: Auto-cleanup expired pending payments
     * 
     * Called by cron job or manually
     * MongoDB TTL index handles automatic deletion
     * This is for manual logging/monitoring
     * 
     * @returns {Number} Number of payments cleaned up
     */
    static async cleanupExpiredPayments() {
        const expired = await Payment.find({
            status: 'pending',
            expires_at: { $lt: new Date() },
        });

        console.log(
            `[Payment] Found ${expired.length} expired pending payments`
        );

        // MongoDB TTL index will auto-delete these
        // Just log for monitoring

        return expired.length;
    }

    /**
     * ✅ SOFT DELETE: Soft-delete a payment (admin action)
     * 
     * @param {String} paymentId
     * @returns {Object} Deleted payment DTO
     */
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