const mongoose = require('mongoose');

/**
 * ============================================
 * VARIANT SCHEMA
 * ============================================
 * 
 * Represents: Kích thước + Loại vải combination
 * (1 Product có nhiều Variants)
 * 
 * Key Points:
 * - SKU: unique + format rule (enforce ở service)
 * - size + fabric_type: combination unique per product
 * - stock: tính theo cái (NOT pack)
 *   - available: có thể bán ngay
 *   - reserved: đã giữ (pending orders)
 * - min_price/max_price: cached từ variant_units
 * - Soft delete: giống product
 * 
 * Stock Logic:
 * - available = total_quantity - reserved
 * - Không update available trực tiếp
 * - Chỉ update reserved (order), sold (complete)
 */

const stockSchema = new mongoose.Schema(
    {
        available: {
            type: Number,
            default: 0,
            min: [0, 'Available stock cannot be negative'],
        },
        reserved: {
            type: Number,
            default: 0,
            min: [0, 'Reserved stock cannot be negative'],
        },
        sold: {
            type: Number,
            default: 0,
            min: [0, 'Sold count cannot be negative'],
        },
    },
    { _id: false }
);

const variantSchema = new mongoose.Schema(
    {
        // ===== RELATIONSHIP =====
        product_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: [true, 'Product is required'],
            index: true,
        },

        // ===== IDENTITY =====
        // ✅ FIX #4: SKU must be unique (format: {product}-{size}-{fabric})
        // Enforce format ở service layer
        sku: {
            type: String,
            required: [true, 'SKU is required'],
            uppercase: true,
            trim: true,
            // Regex: TUBAO-NA-20x25-NOTDYET (example)
            match: [
                /^[A-Z0-9\-]+$/,
                'SKU must contain only uppercase letters, numbers, and hyphens',
            ],
        },

        // ===== ATTRIBUTES =====
        // ✅ FIX #2: Flatten attributes (not nested object)
        // This allows better indexing
        size: {
            type: String,
            required: [true, 'Size is required'],
            trim: true,
            // Enum ở validator layer (hoặc hardcode size list)
            // Example: "20x25", "25x30"
        },

        fabric_type: {
            type: String,
            required: [true, 'Fabric type is required'],
            trim: true,
            // Enum ở validator layer
            // Example: "Vải Không Dệt", "Lưới Mùng"
        },

        // ===== PRICING (CACHED) =====
        // ✅ FIX #3: Price cached từ variant_units
        // Updated via service layer
        min_price: {
            type: Number,
            default: 0,
            min: [0, 'Min price cannot be negative'],
        },

        max_price: {
            type: Number,
            default: 0,
            min: [0, 'Max price cannot be negative'],
        },

        // ✅ Price per unit (for comparison)
        min_price_per_unit: {
            type: Number,
            default: 0,
            min: [0, 'Min price per unit cannot be negative'],
        },

        max_price_per_unit: {
            type: Number,
            default: 0,
            min: [0, 'Max price per unit cannot be negative'],
        },

        // ===== STOCK =====
        // ✅ FIX #2: Stock tính theo cái (NOT pack)
        // available = total - reserved
        stock: {
            type: stockSchema,
            default: () => ({}),
        },

        // ===== STATUS =====
        status: {
            type: String,
            enum: {
                values: ['ACTIVE', 'INACTIVE'],
                message: 'Status must be either ACTIVE or INACTIVE',
            },
            default: 'ACTIVE',
            index: true,
        },

        // ===== SOFT DELETE =====
        is_deleted: {
            type: Boolean,
            default: false,
            index: true,
        },

        deleted_at: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        },
    }
);

// ===== INDEXES (Production Optimized) =====

// ✅ FIX #6: Compound index for product variants
variantSchema.index(
    { product_id: 1, status: 1, is_deleted: 1 },
    {
        partialFilterExpression: {
            status: 'ACTIVE',
            is_deleted: false,
        },
    }
);

// ✅ FIX #5: Unique constraint (size + fabric per product)
// Prevent duplicate variants
variantSchema.index(
    { product_id: 1, size: 1, fabric_type: 1 },
    {
        unique: true,
        partialFilterExpression: {
            is_deleted: false,
        },
    }
);

// SKU lookup
variantSchema.index(
    { sku: 1 },
    {
        unique: true,
    }
);

// Stock queries
variantSchema.index(
    { 'stock.available': 1 },
    {
        partialFilterExpression: {
            is_deleted: false,
        },
    }
);

// ===== MIDDLEWARE =====

/**
 * ✅ Pre-find: Auto-exclude soft-deleted
 */
const excludeDeleted = function (next) {
    const options = this.getOptions?.() || {};

    if (!options.includeDeleted) {
        this.where({ is_deleted: false });
    }

    next();
};

variantSchema.pre('find', excludeDeleted);
variantSchema.pre('findOne', excludeDeleted);
variantSchema.pre('findOneAndUpdate', excludeDeleted);
variantSchema.pre('countDocuments', excludeDeleted);

