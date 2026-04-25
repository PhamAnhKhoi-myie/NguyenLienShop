const mongoose = require('mongoose');

/**
 * ============================================
 * SHIPMENT SCHEMA
 * ============================================
 */

const shippingAddressSchema = new mongoose.Schema(
    {
        recipient_name: {
            type: String,
            required: [true, 'Recipient name is required'],
            minlength: [2, 'Recipient name must be at least 2 characters'],
            maxlength: [100, 'Recipient name must not exceed 100 characters'],
        },

        phone: {
            type: String,
            required: [true, 'Phone is required'],
            validate: {
                validator: (v) => /^(\+84|0)[0-9]{9,10}$/.test(v),
                message: 'Invalid Vietnamese phone number',
            },
        },

        address: {
            type: String,
            required: [true, 'Street address is required'],
            minlength: [5, 'Address must be at least 5 characters'],
            maxlength: [200, 'Address must not exceed 200 characters'],
        },

        ward: {
            type: String,
            required: [true, 'Ward/commune is required'],
            minlength: [2, 'Ward must be at least 2 characters'],
            maxlength: [100, 'Ward must not exceed 100 characters'],
        },

        district: {
            type: String,
            required: [true, 'District is required'],
            minlength: [2, 'District must be at least 2 characters'],
            maxlength: [100, 'District must not exceed 100 characters'],
        },

        province: {
            type: String,
            required: [true, 'Province/city is required'],
            minlength: [2, 'Province must be at least 2 characters'],
            maxlength: [100, 'Province must not exceed 100 characters'],
        },

        postal_code: {
            type: String,
            maxlength: [20, 'Postal code must not exceed 20 characters'],
        },

        country: {
            type: String,
            default: 'Vietnam',
        },
    },
    { _id: false }
);

const timelineSchema = new mongoose.Schema(
    {
        created_at: {
            type: Date,
            default: Date.now,
        },

        picked_up_at: Date,
        in_transit_at: Date,
        at_destination_at: Date,
        delivered_at: Date,
        failed_at: Date,
        cancelled_at: Date,
        returned_at: Date,
    },
    { _id: false }
);

// ✅ Timeline validation
timelineSchema.pre('validate', function (next) {
    const created = this.created_at || new Date();

    const allDates = [
        this.picked_up_at,
        this.in_transit_at,
        this.at_destination_at,
        this.delivered_at,
        this.failed_at,
        this.cancelled_at,
        this.returned_at
    ];

    for (const date of allDates) {
        if (date && date < created) {
            this.invalidate(
                'timeline',
                'All timestamps must be after created_at'
            );
            break;
        }
    }

    next();
});

