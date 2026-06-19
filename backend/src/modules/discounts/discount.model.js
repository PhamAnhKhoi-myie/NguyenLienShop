const mongoose = require('mongoose');

const applicableTargetsSchema = new mongoose.Schema(
    {

        type: {
            type: String,
            enum: {
                values: [
                    'all',
                    'specific_products',
                    'specific_categories',
                    'specific_variants',
                ],
                message:
                    'Type must be all, specific_products, specific_categories, or specific_variants',
            },
            default: 'all',
        },


        product_ids: {
            type: [mongoose.Schema.Types.ObjectId],
            ref: 'Product',
            default: [],
        },

        category_ids: {
            type: [mongoose.Schema.Types.ObjectId],
            ref: 'Category',
            default: [],
        },

        variant_ids: {
            type: [mongoose.Schema.Types.ObjectId],
            ref: 'Variant',
            default: [],
        },
    },
    { _id: false }
);

const userEligibilitySchema = new mongoose.Schema(
    {

        type: {
            type: String,
            enum: {
                values: ['all', 'first_time_only', 'specific_users', 'vip_users'],
                message:
                    'Type must be all, first_time_only, specific_users, or vip_users',
            },
            default: 'all',
        },


        user_ids: {
            type: [mongoose.Schema.Types.ObjectId],
            ref: 'User',
            default: [],
        },


        min_user_tier: {
            type: String,
            enum: {
                values: ['bronze', 'silver', 'gold', 'platinum', 'diamond'],
                message: 'Tier must be bronze, silver, gold, platinum, or diamond',
            },
            sparse: true,
        },
    },
    { _id: false }
);

const discountSchema = new mongoose.Schema(
    {

        code: {
            type: String,
            required: [true, 'Discount code is required'],
            unique: true,
            uppercase: true,

            trim: true,
            minlength: [3, 'Code must be at least 3 characters'],
            maxlength: [20, 'Code must not exceed 20 characters'],

            match: [
                /^[A-Z0-9_-]+$/,
                'Code must contain only uppercase letters, numbers, underscores, and dashes',
            ],
            index: true,
        },


        type: {
            type: String,
            enum: {
                values: ['percent', 'fixed'],
                message: 'Type must be percent or fixed',
            },
            required: [true, 'Discount type is required'],
        },

        value: {
            type: Number,
            required: [true, 'Discount value is required'],
            min: [0, 'Value cannot be negative'],


            validate: {
                validator: function (value) {
                    if (this.type === 'percent') {
                        return value <= 100;
                    }

                    return true;
                },
                message: 'Percent discount value must be <= 100',
            },
        },



        max_discount_amount: {
            type: Number,
            min: [0, 'Max discount amount cannot be negative'],


        },



        application_strategy: {
            type: String,
            enum: {
                values: ['apply_all', 'apply_once', 'apply_cheapest', 'apply_most_expensive'],
                message:
                    'Strategy must be apply_all, apply_once, apply_cheapest, or apply_most_expensive',
            },
            default: 'apply_all',




        },



        applicable_targets: {
            type: applicableTargetsSchema,
            default: { type: 'all' },
        },



        user_eligibility: {
            type: userEligibilitySchema,
            default: { type: 'all' },
        },


        min_order_value: {
            type: Number,
            default: 0,
            min: [0, 'Minimum order value cannot be negative'],

        },


        usage_limit: {
            type: Number,
            required: [true, 'Usage limit is required'],
            min: [1, 'Usage limit must be at least 1'],

        },

        usage_per_user_limit: {
            type: Number,
            required: [true, 'Usage per user limit is required'],
            min: [1, 'Usage per user limit must be at least 1'],

        },

        usage_count: {
            type: Number,
            default: 0,
            min: [0, 'Usage count cannot be negative'],


        },

        claim_limit: {
            type: Number,
            default: null,
            min: [1, 'Claim limit must be at least 1'],


        },

        claim_count: {
            type: Number,
            default: 0,
            min: [0, 'Claim count cannot be negative'],


        },



        is_stackable: {
            type: Boolean,
            default: false,


        },

        stack_priority: {
            type: Number,
            default: 0,



        },

        show_on_homepage: {
            type: Boolean,
            default: false,
            index: true,
        },

        homepage_priority: {
            type: Number,
            default: 0,
            min: [0, 'Homepage priority cannot be negative'],
            max: [999, 'Homepage priority must not exceed 999'],
        },

        requires_claim: {
            type: Boolean,
            default: false,
            index: true,
        },



        started_at: {
            type: Date,
            required: [true, 'Start date is required'],
            default: () => new Date(),

        },

        expiry_date: {
            type: Date,
            required: [true, 'Expiry date is required'],


        },


        status: {
            type: String,
            enum: {
                values: ['active', 'inactive', 'paused', 'expired'],
                message: 'Status must be active, inactive, paused, or expired',
            },
            default: 'active',
            index: true,


        },



        is_deleted: {
            type: Boolean,
            default: false,
            index: true,
        },

        deleted_at: {
            type: Date,
            default: null,
        },



        created_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,

        },

        updated_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',

        },
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        },
    }
);



