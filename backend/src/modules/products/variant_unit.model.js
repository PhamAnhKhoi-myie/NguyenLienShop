const mongoose = require('mongoose');
const {
    calculatePrice,
    isPromotionActive,
} = require('./pricing.util');

const priceTierSchema = new mongoose.Schema(
    {
        min_qty: {
            type: Number,
            required: [true, 'Minimum quantity is required'],
            min: [1, 'Minimum quantity must be at least 1'],
        },
        max_qty: {
            type: Number,

            validate: {
                validator: function (v) {
                    if (v === null) return true;
                    return v >= this.min_qty;
                },
                message: 'max_qty must be >= min_qty',
            },
        },
        unit_price: {
            type: Number,
            required: [true, 'Unit price is required'],
            min: [0, 'Unit price cannot be negative'],
            validate: {
                validator: Number.isInteger,
                message: 'Unit price must be an integer',
            },
        },
    },
    { _id: false }
);

const promotionSchema = new mongoose.Schema(
    {
        enabled: {
            type: Boolean,
            default: false,
        },
        type: {
            type: String,
            enum: {
                values: ['FIXED', 'PERCENT'],
                message: 'Promotion type must be FIXED or PERCENT',
            },
            default: 'FIXED',
        },
        value: {
            type: Number,
            default: 0,
            min: [0, 'Promotion value cannot be negative'],
            validate: {
                validator: Number.isInteger,
                message: 'Promotion value must be an integer',
            },
        },
        starts_at: {
            type: Date,
            default: null,
        },
        ends_at: {
            type: Date,
            default: null,
        },
        allow_voucher: {
            type: Boolean,
            default: true,
        },
    },
    { _id: false }
);

const variantUnitSchema = new mongoose.Schema(
    {

        variant_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Variant',
            required: [true, 'Variant is required'],
        },


        unit_type: {
            type: String,
            enum: {
                values: ['UNIT', 'PACK', 'BOX', 'CARTON'],
                message:
                    'Unit type must be one of: UNIT, PACK, BOX, CARTON',
            },
            default: 'PACK',
        },

        display_name: {
            type: String,
            required: [true, 'Display name is required'],
            trim: true,

        },

        pack_size: {
            type: Number,
            required: [true, 'Pack size is required'],
            min: [1, 'Pack size must be at least 1'],
        },




        price_tiers: {
            type: [priceTierSchema],
            required: [true, 'Price tiers are required'],
            validate: {
                validator: function (v) {
                    return v.length > 0;
                },
                message: 'At least one price tier is required',
            },
        },

        promotion: {
            type: promotionSchema,
            default: () => ({}),
        },


        min_order_qty: {
            type: Number,
            default: 1,
            min: [1, 'Minimum order must be at least 1'],
        },

        max_order_qty: {
            type: Number,

            validate: {
                validator: function (v) {
                    if (v === null) return true;
                    return v >= this.min_order_qty;
                },
                message: 'max_order_qty must be >= min_order_qty',
            },
        },

        qty_step: {
            type: Number,
            default: 1,
            min: [1, 'Quantity step must be at least 1'],
        },


        is_default: {
            type: Boolean,
            default: false,


        },

        currency: {
            type: String,
            default: 'VND',
            enum: {
                values: ['VND', 'USD', 'EUR'],
                message: 'Currency must be one of: VND, USD, EUR',
            },
        },





        created_at: {
            type: Date,
            default: Date.now,
        },

        updated_at: {
            type: Date,
            default: Date.now,
        },
    }
);


variantUnitSchema.index({ variant_id: 1 });

variantUnitSchema.index(
    { variant_id: 1, pack_size: 1 },
    {
        unique: true,
    }
);

variantUnitSchema.index(
    { variant_id: 1, is_default: 1 },
    {
        partialFilterExpression: {
            is_default: true,
        },
    }
);


variantUnitSchema.pre('save', function (next) {
    this.updated_at = new Date();

    if (this.price_tiers && this.price_tiers.length > 0) {
        this.price_tiers.sort((a, b) => a.min_qty - b.min_qty);
    }

    next();
});