const shipmentSchema = new mongoose.Schema(
    {
        // ===== IDENTITY & OWNERSHIP =====
        order_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order',
            required: [true, 'Order is required'],
        },

        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User is required'],
        },

        // ===== CARRIER DETAILS =====
        carrier: {
            type: String,
            enum: {
                values: ['GHN', 'GHTK', 'JT', 'GRAB', 'BEST', 'OTHER'],
                message: 'Carrier must be GHN, GHTK, JT, GRAB, BEST, or OTHER',
            },
            required: [true, 'Carrier is required'],
        },

        tracking_code: {
            type: String,
            required: [true, 'Tracking code is required'],
            unique: true,
            sparse: true,
            minlength: [5, 'Tracking code must be at least 5 characters'],
            maxlength: [100, 'Tracking code must not exceed 100 characters'],
            uppercase: true,
        },

        // ===== ADDRESS SNAPSHOT =====
        shipping_address: {
            type: shippingAddressSchema,
            required: [true, 'Shipping address is required'],
        },

        // ===== SHIPMENT STATUS =====
        status: {
            type: String,
            enum: {
                values: [
                    'pending',
                    'picked_up',
                    'in_transit',
                    'at_destination',
                    'delivered',
                    'failed',
                    'cancelled',
                    'returned',
                ],
                message: 'Invalid shipment status',
            },
            default: 'pending',
        },

        // ===== TIMELINE =====
        timeline: {
            type: timelineSchema,
            required: true,
        },

        // ===== FAILURE TRACKING =====
        failure_reason: {
            type: String,
            enum: {
                values: [
                    'address_incorrect',
                    'recipient_unavailable',
                    'refused_delivery',
                    'damaged_package',
                    'lost',
                    'weather_delay',
                    'carrier_error',
                    'other',
                ],
                message: 'Invalid failure reason',
            },
            required: function () {
                return this.status === 'failed';
            }
        },

        failure_notes: {
            type: String,
            maxlength: [500, 'Notes must not exceed 500 characters'],
            required: function () {
                return this.status === 'failed';
            }
        },

        // ===== RETRY LOGIC =====
        retry_count: {
            type: Number,
            default: 0,
            min: [0, 'Retry count cannot be negative'],
        },

        last_retry_at: Date,

        max_retries: {
            type: Number,
            default: 3,
        },

        // ===== SOFT DELETE =====
        is_deleted: {
            type: Boolean,
            default: false,
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

// ===== INDEXES (FIXED: Removed duplicate status index) =====

shipmentSchema.index(
    { user_id: 1, status: 1, created_at: -1 },
    { name: 'user_shipments_history' }
);

shipmentSchema.index(
    { tracking_code: 1, is_deleted: 1 },
    { unique: true, sparse: true, name: 'tracking_code_unique' }
);

shipmentSchema.index(
    { order_id: 1, created_at: -1 },
    { name: 'order_shipments' }
);

shipmentSchema.index(
    { carrier: 1, status: 1 },
    { name: 'carrier_status_idx' }
);

shipmentSchema.index(
    { is_deleted: 1, created_at: -1 },
    { name: 'soft_delete_idx' }
);

shipmentSchema.index(
    { status: 1, retry_count: 1, last_retry_at: 1 },
    {
        partialFilterExpression: { status: 'failed' },
        name: 'failed_retry_idx'
    }
);

// ===== MIDDLEWARE =====

const excludeDeleted = function (next) {
    if (!this.getOptions().includeDeleted) {
        this.where({ is_deleted: false });
    }
    next();
};

shipmentSchema.pre('find', excludeDeleted);
shipmentSchema.pre('findOne', excludeDeleted);
shipmentSchema.pre('findOneAndUpdate', excludeDeleted);
shipmentSchema.pre('countDocuments', excludeDeleted);

shipmentSchema.pre('aggregate', function (next) {
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

shipmentSchema.pre('save', function (next) {
    this.updated_at = new Date();
    next();
});

// ===== STATIC METHODS =====

shipmentSchema.statics.findByIdWithOwnershipCheck = async function (
    shipmentId,
    userId
) {
    return this.findOne({
        _id: shipmentId,
        user_id: userId,
        is_deleted: false,
    });
};

shipmentSchema.statics.findByTrackingCode = function (trackingCode) {
    return this.findOne({
        tracking_code: trackingCode,
        is_deleted: false,
    });
};

shipmentSchema.statics.getShipmentsForOrder = async function (
    orderId,
    userId
) {
    return this.find({
        order_id: orderId,
        user_id: userId,
        is_deleted: false,
    })
        .sort({ created_at: -1 })
        .lean();
};

shipmentSchema.statics.getUserShipmentHistory = async function (
    userId,
    page = 1,
    limit = 20
) {
    const skip = (page - 1) * limit;

    const [shipments, total] = await Promise.all([
        this.find({ user_id: userId, is_deleted: false })
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        this.countDocuments({ user_id: userId, is_deleted: false }),
    ]);

    return {
        data: shipments,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};

shipmentSchema.statics.getPendingByCarrier = function (carrier) {
    return this.find({
        carrier,
        status: { $in: ['pending', 'picked_up', 'in_transit', 'at_destination'] },
        is_deleted: false,
    })
        .sort({ created_at: 1 })
        .lean();
};

shipmentSchema.statics.getFailedShipmentsForRetry = function (maxRetries = 3) {
    return this.find({
        status: 'failed',
        retry_count: { $lt: maxRetries },
        is_deleted: false,
    })
        .sort({ last_retry_at: 1 })
        .lean();
};

shipmentSchema.statics.getDeliveredShipments = function (
    startDate,
    endDate
) {
    return this.find({
        status: 'delivered',
        delivered_at: { $gte: startDate, $lte: endDate },
        is_deleted: false,
    })
        .sort({ delivered_at: -1 })
        .lean();
};

shipmentSchema.statics.countByStatus = function () {
    return this.aggregate([
        { $match: { is_deleted: false } },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
            },
        },
        {
            $sort: { count: -1 },
        },
    ]);
};

// ===== INSTANCE METHODS =====

shipmentSchema.methods.canBeRetried = function () {
    return (
        this.status === 'failed' && this.retry_count < this.max_retries
    );
};

shipmentSchema.methods.canBeCancelled = function () {
    return ['pending', 'picked_up', 'in_transit', 'at_destination'].includes(
        this.status
    );
};

shipmentSchema.methods.isInProgress = function () {
    return [
        'pending',
        'picked_up',
        'in_transit',
        'at_destination',
    ].includes(this.status);
};

shipmentSchema.methods.isTerminal = function () {
    return [
        'delivered',
        'cancelled',
        'returned',
    ].includes(this.status);
};

shipmentSchema.methods.getElapsedTime = function () {
    return new Date() - this.created_at;
};

shipmentSchema.methods.getEstimatedDeliveryDays = function () {
    const carrierSLA = {
        GHN: 3,
        GHTK: 3,
        JT: 3,
        GRAB: 1,
        BEST: 5,
        OTHER: 7,
    };

    return carrierSLA[this.carrier] || 5;
};

shipmentSchema.methods.getCarrierTrackingURL = function () {
    const baseURLs = {
        GHN: 'https://khachhang.ghn.vn/tracking?order_code=',
        GHTK: 'https://tracking.ghtk.vn/?order_code=',
        JT: 'https://jtexpress.vn/tracking/',
        GRAB: 'https://grab.com/vn/en/tracking/',
        BEST: 'https://tracking.best.vn/?number=',
    };

    const baseURL = baseURLs[this.carrier] || null;
    if (!baseURL) return null;

    return `${baseURL}${this.tracking_code}`;
};

// ===== RESPONSE SANITIZATION =====

const sanitizeTransform = (_, ret) => {
    delete ret.__v;
    return ret;
};

shipmentSchema.set('toJSON', { transform: sanitizeTransform });
shipmentSchema.set('toObject', { transform: sanitizeTransform });

module.exports = mongoose.model('Shipment', shipmentSchema);