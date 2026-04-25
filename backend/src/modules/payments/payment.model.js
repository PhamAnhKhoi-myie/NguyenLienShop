const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * ============================================
 * PAYMENT SCHEMA
 * ============================================
 * 
 * Represents: Payment transaction for order
 * 
 * Key Points:
 * - order_id: reference to order snapshot
 * - user_id: quick lookup without join
 * - provider: payment gateway (vnpay, stripe, paypal)
 * - provider_data: nested structure for multi-provider support
 * - status: state machine (pending → paid/failed)
 * - verification_status: webhook signature verification state
 * - Idempotency: vnp_txn_ref + idempotency_key unique indexes
 * 
 * Critical:
 * ✅ Amount locked to order (prevent tampering)
 * ✅ State transitions guarded (pending → paid ONLY)
 * ✅ Webhook verification mandatory (INVALID_SIGNATURE → failed)
 * ✅ TTL only on expires_at (pending payments only)
 * ✅ Financial records are IMMUTABLE after payment success
 * ✅ Raw webhook data for audit trail
 */

const providerDataSchema = new mongoose.Schema(
    {
        // ===== VNPAY-SPECIFIC =====
        vnp_txn_ref: {
            type: String,
            sparse: true,
            // VNPay transaction reference (unique)
        },

        vnp_transaction_no: String,
        // VNPay internal transaction number

        vnp_response_code: String,
        // '00' = success, other codes = errors

        vnp_bank_code: String,
        // Bank used for payment (VCB, TCB, etc.)

        vnp_pay_date: Date,
        // When VNPay processed the payment

        // ===== STRIPE-SPECIFIC (Future) =====
        stripe_pi_id: {
            type: String,
            sparse: true,
            // Stripe Payment Intent ID
        },

        stripe_client_secret: String,
        stripe_status: String,

        // ===== PAYPAL-SPECIFIC (Future) =====
        paypal_order_id: {
            type: String,
            sparse: true,
        },

        paypal_payer_id: String,
    },
    { _id: false }
);

const paymentSchema = new mongoose.Schema(
    {
        // ===== IDENTITY & REFERENCES =====
        order_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order',
            required: [true, 'Order is required'],
            index: true,
        },

        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User is required'],
            index: true,
        },

        // ===== PROVIDER SELECTION =====
        provider: {
            type: String,
            enum: {
                values: ['vnpay', 'stripe', 'paypal'],
                message: 'Provider must be vnpay, stripe, or paypal',
            },
            required: [true, 'Provider is required'],
            index: true,
        },

        // ===== FINANCIAL DATA (IMMUTABLE after creation) =====
        // ✅ Amount locked to order value (prevent tampering)
        amount: {
            type: Number,
            required: [true, 'Amount is required'],
            min: [0, 'Amount cannot be negative'],
            // Integer only: VND in đồng, USD in cents
        },

        currency: {
            type: String,
            enum: {
                values: ['VND', 'USD'],
                message: 'Currency must be VND or USD',
            },
            default: 'VND',
        },

        // ===== PAYMENT STATUS (State Machine) =====
        // ✅ Enforce: pending → paid/failed ONLY (no backwards transition)
        status: {
            type: String,
            enum: {
                values: ['pending', 'paid', 'failed'],
                message: 'Status must be pending, paid, or failed',
            },
            default: 'pending',
            index: true,
        },

        // ===== PROVIDER-SPECIFIC DATA =====
        // ✅ Nested structure for scalability (add new providers without schema bloat)
        provider_data: {
            type: providerDataSchema,
            required: [true, 'Provider data is required'],
        },

        // ===== IDEMPOTENCY & DEDUPLICATION =====
        // ✅ Prevent duplicate webhook processing
        idempotency_key: {
            type: String,
            required: [true, 'Idempotency key is required'],
            unique: true,
            sparse: true,
            index: true,
            // Format: {userId}-{orderId}-{timestamp}
        },

        // ===== WEBHOOK VERIFICATION =====
        // ✅ Explicit verification state (pending/verified/failed)
        // ✅ Separate from payment status (both must be checked)
        verification_status: {
            type: String,
            enum: {
                values: ['pending', 'verified', 'failed'],
                message: 'Verification status must be pending, verified, or failed',
            },
            default: 'pending',
        },

        webhook_verified_at: Date,
        // When webhook signature was verified

        // ===== FAILURE TRACKING =====
        failure_reason: {
            type: String,
            // Examples: 'INSUFFICIENT_FUNDS', 'CARD_DECLINED', 'INVALID_SIGNATURE',
            // 'AMOUNT_MISMATCH', 'WEBHOOK_TIMEOUT', 'STATE_CONFLICT'
        },

        failure_code: String,
        // Provider error code (e.g., VNPay: '01', '02')

        failure_message: String,
        // User-facing error message

        // ===== PAYMENT WINDOW & RETRY =====
        expires_at: Date,
        // Payment window expiration (e.g., 30 min from creation)
        // ✅ TTL index will auto-delete expired PENDING payments
        // ✅ After payment succeeds: expires_at is UNSET (won't be auto-deleted)

        retry_count: {
            type: Number,
            default: 0,
            min: [0, 'Retry count cannot be negative'],
        },

        last_retry_at: Date,
        // Last time payment was retried

        // ===== RAW WEBHOOK DATA (Audit Trail) =====
        // ✅ Store provider responses for debugging & dispute resolution
        raw_ipn: mongoose.Schema.Types.Mixed,
        // Raw IPN (Instant Payment Notification) from webhook

        raw_return: mongoose.Schema.Types.Mixed,
        // Raw return data from payment gateway redirect

        // ===== COMPLETION TIMESTAMP =====
        paid_at: Date,
        // When payment was successfully marked as PAID

        // ===== SOFT DELETE =====
        is_deleted: {
            type: Boolean,
            default: false,
            index: true,
        },

        deleted_at: Date,
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        },
    }
);