discountSchema.index(
    { code: 1 },
    {
        unique: true,
        name: 'code_unique_idx',
    }
);

discountSchema.index(
    { status: 1, started_at: 1, expiry_date: 1 },
    {
        name: 'active_discounts_time_idx',
        partialFilterExpression: {
            status: 'active',
            is_deleted: false,
        },
    }
);

discountSchema.index(
    { 'applicable_targets.product_ids': 1 },
    {
        sparse: true,
        name: 'product_targets_idx',
    }
);

discountSchema.index(
    { 'applicable_targets.variant_ids': 1 },
    {
        sparse: true,
        name: 'variant_targets_idx',
    }
);

discountSchema.index(
    { 'applicable_targets.category_ids': 1 },
    {
        sparse: true,
        name: 'category_targets_idx',
    }
);

discountSchema.index(
    { is_stackable: 1, stack_priority: -1 },
    {
        name: 'stackable_priority_idx',
        partialFilterExpression: {
            is_stackable: true,
        },
    }
);

discountSchema.index(
    { show_on_homepage: 1, status: 1, homepage_priority: -1, expiry_date: 1 },
    {
        name: 'homepage_discounts_idx',
        partialFilterExpression: {
            show_on_homepage: true,
            status: 'active',
            is_deleted: false,
        },
    }
);

discountSchema.index(
    { show_on_homepage: 1, claim_limit: 1, claim_count: 1 },
    {
        name: 'homepage_claim_capacity_idx',
        partialFilterExpression: {
            show_on_homepage: true,
            is_deleted: false,
        },
    }
);

discountSchema.index(
    { is_deleted: 1, created_at: -1 },
    {
        name: 'soft_delete_idx',
    }
);

discountSchema.index(
    { created_at: -1 },
    {
        name: 'created_at_idx',
    }
);



const excludeDeleted = function (next) {
    const options = this.getOptions?.() || {};

    if (!options.includeDeleted) {
        this.where({ is_deleted: false });
    }

    next();
};

discountSchema.pre('find', excludeDeleted);
discountSchema.pre('findOne', excludeDeleted);
discountSchema.pre('findOneAndUpdate', excludeDeleted);
discountSchema.pre('countDocuments', excludeDeleted);

