const mongoose = require('mongoose');
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

        product_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: [true, 'Product is required'],
            index: true,
        },


        sku: {
            type: String,
            required: [true, 'SKU is required'],
            uppercase: true,
            trim: true,
            match: [
                /^[A-Z0-9\-]+$/,
                'SKU must contain only uppercase letters, numbers, and hyphens',
            ],
        },


        size: {
            type: String,
            required: [true, 'Size is required'],
            trim: true,
        },

        fabric_type: {
            type: String,
            required: [true, 'Fabric type is required'],
            trim: true,
        },


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


        stock: {
            type: stockSchema,
            default: () => ({}),
        },


        status: {
            type: String,
            enum: {
                values: ['ACTIVE', 'INACTIVE'],
                message: 'Status must be either ACTIVE or INACTIVE',
            },
            default: 'ACTIVE',
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
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        },
    }
);


variantSchema.index(
    { product_id: 1, status: 1, is_deleted: 1 },
    {
        partialFilterExpression: {
            status: 'ACTIVE',
            is_deleted: false,
        },
    }
);

variantSchema.index(
    { product_id: 1, size: 1, fabric_type: 1 },
    {
        unique: true,
        partialFilterExpression: {
            is_deleted: false,
        },
    }
);

variantSchema.index(
    { sku: 1 },
    {
        unique: true,
    }
);

variantSchema.index(
    { 'stock.available': 1 },
    {
        partialFilterExpression: {
            is_deleted: false,
        },
    }
);




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

variantSchema.pre('save', function (next) {
    next();
});



variantSchema.statics.updatePriceCache = async function (variantId) {
    const VariantUnit = mongoose.model('VariantUnit');

    const units = await VariantUnit.find(
        { variant_id: variantId },
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

    let minPrice = Infinity;
    let maxPrice = 0;
    let minPricePerUnit = Infinity;
    let maxPricePerUnit = 0;

    units.forEach((unit) => {
        if (unit.price_tiers.length === 0) return;

        const tierPrices = unit.price_tiers.map((t) => t.unit_price);
        minPrice = Math.min(minPrice, ...tierPrices);
        maxPrice = Math.max(maxPrice, ...tierPrices);

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

variantSchema.statics.hasStock = async function (
    variantId,
    qtyPacks,
    packSize
) {
    const variant = await this.findById(variantId, 'stock');
    const totalItems = qtyPacks * packSize;
    return variant.stock.available >= totalItems;
};

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


const sanitizeTransform = (_, ret) => {
    delete ret.__v;
    return ret;
};

variantSchema.set('toJSON', { transform: sanitizeTransform });
variantSchema.set('toObject', { transform: sanitizeTransform });
variantSchema.set('optimisticConcurrency', true);

module.exports = mongoose.model('Variant', variantSchema);