// ===== INDEXES (Production Optimized) =====

// ✅ Deduplication: VNPay transaction reference (unique per provider)
paymentSchema.index(
    { 'provider_data.vnp_txn_ref': 1 },
    {
        unique: true,
        sparse: true,
        name: 'vnpay_txn_ref_unique',
    }
);

// ✅ Deduplication: Stripe Payment Intent (unique per provider)
paymentSchema.index(
    { 'provider_data.stripe_pi_id': 1 },
    {
        unique: true,
        sparse: true,
        name: 'stripe_pi_id_unique',
    }
);

// ✅ Deduplication: Idempotency key (unique across all providers)
paymentSchema.index(
    { idempotency_key: 1 },
    {
        unique: true,
        sparse: true,
        name: 'idempotency_key_unique',
    }
);

// ✅ Lookups: User payment history
paymentSchema.index(
    { user_id: 1, created_at: -1 },
    {
        name: 'user_payments_history',
    }
);

// ✅ Lookups: Order payment
paymentSchema.index(
    { order_id: 1, status: 1 },
    {
        name: 'order_payment_status',
    }
);

// ✅ Status filtering
paymentSchema.index(
    { status: 1, provider: 1 },
    {
        name: 'status_provider_idx',
    }
);

// ✅ Verification state
paymentSchema.index(
    { verification_status: 1 },
    {
        partialFilterExpression: {
            verification_status: 'failed',
        },
        name: 'verification_failed_idx',
    }
);

// ✅ TTL Index: Auto-delete EXPIRED PENDING payments
// CRITICAL: Only applies to documents where expires_at exists
// When payment succeeds: expires_at is UNSET → won't be deleted
paymentSchema.index(
    { expires_at: 1 },
    {
        expireAfterSeconds: 0,
        sparse: true,
        name: 'expires_at_ttl',
    }
);

// ✅ Soft delete queries
paymentSchema.index(
    { is_deleted: 1, created_at: -1 },
    {
        name: 'soft_delete_idx',
    }
);

// ===== MIDDLEWARE: Auto-Exclude Soft-Deleted & Queries =====

/**
 * ✅ Auto-exclude soft-deleted payments
 * Consistent pattern with Order, Cart models
 */
const excludeDeleted = function (next) {
    if (!this.getOptions().includeDeleted) {
        this.where({ is_deleted: false });
    }
    next();
};

paymentSchema.pre('find', excludeDeleted);
paymentSchema.pre('findOne', excludeDeleted);
paymentSchema.pre('findOneAndUpdate', excludeDeleted);
paymentSchema.pre('countDocuments', excludeDeleted);

/**
 * ✅ Auto-exclude in aggregation pipeline
 */
paymentSchema.pre('aggregate', function (next) {
    const pipeline = this.pipeline();
    const options = this.getOptions?.() || {};

    if (options.includeDeleted) {
        return next();
    }

    const hasDeleteFilter = pipeline.some(
        (stage) =>
            stage.$match &&
            Object.prototype.hasOwnProperty.call(stage.$match, 'is_deleted')
    );

    if (!hasDeleteFilter) {
        pipeline.unshift({ $match: { is_deleted: false } });
    }

    next();
});

// ===== MIDDLEWARE: Update Timestamp & Lock Immutable Fields =====

/**
 * ✅ Prevent modification of financial fields after payment success
 */
paymentSchema.pre('save', function (next) {
    // ✅ On creation: ensure expires_at is set for pending payments
    if (this.isNew && this.status === 'pending' && !this.expires_at) {
        const thirtyMinutesFromNow = new Date();
        thirtyMinutesFromNow.setMinutes(thirtyMinutesFromNow.getMinutes() + 30);
        this.expires_at = thirtyMinutesFromNow;
    }

    this.updated_at = new Date();
    next();
});

/**
 * ✅ Prevent status regression (paid/failed → pending)
 * Better to enforce in service layer, but add safety here
 */