discountSchema.pre('aggregate', function (next) {
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



discountSchema.pre('validate', function (next) {
    if (this.type === 'percent' && !this.max_discount_amount) {
        this.invalidate(
            'max_discount_amount',
            'max_discount_amount is mandatory for percent discounts'
        );
    }

    if (this.max_discount_amount && this.type === 'fixed') {
        if (this.max_discount_amount < this.value) {
            this.invalidate(
                'max_discount_amount',
                'max_discount_amount should not be less than value for fixed discounts'
            );
        }
    }

    next();
});

discountSchema.pre('validate', function (next) {
    if (this.started_at && this.expiry_date) {
        if (this.started_at >= this.expiry_date) {
            this.invalidate(
                'expiry_date',
                'Expiry date must be after start date'
            );
        }
    }

    if (
        this.claim_limit &&
        this.claim_count !== undefined &&
        this.claim_count > this.claim_limit
    ) {
        this.invalidate(
            'claim_limit',
            'Claim limit cannot be less than current claim count'
        );
    }

    next();
});

discountSchema.pre('save', function (next) {
    if (this.isModified('code')) {
        this.code = this.code.toUpperCase().trim();
    }

    this.updated_at = new Date();
    next();
});



discountSchema.statics.findByCode = function (code) {
    return this.findOne(
        { code: code.toUpperCase().trim(), is_deleted: false },
        null,
        { maxTimeMS: 5000 }
    );
};

discountSchema.statics.findActiveDiscounts = function (
    page = 1,
    limit = 20,
    now = new Date()
) {
    const skip = (page - 1) * limit;

    return {
        findAsync: async () => {
            const [discounts, total] = await Promise.all([
                this.find({
                    status: 'active',
                    is_deleted: false,
                    started_at: { $lte: now },
                    expiry_date: { $gt: now },
                })
                    .sort({ created_at: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                this.countDocuments({
                    status: 'active',
                    is_deleted: false,
                    started_at: { $lte: now },
                    expiry_date: { $gt: now },
                }),
            ]);

            return {
                data: discounts,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            };
        },
    };
};

discountSchema.statics.findApplicableDiscounts = async function (
    filters = {},
    now = new Date()
) {
    const query = {
        status: 'active',
        is_deleted: false,
        started_at: { $lte: now },
        expiry_date: { $gt: now },
    };

    const orConditions = [
        { 'applicable_targets.type': 'all' },
    ];

    if (filters.variant_ids?.length > 0) {
        orConditions.push({
            'applicable_targets.type': 'specific_variants',
            'applicable_targets.variant_ids': { $in: filters.variant_ids },
        });
    }

    if (filters.product_ids?.length > 0) {
        orConditions.push({
            'applicable_targets.type': 'specific_products',
            'applicable_targets.product_ids': { $in: filters.product_ids },
        });
    }

    if (filters.category_ids?.length > 0) {
        orConditions.push({
            'applicable_targets.type': 'specific_categories',
            'applicable_targets.category_ids': { $in: filters.category_ids },
        });
    }

    if (orConditions.length > 1) {
        query.$or = orConditions;
    } else {
        query['applicable_targets.type'] = 'all';
    }

    return await this.find(query).lean();
};

discountSchema.statics.findDiscountsForUser = async function (
    userId,
    filters = {},
    now = new Date()
) {
    const query = {
        status: 'active',
        is_deleted: false,
        started_at: { $lte: now },
        expiry_date: { $gt: now },
        $and: [
            {
                $or: [
                    { 'user_eligibility.type': 'all' },
                    {
                        'user_eligibility.type': 'specific_users',
                        'user_eligibility.user_ids': userId,
                    },
                ],
            },
        ],
    };

    const targetOrConditions = [{ 'applicable_targets.type': 'all' }];

    if (filters.variant_ids?.length > 0) {
        targetOrConditions.push({
            'applicable_targets.type': 'specific_variants',
            'applicable_targets.variant_ids': { $in: filters.variant_ids },
        });
    }

    if (filters.product_ids?.length > 0) {
        targetOrConditions.push({
            'applicable_targets.type': 'specific_products',
            'applicable_targets.product_ids': { $in: filters.product_ids },
        });
    }

    if (filters.category_ids?.length > 0) {
        targetOrConditions.push({
            'applicable_targets.type': 'specific_categories',
            'applicable_targets.category_ids': { $in: filters.category_ids },
        });
    }

    query.$and.push({
        $or: targetOrConditions,
    });

    return await this.find(query).lean();
};

discountSchema.statics.countNearExpiry = async function (
    daysFromNow = 7,
    now = new Date()
) {
    const expiryThreshold = new Date(now);
    expiryThreshold.setDate(expiryThreshold.getDate() + daysFromNow);

    return await this.countDocuments({
        status: 'active',
        is_deleted: false,
        expiry_date: {
            $lte: expiryThreshold,
            $gt: now,
        },
    });
};



discountSchema.methods.isWithinTimeWindow = function (now = new Date()) {
    return this.started_at <= now && now < this.expiry_date;
};

discountSchema.methods.isExpired = function (now = new Date()) {
    return now >= this.expiry_date;
};

discountSchema.methods.isNotStarted = function (now = new Date()) {
    return now < this.started_at;
};

discountSchema.methods.isValid = function (now = new Date()) {
    if (!this.isWithinTimeWindow(now)) {
        return false;
    }

    if (this.status !== 'active') {
        return false;
    }

    if (this.usage_count >= this.usage_limit) {
        return false;
    }

    return true;
};

discountSchema.methods.canUserUse = function (
    userId,
    userUsageCount = 0,
    now = new Date()
) {
    if (!this.isValid(now)) {
        return false;
    }

    if (this.user_eligibility.type === 'specific_users') {
        if (!this.user_eligibility.user_ids.includes(userId)) {
            return false;
        }
    }

    if (userUsageCount >= this.usage_per_user_limit) {
        return false;
    }

    return true;
};

discountSchema.methods.toSafeResponse = function () {
    const obj = this.toObject();

    delete obj.__v;

    return obj;
};



const sanitizeTransform = (_, ret) => {
    delete ret.__v;
    return ret;
};

discountSchema.set('toJSON', { transform: sanitizeTransform });
discountSchema.set('toObject', { transform: sanitizeTransform });

module.exports = mongoose.model('Discount', discountSchema);