/**
 * ✅ Pre-aggregate: Auto-exclude soft-deleted
 */
variantSchema.pre('aggregate', function (next) {
    const pipeline = this.pipeline();

    const hasDeletedFilter = pipeline.some(
        (stage) =>
            stage.$match &&
            Object.prototype.hasOwnProperty.call(stage.$match, 'is_deleted')
    );

    if (!hasDeletedFilter) {
        pipeline.unshift({ $match: { is_deleted: false } });
    }

    next();
});

/**
 * ✅ Pre-save: Update timestamp
 */
variantSchema.pre('save', function (next) {
    this.updated_at = new Date();
    next();
});

// ===== STATIC METHODS =====

/**
 * ✅ Update price cache từ variant_units
 * 
 * Tương tự Product.updatePriceCache
 * Called từ VariantUnit service sau mỗi change
 */
variantSchema.statics.updatePriceCache = async function (variantId) {
    const VariantUnit = mongoose.model('VariantUnit');

    const units = await VariantUnit.find(
        { variant_id: variantId, is_deleted: false },
        'pack_size price_tiers'
    );

    if (units.length === 0) {
        await this.findByIdAndUpdate(variantId, {
            min_price: 0,
            max_price: 0,
            min_price_per_unit: 0,
            max_price_per_unit: 0,
        });
        return;
    }

    // Calculate min/max prices từ tất cả units
    let minPrice = Infinity;
    let maxPrice = 0;
    let minPricePerUnit = Infinity;
    let maxPricePerUnit = 0;

    units.forEach((unit) => {
        if (unit.price_tiers.length === 0) return;

        // Tier prices
        const tierPrices = unit.price_tiers.map((t) => t.unit_price);
        minPrice = Math.min(minPrice, ...tierPrices);
        maxPrice = Math.max(maxPrice, ...tierPrices);

        // Per-unit prices (chia pack_size)
        const perUnitPrices = tierPrices.map((p) => p / unit.pack_size);
        minPricePerUnit = Math.min(minPricePerUnit, ...perUnitPrices);
        maxPricePerUnit = Math.max(maxPricePerUnit, ...perUnitPrices);
    });

    await this.findByIdAndUpdate(variantId, {
        min_price: minPrice === Infinity ? 0 : Math.round(minPrice),
        max_price: maxPrice === 0 ? 0 : Math.round(maxPrice),
        min_price_per_unit:
            minPricePerUnit === Infinity ? 0 : Math.round(minPricePerUnit),
        max_price_per_unit:
            maxPricePerUnit === 0 ? 0 : Math.round(maxPricePerUnit),
    });
};

/**
 * ✅ Check available stock
 * 
 * qty_packs = số pack user muốn mua
 * pack_size = số cái / pack
 * 
 * Return: true nếu có đủ stock
 */
variantSchema.statics.hasStock = async function (
    variantId,
    qtyPacks,
    packSize
) {
    const variant = await this.findById(variantId, 'stock');
    const totalItems = qtyPacks * packSize;
    return variant.stock.available >= totalItems;
};

/**
 * ✅ Reserve stock (khi add to cart)
 * 
 * Logic:
 * - available -= qtyItems
 * - reserved += qtyItems
 */
variantSchema.statics.reserveStock = async function (variantId, qtyItems) {
    const variant = await this.findById(variantId, 'stock');

    if (variant.stock.available < qtyItems) {
        throw new Error(
            `Insufficient stock. Available: ${variant.stock.available}, Requested: ${qtyItems}`
        );
    }

    return await this.findByIdAndUpdate(
        variantId,
        {
            $inc: {
                'stock.available': -qtyItems,
                'stock.reserved': qtyItems,
            },
        },
        { new: true }
    );
};

/**
 * ✅ Complete sale (khi order confirmed)
 * 
 * Logic:
 * - reserved -= qtyItems
 * - sold += qtyItems
 */
variantSchema.statics.completeSale = async function (variantId, qtyItems) {
    return await this.findByIdAndUpdate(
        variantId,
        {
            $inc: {
                'stock.reserved': -qtyItems,
                'stock.sold': qtyItems,
            },
        },
        { new: true }
    );
};

/**
 * ✅ Release reserved stock (khi cancel order)
 */
variantSchema.statics.releaseReservedStock = async function (
    variantId,
    qtyItems
) {
    return await this.findByIdAndUpdate(
        variantId,
        {
            $inc: {
                'stock.available': qtyItems,
                'stock.reserved': -qtyItems,
            },
        },
        { new: true }
    );
};

// ===== RESPONSE SANITIZATION =====
const sanitizeTransform = (_, ret) => {
    delete ret.__v;
    return ret;
};

variantSchema.set('toJSON', { transform: sanitizeTransform });
variantSchema.set('toObject', { transform: sanitizeTransform });

module.exports = mongoose.model('Variant', variantSchema);