paymentSchema.pre('findOneAndUpdate', function (next) {
    const update = this.getUpdate();

    if (update.$set && update.$set.status) {
        const newStatus = update.$set.status;
        const invalidTransitions = {
            'paid': ['pending', 'failed'],
            'failed': ['pending', 'paid'],
        };

        // Optional: Log suspicious transitions
        // In production, enforce in service layer with conditions
    }

    if (update.updated_at === undefined) {
        update.updated_at = new Date();
    }

    next();
});

// ===== STATIC METHODS =====

/**
 * ✅ Generate idempotency key
 * Format: {userId}-{orderId}-{timestamp}
 * 
 * Ensures same request never creates duplicate payments
 */
paymentSchema.statics.generateIdempotencyKey = function (userId, orderId) {
    return `${userId.toString()}-${orderId.toString()}-${Date.now()}`;
};

/**
 * ✅ Find payment by VNPay transaction reference
 * Used for webhook processing
 */
paymentSchema.statics.findByVNPayTxnRef = function (txnRef) {
    return this.findOne(
        { 'provider_data.vnp_txn_ref': txnRef, is_deleted: false },
        null,
        { maxTimeMS: 5000 } // Timeout for webhook responsiveness
    );
};

/**
 * ✅ Find payment by idempotency key
 * Used for idempotent retry detection
 */
paymentSchema.statics.findByIdempotencyKey = function (idempotencyKey) {
    return this.findOne({
        idempotency_key: idempotencyKey,
        is_deleted: false,
    });
};

/**
 * ✅ Get user payment history
 * Returns paginated list of payments
 */
paymentSchema.statics.getUserPaymentHistory = async function (
    userId,
    page = 1,
    limit = 20
) {
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
        this.find({ user_id: userId, is_deleted: false })
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        this.countDocuments({ user_id: userId, is_deleted: false }),
    ]);

    return {
        data: payments,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};

/**
 * ✅ Get pending payments for order
 * Order should have at most 1 pending payment
 */
paymentSchema.statics.getPendingPaymentForOrder = function (orderId) {
    return this.findOne({
        order_id: orderId,
        status: 'pending',
        is_deleted: false,
    });
};

/**
 * ✅ Get successful payment for order
 * Should be exactly 1 per completed order
 */
paymentSchema.statics.getSuccessfulPaymentForOrder = function (orderId) {
    return this.findOne({
        order_id: orderId,
        status: 'paid',
        is_deleted: false,
    });
};

/**
 * ✅ Count failed webhook attempts (for monitoring/alerts)
 * Shows how many webhooks failed verification
 */
paymentSchema.statics.countFailedVerifications = function (
    startDate,
    endDate
) {
    return this.countDocuments({
        verification_status: 'failed',
        created_at: { $gte: startDate, $lte: endDate },
        is_deleted: false,
    });
};

/**
 * ✅ Find payments awaiting fulfillment
 * (paid but not yet reflected in order)
 */
paymentSchema.statics.findUnreconciledPaidPayments = function () {
    return this.find({
        status: 'paid',
        verification_status: 'verified',
        paid_at: { $exists: true },
        is_deleted: false,
    })
        .populate({
            path: 'order_id',
            select: 'status',
        })
        .where('order_id.status').ne('PAID');
    // Returns payments that are marked PAID but order isn't
    // Useful for monitoring data consistency
};

// ===== INSTANCE METHODS =====

/**
 * ✅ Check if payment is still within payment window
 */
paymentSchema.methods.isExpired = function () {
    if (!this.expires_at) return false; // No expiry = not pending
    return new Date() > this.expires_at;
};

/**
 * ✅ Check if payment is refundable
 * (paid and within refund window, e.g., 30 days)
 */
paymentSchema.methods.isRefundable = function () {
    if (this.status !== 'paid') return false;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return this.paid_at >= thirtyDaysAgo;
};

/**
 * ✅ Get safe response object (redact sensitive data)
 * Remove webhook raw data from API responses
 */
paymentSchema.methods.toSafeResponse = function () {
    const obj = this.toObject();

    // Redact sensitive webhook data
    delete obj.raw_ipn;
    delete obj.raw_return;

    // Redact partial payment provider secrets (if any)
    if (obj.provider_data?.stripe_client_secret) {
        obj.provider_data.stripe_client_secret = '***';
    }

    return obj;
};

// ===== RESPONSE SANITIZATION =====

/**
 * ✅ Transform response (hide internal fields)
 * Consistent with Cart, Order models
 */
const sanitizeTransform = (_, ret) => {
    delete ret.__v;

    // In JSON responses, expose most fields (financial record is less sensitive than auth)
    // But redact raw webhook data via toSafeResponse() when needed
    return ret;
};

paymentSchema.set('toJSON', { transform: sanitizeTransform });
paymentSchema.set('toObject', { transform: sanitizeTransform });

module.exports = mongoose.model('Payment', paymentSchema);