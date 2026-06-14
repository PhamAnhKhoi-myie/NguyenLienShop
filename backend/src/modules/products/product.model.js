const mongoose = require('mongoose');
const slugify = require('slugify');

const imageSchema = new mongoose.Schema(
    {
        url: {
            type: String,
            required: [true, 'Image URL is required'],
            trim: true,
        },
        alt: {
            type: String,
            trim: true,
            maxlength: [200, 'Alt text must not exceed 200 characters'],
        },
        is_primary: {
            type: Boolean,
            default: false,
        },
        sort_order: {
            type: Number,
            default: 0,
        },
    },
    { _id: false }
);

const productSchema = new mongoose.Schema(
    {

        name: {
            type: String,
            required: [true, 'Product name is required'],
            trim: true,
            minlength: [2, 'Product name must be at least 2 characters'],
            maxlength: [200, 'Product name must not exceed 200 characters'],
            index: true,
        },

        slug: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },

        category_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            required: [true, 'Category is required'],
            index: true,
        },

        brand: {
            type: String,
            trim: true,
            maxlength: [100, 'Brand must not exceed 100 characters'],
        },


        min_price: {
            type: Number,
            default: 0,
            min: [0, 'Min price cannot be negative'],
            index: true,
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


        description: {
            type: String,
            trim: true,
            maxlength: [2000, 'Description must not exceed 2000 characters'],
        },

        short_description: {
            type: String,
            trim: true,
            maxlength: [500, 'Short description must not exceed 500 characters'],
        },

        images: {
            type: [imageSchema],
            default: [],
            validate: {
                validator: function (v) {
                    const primaryCount = v.filter((img) => img.is_primary).length;
                    return primaryCount <= 1;
                },
                message: 'Only one image can be primary',
            },
        },

        search_keywords: {
            type: [String],
            default: [],
            validate: {
                validator: function (v) {
                    return v.length <= 10;
                },
                message: 'Maximum 10 search keywords',
            },
        },


        rating_avg: {
            type: Number,
            default: 0,
            min: [0, 'Rating avg cannot be negative'],
            max: [5, 'Rating avg cannot exceed 5'],
        },

        rating_count: {
            type: Number,
            default: 0,
            min: [0, 'Rating count cannot be negative'],
        },

        sold_count: {
            type: Number,
            default: 0,
            min: [0, 'Sold count cannot be negative'],
            index: true,
        },

        is_best_seller: {
            type: Boolean,
            default: false,
            index: true,
        },

        new_until: {
            type: Date,
            default: null,
            index: true,
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



productSchema.index(
    { slug: 1 },
    {
        unique: true,
        partialFilterExpression: {
            is_deleted: false,
        },
    }
);

productSchema.index(
    { category_id: 1, status: 1, is_deleted: 1, created_at: -1 },
    {
        partialFilterExpression: {
            status: 'ACTIVE',
            is_deleted: false,
        },
    }
);

productSchema.index(
    { name: 'text', short_description: 'text', search_keywords: 'text' },
    {
        weights: { name: 3, search_keywords: 2, short_description: 1 },
        partialFilterExpression: {
            status: 'ACTIVE',
            is_deleted: false,
        },
    }
);

productSchema.index(
    { min_price: 1, max_price: 1 },
    {
        partialFilterExpression: {
            is_deleted: false,
        },
    }
);

productSchema.index(
    { sold_count: -1, rating_avg: -1 },
    {
        partialFilterExpression: {
            status: 'ACTIVE',
            is_deleted: false,
        },
    }
);


productSchema.pre('validate', function (next) {
    if (!this.slug) {
        this.slug = slugify(this.name, { lower: true, strict: true });
    }
    next();
});

productSchema.pre('save', function (next) {
    if (this.images.length > 0) {
        const hasPrimary = this.images.some((img) => img.is_primary);

        if (!hasPrimary) {
            this.images[0].is_primary = true;
        }

        this.images.sort((a, b) => a.sort_order - b.sort_order);
    }

    next();
});

const excludeDeleted = function (next) {
    const options = this.getOptions?.() || {};

    if (!options.includeDeleted) {
        this.where({ is_deleted: false });
    }

    next();
};

productSchema.pre('find', excludeDeleted);
productSchema.pre('findOne', excludeDeleted);
productSchema.pre('findOneAndUpdate', excludeDeleted);
productSchema.pre('countDocuments', excludeDeleted);


productSchema.pre('aggregate', function (next) {
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



productSchema.statics.findBySlug = function (slug, options = {}) {
    return this.findOne({ slug }, null, options);
};

productSchema.statics.updatePriceCache = async function (productId) {
    const Variant = mongoose.model('Variant');

    const variants = await Variant.find(
        { product_id: productId, is_deleted: false },
        'min_price max_price min_price_per_unit max_price_per_unit'
    );

    if (variants.length === 0) {

        await this.findByIdAndUpdate(productId, {
            min_price: 0,
            max_price: 0,
            min_price_per_unit: 0,
            max_price_per_unit: 0,
        });
        return;
    }

    const prices = variants
        .map((v) => v.min_price)
        .filter((p) => p > 0);
    const maxPrices = variants
        .map((v) => v.max_price)
        .filter((p) => p > 0);
    const unitPrices = variants
        .map((v) => v.min_price_per_unit)
        .filter((p) => p > 0);
    const maxUnitPrices = variants
        .map((v) => v.max_price_per_unit)
        .filter((p) => p > 0);

    await this.findByIdAndUpdate(productId, {
        min_price: prices.length > 0 ? Math.min(...prices) : 0,
        max_price: maxPrices.length > 0 ? Math.max(...maxPrices) : 0,
        min_price_per_unit:
            unitPrices.length > 0 ? Math.min(...unitPrices) : 0,
        max_price_per_unit:
            maxUnitPrices.length > 0 ? Math.max(...maxUnitPrices) : 0,
    });
};

productSchema.statics.softDelete = async function (productId, session) {
    const Variant = mongoose.model('Variant');

    const productResult = await this.findByIdAndUpdate(
        productId,
        {
            is_deleted: true,
            deleted_at: new Date(),
        },
        { session, includeDeleted: true }
    );

    if (!productResult) {
        throw new Error('Failed to soft delete product');
    }

    const totalVariants = await Variant.countDocuments(
        { product_id: productId },
        { session }
    );

    const variantResult = await Variant.updateMany(
        { product_id: productId },
        {
            is_deleted: true,
            deleted_at: new Date(),
        },
        { session }
    );

    if (
        variantResult?.modifiedCount !== totalVariants
    ) {
        throw new Error('Failed to soft delete all variants');
    }
};


const sanitizeTransform = (_, ret) => {
    delete ret.__v;
    return ret;
};

productSchema.set('toJSON', { transform: sanitizeTransform });
productSchema.set('toObject', { transform: sanitizeTransform });

module.exports = mongoose.model('Product', productSchema);
