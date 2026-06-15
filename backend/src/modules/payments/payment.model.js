const mongoose = require('mongoose');
const crypto = require('crypto');

const providerDataSchema = new mongoose.Schema(
    {
        vnp_txn_ref: {
            type: String,
            sparse: true,
        },

        vnp_transaction_no: String,

        vnp_response_code: String,

        vnp_transaction_status: String,

        vnp_bank_code: String,

        vnp_pay_date: Date,

        stripe_pi_id: {
            type: String,
            sparse: true,
        },

        stripe_client_secret: String,
        stripe_status: String,

        paypal_order_id: {
            type: String,
            sparse: true,
        },

        paypal_capture_id: {
            type: String,
            sparse: true,
        },

        paypal_checkout_url: String,
        paypal_payer_id: String,
        paypal_status: String,
        paypal_amount_value: String,
        paypal_currency: String,
        paypal_exchange_rate: Number,

        payos_order_code: {
            type: Number,
            sparse: true,
        },

        payos_payment_link_id: {
            type: String,
            sparse: true,
        },

        payos_checkout_url: String,
        payos_qr_code: String,
        payos_status: String,
        payos_reference: String,
        payos_transaction_date_time: String,
    },
    { _id: false }
);

const paymentSchema = new mongoose.Schema(
    {
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

        provider: {
            type: String,
            enum: {
                values: ['vnpay', 'stripe', 'paypal', 'payos'],
                message: 'Provider must be vnpay, stripe, paypal, or payos',
            },
            required: [true, 'Provider is required'],
            index: true,
        },

        amount: {
            type: Number,
            required: [true, 'Amount is required'],
            min: [0, 'Amount cannot be negative'],
        },

        currency: {
            type: String,
            enum: {
                values: ['VND', 'USD'],
                message: 'Currency must be VND or USD',
            },
            default: 'VND',
        },

        status: {
            type: String,
            enum: {
                values: ['pending', 'paid', 'failed'],
                message: 'Status must be pending, paid, or failed',
            },
            default: 'pending',
            index: true,
        },

        provider_data: {
            type: providerDataSchema,
            required: [true, 'Provider data is required'],
        },

        idempotency_key: {
            type: String,
            required: [true, 'Idempotency key is required'],
        },

        verification_status: {
            type: String,
            enum: {
                values: ['pending', 'verified', 'failed'],
                message: 'Verification status must be pending, verified, or failed',
            },
            default: 'pending',
        },

        webhook_verified_at: Date,

        failure_reason: {
            type: String,
        },

        failure_code: String,

        failure_message: String,

        expires_at: Date,

        retry_count: {
            type: Number,
            default: 0,
            min: [0, 'Retry count cannot be negative'],
        },

        last_retry_at: Date,

        raw_ipn: mongoose.Schema.Types.Mixed,

        raw_return: mongoose.Schema.Types.Mixed,

        paid_at: Date,

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



paymentSchema.index(
    { 'provider_data.vnp_txn_ref': 1 },
    {
        unique: true,
        sparse: true,
        name: 'vnpay_txn_ref_unique',
    }
);

paymentSchema.index(
    { 'provider_data.stripe_pi_id': 1 },
    {
        unique: true,
        sparse: true,
        name: 'stripe_pi_id_unique',
    }
);

paymentSchema.index(
    { 'provider_data.paypal_order_id': 1 },
    {
        unique: true,
        sparse: true,
        name: 'paypal_order_id_unique',
    }
);

paymentSchema.index(
    { 'provider_data.paypal_capture_id': 1 },
    {
        unique: true,
        sparse: true,
        name: 'paypal_capture_id_unique',
    }
);

paymentSchema.index(
    { idempotency_key: 1 },
    {
        unique: true,
        sparse: true,
        name: 'idempotency_key_unique',
    }
);

paymentSchema.index(
    { 'provider_data.payos_order_code': 1 },
    {
        unique: true,
        sparse: true,
        name: 'payos_order_code_unique',
    }
);

paymentSchema.index(
    { 'provider_data.payos_payment_link_id': 1 },
    {
        unique: true,
        sparse: true,
        name: 'payos_payment_link_id_unique',
    }
);

paymentSchema.index(
    { user_id: 1, created_at: -1 },
    {
        name: 'user_payments_history',
    }
);

paymentSchema.index(
    { order_id: 1, status: 1 },
    {
        name: 'order_payment_status',
    }
);

paymentSchema.index(
    { order_id: 1 },
    {
        unique: true,
        partialFilterExpression: {
            status: 'pending',
            is_deleted: false,
        },
        name: 'order_pending_payment_unique',
    }
);

paymentSchema.index(
    { status: 1, provider: 1 },
    {
        name: 'status_provider_idx',
    }
);

paymentSchema.index(
    { verification_status: 1 },
    {
        partialFilterExpression: {
            verification_status: 'failed',
        },
        name: 'verification_failed_idx',
    }
);

paymentSchema.index(
    { status: 1, expires_at: 1 },
    {
        sparse: true,
        name: 'pending_expires_at_idx',
    }
);

paymentSchema.index(
    { is_deleted: 1, created_at: -1 },
    {
        name: 'soft_delete_idx',
    }
);



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



paymentSchema.pre('save', function (next) {
    if (this.isNew && this.status === 'pending' && !this.expires_at) {
        const thirtyMinutesFromNow = new Date();
        thirtyMinutesFromNow.setMinutes(thirtyMinutesFromNow.getMinutes() + 30);
        this.expires_at = thirtyMinutesFromNow;
    }

    this.updated_at = new Date();
    next();
});

paymentSchema.pre('findOneAndUpdate', function (next) {
    const update = this.getUpdate();

    if (update.$set && update.$set.status) {
        const newStatus = update.$set.status;
        const invalidTransitions = {
            'paid': ['pending', 'failed'],
            'failed': ['pending', 'paid'],
        };

    }

    if (update.updated_at === undefined) {
        update.updated_at = new Date();
    }

    next();
});



paymentSchema.statics.generateIdempotencyKey = function (userId, orderId) {
    return `${userId.toString()}-${orderId.toString()}`;
};

paymentSchema.statics.findByVNPayTxnRef = function (txnRef) {
    return this.findOne(
        { 'provider_data.vnp_txn_ref': txnRef, is_deleted: false },
        null,
        { maxTimeMS: 5000 }
    );
};

paymentSchema.statics.findByPayOSOrderCode = function (orderCode) {
    return this.findOne(
        { 'provider_data.payos_order_code': Number(orderCode), is_deleted: false },
        null,
        { maxTimeMS: 5000 }
    );
};

paymentSchema.statics.findByPayOSPaymentLinkId = function (paymentLinkId) {
    return this.findOne(
        { 'provider_data.payos_payment_link_id': paymentLinkId, is_deleted: false },
        null,
        { maxTimeMS: 5000 }
    );
};

paymentSchema.statics.findByIdempotencyKey = function (idempotencyKey) {
    return this.findOne({
        idempotency_key: idempotencyKey,
        is_deleted: false,
    });
};

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

paymentSchema.statics.getPendingPaymentForOrder = function (orderId) {
    return this.findOne({
        order_id: orderId,
        status: 'pending',
        is_deleted: false,
    });
};

paymentSchema.statics.getSuccessfulPaymentForOrder = function (orderId) {
    return this.findOne({
        order_id: orderId,
        status: 'paid',
        is_deleted: false,
    });
};

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
};



paymentSchema.methods.isExpired = function () {
    if (!this.expires_at) return false;
    return new Date() > this.expires_at;
};

paymentSchema.methods.isRefundable = function () {
    if (this.status !== 'paid') return false;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return this.paid_at >= thirtyDaysAgo;
};

paymentSchema.methods.toSafeResponse = function () {
    const obj = this.toObject();

    delete obj.raw_ipn;
    delete obj.raw_return;

    if (obj.provider_data?.stripe_client_secret) {
        obj.provider_data.stripe_client_secret = '***';
    }

    return obj;
};



const sanitizeTransform = (_, ret) => {
    delete ret.__v;
    return ret;
};

paymentSchema.set('toJSON', { transform: sanitizeTransform });
paymentSchema.set('toObject', { transform: sanitizeTransform });

module.exports = mongoose.model('Payment', paymentSchema);