variantUnitSchema.statics.validatePriceTiers = function (tiers) {
    if (!tiers || tiers.length === 0) {
        throw new Error('Price tiers cannot be empty');
    }


    const sorted = [...tiers].sort((a, b) => a.min_qty - b.min_qty);

    for (let i = 0; i < sorted.length; i++) {
        const tier = sorted[i];
        const isLastTier = i === sorted.length - 1;


        if (tier.min_qty < 1) {
            throw new Error('min_qty must be at least 1');
        }


        if (tier.max_qty !== null && tier.max_qty < tier.min_qty) {
            throw new Error(
                `Tier ${i}: max_qty (${tier.max_qty}) < min_qty (${tier.min_qty})`
            );
        }


        if (tier.unit_price <= 0) {
            throw new Error(`Tier ${i}: unit_price must be > 0`);
        }

        if (!Number.isInteger(tier.unit_price)) {
            throw new Error(`Tier ${i}: unit_price must be an integer`);
        }


        if (isLastTier && tier.max_qty !== null) {
            throw new Error(
                'Last tier must have unlimited max_qty (null)'
            );
        }


        if (i > 0) {
            const prevTier = sorted[i - 1];

            if (prevTier.max_qty === null) {
                throw new Error(
                    `Tier ${i - 1}: Non-last tier cannot have unlimited max_qty`
                );
            }


            if (prevTier.max_qty >= tier.min_qty) {
                throw new Error(
                    `Tier ${i}: Overlap detected (prev.max=${prevTier.max_qty}, curr.min=${tier.min_qty})`
                );
            }
        }


        if (i > 0 && sorted[i - 1].min_qty === tier.min_qty) {
            throw new Error(`Duplicate min_qty: ${tier.min_qty}`);
        }
    }

    return { valid: true, sorted };
};

variantUnitSchema.statics.validatePromotion = function (
    promotion,
    priceTiers
) {
    if (!promotion?.enabled) {
        return { valid: true };
    }

    if (!['FIXED', 'PERCENT'].includes(promotion.type)) {
        throw new Error('Promotion type must be FIXED or PERCENT');
    }

    if (!Number.isInteger(promotion.value) || promotion.value <= 0) {
        throw new Error('Promotion value must be a positive integer');
    }

    if (promotion.type === 'PERCENT' && promotion.value >= 100) {
        throw new Error('Percent promotion must be less than 100');
    }

    if (
        promotion.type === 'FIXED' &&
        priceTiers.some((tier) => promotion.value >= tier.unit_price)
    ) {
        throw new Error(
            'Fixed promotion must be lower than every tier price'
        );
    }

    if (
        promotion.starts_at &&
        promotion.ends_at &&
        new Date(promotion.ends_at) <= new Date(promotion.starts_at)
    ) {
        throw new Error('Promotion end time must be after start time');
    }

    return { valid: true };
};

variantUnitSchema.methods.isPromotionActive = function (at = new Date()) {
    return isPromotionActive(this.promotion, at);
};

variantUnitSchema.statics.getPriceByQty = function (qty, priceTiers) {
    if (!priceTiers || priceTiers.length === 0) {
        throw new Error('No price tiers available');
    }

    const tier = priceTiers.find(
        (t) =>
            qty >= t.min_qty &&
            (t.max_qty === null || qty <= t.max_qty)
    );

    if (!tier) {
        throw new Error(
            `No matching price tier for quantity: ${qty}`
        );
    }

    return tier.unit_price;
};

variantUnitSchema.statics.calculatePrice = function (
    qty,
    priceTiers,
    packSize,
    promotion,
    at = new Date()
) {
    return calculatePrice(qty, priceTiers, packSize, promotion, at);
};

variantUnitSchema.statics.getDefault = function (variantId) {
    return this.findOne(
        { variant_id: variantId, is_default: true }
    );
};


const sanitizeTransform = (_, ret) => {
    delete ret.__v;
    return ret;
};

variantUnitSchema.set('toJSON', {
    transform: sanitizeTransform,
});
variantUnitSchema.set('toObject', {
    transform: sanitizeTransform,
});

module.exports = mongoose.model('VariantUnit', variantUnitSchema);
