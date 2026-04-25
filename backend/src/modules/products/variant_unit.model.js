const mongoose = require('mongoose');

/**
 * ============================================
 * VARIANT UNIT SCHEMA
 * ============================================
 * 
 * Represents: Pack size + Price tiers
 * (1 Variant có nhiều Units/packs)
 * 
 * Key Points:
 * - pack_size: 50, 100, 500 cái/pack
 * - price_tiers: quantity-based pricing
 *   {min_qty: 1, max_qty: 10, unit_price: 180000}
 *   (min/max là số pack, không phải cái)
 * - is_default: pack nào show default ở UI
 * - Validation: CRITICAL (no overlap, sorted)
 * 
 * Price Logic Example:
 * User nhập: 3 pack → 
 * - tier: [1-10] → 180k/pack
 * - total: 3 × 180k = 540k
 * - items: 3 × 100 = 300 cái
 */

const priceTierSchema = new mongoose.Schema(
    {
        min_qty: {
            type: Number,
            required: [true, 'Minimum quantity is required'],
            min: [1, 'Minimum quantity must be at least 1'],
        },
        max_qty: {
            type: Number,
            // null = unlimited (last tier)
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
        },
    },
    { _id: false }
);

const variantUnitSchema = new mongoose.Schema(
    {
        // ===== RELATIONSHIP =====
        variant_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Variant',
            required: [true, 'Variant is required'],
        },

        // ===== UNIT DEFINITION =====
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
            // Example: "Gói 100", "Hộp 50"
        },

        pack_size: {
            type: Number,
            required: [true, 'Pack size is required'],
            min: [1, 'Pack size must be at least 1'],
        },

        // ===== PRICING TIERS =====
        // ✅ FIX #1: Tier pricing structure
        // Validation logic ở service layer (sorted, no overlap)
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

        // ===== ORDER RULES =====
        min_order_qty: {
            type: Number,
            default: 1,
            min: [1, 'Minimum order must be at least 1'],
        },

        max_order_qty: {
            type: Number,
            // null = unlimited
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

        // ===== VISIBILITY =====
        is_default: {
            type: Boolean,
            default: false,
            // Only 1 unit per variant can be default
            // Enforce ở service layer
        },

        currency: {
            type: String,
            default: 'VND',
            enum: {
                values: ['VND', 'USD', 'EUR'],
                message: 'Currency must be one of: VND, USD, EUR',
            },
        },

        // ===== TIMESTAMPS =====
        // ✅ Note: NO is_deleted/deleted_at
        // Variant units không soft-delete (keep for audit)
        // Nếu muốn disable unit → set status inactive ở variant
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

// ===== INDEXES =====

// ✅ FIX #6: Efficient variant_unit lookups
variantUnitSchema.index({ variant_id: 1 });

// ✅ FIX #5: Unique pack size per variant (prevent duplicate)
variantUnitSchema.index(
    { variant_id: 1, pack_size: 1 },
    {
        unique: true,
    }
);

// Default unit lookup
variantUnitSchema.index(
    { variant_id: 1, is_default: 1 },
    {
        partialFilterExpression: {
            is_default: true,
        },
    }
);

// ===== MIDDLEWARE =====

/**
 * ✅ Pre-save: Update timestamp + auto-sort price tiers
 */
variantUnitSchema.pre('save', function (next) {
    this.updated_at = new Date();

    // Auto-sort price_tiers by min_qty (nếu validator chưa)
    if (this.price_tiers && this.price_tiers.length > 0) {
        this.price_tiers.sort((a, b) => a.min_qty - b.min_qty);
    }

    next();
});

// ===== STATIC METHODS =====

/**
 * ✅ Validate price tiers (CRITICAL - called ở service layer)
 * 
 * Rules:
 * 1. Non-empty
 * 2. Sorted by min_qty ascending
 * 3. No overlap: prev.max_qty + 1 === current.min_qty (hoặc gaps ok nếu accept)
 * 4. Nếu last tier có max_qty → error (must be unlimited)
 * 5. All prices > 0
 * 
 * Return: { valid: true } hoặc throw error
 */
variantUnitSchema.statics.validatePriceTiers = function (tiers) {
    if (!tiers || tiers.length === 0) {
        throw new Error('Price tiers cannot be empty');
    }

    // ✅ Sort by min_qty
    const sorted = [...tiers].sort((a, b) => a.min_qty - b.min_qty);

    for (let i = 0; i < sorted.length; i++) {
        const tier = sorted[i];
        const isLastTier = i === sorted.length - 1;

        // Validate min_qty
        if (tier.min_qty < 1) {
            throw new Error('min_qty must be at least 1');
        }

        // Validate max_qty vs min_qty
        if (tier.max_qty !== null && tier.max_qty < tier.min_qty) {
            throw new Error(
                `Tier ${i}: max_qty (${tier.max_qty}) < min_qty (${tier.min_qty})`
            );
        }

        // Validate price
        if (tier.unit_price <= 0) {
            throw new Error(`Tier ${i}: unit_price must be > 0`);
        }

        // Last tier must be unlimited
        if (isLastTier && tier.max_qty !== null) {
            throw new Error(
                'Last tier must have unlimited max_qty (null)'
            );
        }

        // Check overlap with previous tier
        if (i > 0) {
            const prevTier = sorted[i - 1];

            if (prevTier.max_qty === null) {
                throw new Error(
                    `Tier ${i - 1}: Non-last tier cannot have unlimited max_qty`
                );
            }

            // ✅ Allow gap but no overlap
            if (prevTier.max_qty >= tier.min_qty) {
                throw new Error(
                    `Tier ${i}: Overlap detected (prev.max=${prevTier.max_qty}, curr.min=${tier.min_qty})`
                );
            }
        }

        // Check for duplicate min_qty
        if (i > 0 && sorted[i - 1].min_qty === tier.min_qty) {
            throw new Error(`Duplicate min_qty: ${tier.min_qty}`);
        }
    }

    return { valid: true, sorted };
};

/**
 * ✅ Get price by quantity
 * 
 * qty: số pack user muốn mua
 * return: unit_price từ matching tier
 */
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

/**
 * ✅ Calculate final price
 * 
 * qty: số pack
 * priceTiers: tiers array
 * return: { unit_price, total_price, total_items }
 */
variantUnitSchema.statics.calculatePrice = function (
    qty,
    priceTiers,
    packSize
) {
    const unit_price =
        this.getPriceByQty(qty, priceTiers);
    const total_price = qty * unit_price;
    const total_items = qty * packSize;

    return {
        qty_packs: qty,
        unit_price,
        total_price,
        total_items,
        price_per_unit: Math.round(total_price / total_items),
    };
};

/**
 * ✅ Get default unit for variant
 */
variantUnitSchema.statics.getDefault = function (variantId) {
    return this.findOne(
        { variant_id: variantId, is_default: true }
    );
};

// ===== RESPONSE SANITIZATION =====
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