const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema(
    {
        product_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: [true, 'Product is required'],
        },

        variant_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Variant',
            required: [true, 'Variant is required'],
        },

        unit_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'VariantUnit',
            required: [true, 'Unit is required'],
        },

        category_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
        },


        sku: {
            type: String,
            required: [true, 'SKU is required'],
            trim: true,
            uppercase: true,
        },

        variant_label: {
            type: String,
            required: [true, 'Variant label is required'],
            trim: true,
        },

        product_name: {
            type: String,
            required: [true, 'Product name is required'],
            trim: true,
        },

        product_image: {
            type: String,
            trim: true,
        },

        display_name: {
            type: String,
            trim: true,
        },

        pack_size: {
            type: Number,
            required: [true, 'Pack size is required'],
            min: [1, 'Pack size must be at least 1'],
        },


        price_at_added: {
            type: Number,
            required: [true, 'Price at added is required'],
            min: [0, 'Price cannot be negative'],
        },


        quantity: {
            type: Number,
            required: [true, 'Quantity is required'],
            min: [1, 'Quantity must be at least 1'],
            max: [999, 'Quantity cannot exceed 999'],
        },


        added_at: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: true }
);

const discountSchema = new mongoose.Schema(
    {
        discount_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Discount',
        },

        code: {
            type: String,
            required: true,
            uppercase: true,
            trim: true,
        },

        type: {
            type: String,
            enum: {
                values: ['PERCENT', 'FIXED'],
                message: 'Discount type must be PERCENT or FIXED',
            },
            required: true,
        },

        value: {
            type: Number,
            required: true,
            min: [0, 'Discount value cannot be negative'],
        },

        discount_amount: {
            type: Number,
            required: true,
            min: [0, 'Discount amount cannot be negative'],
        },


        min_purchase: {
            type: Number,
            default: 0,
            min: [0, 'Minimum purchase cannot be negative'],
        },

        max_discount: {
            type: Number,
            default: Infinity,
            min: [0, 'Max discount cannot be negative'],
        },


        apply_scope: {
            type: String,
            enum: {
                values: ['CART', 'ITEM'],
                message: 'Scope must be CART or ITEM',
            },
            default: 'CART',
        },


        applied_at: {
            type: Date,
            default: Date.now,
        },

        expires_at: {
            type: Date,
        },
    },
    { _id: false }
);

const cartSchema = new mongoose.Schema(
    {

        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },

        session_key: {
            type: String,
        },


        items: {
            type: [cartItemSchema],
            default: [],
            validate: {
                validator: function (v) {
                    return v.length <= 100;
                },
                message: 'Maximum 100 items per cart',
            },
        },


        discount: {
            type: discountSchema,
            default: null,
        },


        status: {
            type: String,
            enum: {
                values: ['ACTIVE', 'ABANDONED', 'CHECKED_OUT'],
                message: 'Status must be ACTIVE, ABANDONED, or CHECKED_OUT',
            },
            default: 'ACTIVE',
        },


        expired_at: {
            type: Date,
            required: true,

        },


        viewed_at: {
            type: Date,
        },

        checked_out_at: {
            type: Date,
        },
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        },
    }
);



cartSchema.index(
    { user_id: 1 },
    {
        unique: true,
        sparse: true,
        partialFilterExpression: {
            status: 'ACTIVE',
            user_id: { $exists: true },
        },
    }
);

cartSchema.index(
    { session_key: 1 },
    {
        unique: true,
        sparse: true,
        partialFilterExpression: {
            status: 'ACTIVE',
            session_key: { $exists: true },
        },
    }
);

cartSchema.index(
    { expired_at: 1 },
    { expireAfterSeconds: 0 }
);

cartSchema.index(
    { updated_at: 1 },
    {
        partialFilterExpression: {
            status: 'ACTIVE',
        },
    }
);

cartSchema.index(
    { checked_out_at: 1 },
    {
        sparse: true,
        partialFilterExpression: {
            status: 'CHECKED_OUT',
        },
    }
);


const excludeExpired = function (next) {
    const options = this.getOptions?.() || {};
    const filter = this.getFilter?.() || {};
    const hasStatusFilter =
        Object.prototype.hasOwnProperty.call(filter, 'status') ||
        Object.prototype.hasOwnProperty.call(filter, '$and') ||
        Object.prototype.hasOwnProperty.call(filter, '$or');

    if (!options.includeExpired && !hasStatusFilter) {
        this.where({ status: 'ACTIVE' });
    }
    next();
};

cartSchema.pre('find', excludeExpired);
cartSchema.pre('findOne', excludeExpired);
cartSchema.pre('countDocuments', excludeExpired);

cartSchema.pre('aggregate', function (next) {
    const pipeline = this.pipeline();
    const options = this.getOptions?.() || {};

    if (options.includeExpired) {
        return next();
    }

    const hasStatusFilter = pipeline.some(
        (stage) =>
            stage.$match &&
            Object.prototype.hasOwnProperty.call(stage.$match, 'status')
    );

    if (!hasStatusFilter) {
        pipeline.unshift({ $match: { status: 'ACTIVE' } });
    }

    next();
});



cartSchema.pre('save', function (next) {
    if (this.isNew && !this.expired_at) {
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
        this.expired_at = sevenDaysFromNow;
    }

    this.updated_at = new Date();
    next();
});



cartSchema.statics.getOrCreateUserCart = async function (userId) {
    let cart = await this.findOne(
        { user_id: userId, status: 'ACTIVE' },
        null,
        { includeExpired: true }
    );

    if (!cart) {
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

        cart = await this.create({
            user_id: userId,
            items: [],
            status: 'ACTIVE',
            expired_at: sevenDaysFromNow,
        });
    }

    return cart;
};

cartSchema.statics.getOrCreateGuestCart = async function (sessionKey) {
    if (!sessionKey) {
        throw new Error('Session key is required for guest cart');
    }

    let cart = await this.findOne(
        { session_key: sessionKey, status: 'ACTIVE' },
        null,
        { includeExpired: true }
    );

    if (!cart) {
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

        cart = await this.create({
            session_key: sessionKey,
            items: [],
            status: 'ACTIVE',
            expired_at: sevenDaysFromNow,
        });
    }

    return cart;
};

cartSchema.statics.addItemAtomic = async function (cartId, itemData) {
    const unitObjectId =
        itemData.unit_id instanceof mongoose.Types.ObjectId
            ? itemData.unit_id
            : new mongoose.Types.ObjectId(itemData.unit_id);
    const maxQuantity =
        typeof itemData.max_quantity === 'number'
            ? itemData.max_quantity
            : 999;

    const validatedItem = {
        product_id: itemData.product_id,
        variant_id: itemData.variant_id,
        unit_id: unitObjectId,
        category_id: itemData.category_id,
        sku: itemData.sku,
        variant_label: itemData.variant_label,
        product_name: itemData.product_name,
        product_image: itemData.product_image,
        display_name: itemData.display_name,
        pack_size: itemData.pack_size,
        price_at_added: itemData.price_at_added,
        quantity: itemData.quantity,
        added_at: new Date(),
    };

    const cart = await this.findById(cartId, null, { includeExpired: true });
    if (!cart) {
        throw new Error('Cart not found');
    }

    if (itemData.quantity > maxQuantity) {
        return null;
    }

    const existingItemIndex = cart.items.findIndex(
        (i) => i.unit_id?.toString() === unitObjectId.toString()
    );

    if (existingItemIndex !== -1) {
        return await this.findOneAndUpdate(
            {
                _id: cartId,
                items: {
                    $elemMatch: {
                        unit_id: unitObjectId,
                        quantity: {
                            $lte: maxQuantity - itemData.quantity,
                        },
                    },
                },
            },
            {
                $inc: { 'items.$[item].quantity': itemData.quantity },
                updated_at: new Date(),
            },
            {
                arrayFilters: [{ 'item.unit_id': unitObjectId }],
                new: true,
                includeExpired: true,
            }
        );
    }

    const pushedCart = await this.findOneAndUpdate(
        {
            _id: cartId,
            'items.unit_id': { $ne: unitObjectId },
        },
        {
            $push: { items: validatedItem },
            updated_at: new Date(),
        },
        { new: true, includeExpired: true }
    );

    if (pushedCart) {
        return pushedCart;
    }

    return await this.findOneAndUpdate(
        {
            _id: cartId,
            items: {
                $elemMatch: {
                    unit_id: unitObjectId,
                    quantity: {
                        $lte: maxQuantity - itemData.quantity,
                    },
                },
            },
        },
        {
            $inc: { 'items.$[item].quantity': itemData.quantity },
            updated_at: new Date(),
        },
        {
            arrayFilters: [{ 'item.unit_id': unitObjectId }],
            new: true,
            includeExpired: true,
        }
    );
};

cartSchema.statics.removeItemAtomic = async function (cartId, itemId) {
    return await this.findByIdAndUpdate(
        cartId,
        {
            $pull: { items: { _id: itemId } },
            updated_at: new Date(),
        },
        { new: true, includeExpired: true }
    );
};

cartSchema.statics.updateItemQuantityAtomic = async function (
    cartId,
    itemId,
    newQuantity
) {
    if (newQuantity < 1) {
        throw new Error('Quantity must be at least 1');
    }

    return await this.findByIdAndUpdate(
        cartId,
        {
            $set: { 'items.$[item].quantity': newQuantity },
            updated_at: new Date(),
        },
        {
            arrayFilters: [{ 'item._id': itemId }],
            new: true,
            includeExpired: true,
        }
    );
};

cartSchema.statics.mergeGuestToUser = async function (
    sessionKey,
    userId,
    session
) {
    if (!sessionKey || !userId) {
        throw new Error('Session key and user ID required');
    }

    const guestCart = await this.findOne(
        { session_key: sessionKey, status: 'ACTIVE' },
        null,
        { session, includeExpired: true }
    );

    if (!guestCart || guestCart.items.length === 0) {
        return await this.getOrCreateUserCart(userId);
    }

    let userCart = await this.findOne(
        { user_id: userId, status: 'ACTIVE' },
        null,
        { session, includeExpired: true }
    );

    if (!userCart) {
        userCart = new this({
            user_id: userId,
            items: [],
            status: 'ACTIVE',
            expired_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
    }

    for (const guestItem of guestCart.items) {
        const existingIndex = userCart.items.findIndex(
            (i) => i.unit_id?.toString() === guestItem.unit_id?.toString()
        );

        if (existingIndex !== -1) {
            userCart.items[existingIndex].quantity += guestItem.quantity;
        } else {
            userCart.items.push(guestItem);
        }
    }

    if (!userCart.discount && guestCart.discount) {
        userCart.discount = guestCart.discount;
    }

    await userCart.save({ session });

    await this.updateOne(
        { _id: guestCart._id },
        { status: 'ABANDONED' },
        { session }
    );

    return userCart;
};

cartSchema.methods.calculateTotals = function () {
    let subtotal = 0;
    let itemCount = 0;
    let itemsTotalUnits = 0;

    this.items.forEach((item) => {
        const itemLineTotal = item.price_at_added * item.quantity;
        subtotal += itemLineTotal;
        itemCount += 1;
        itemsTotalUnits += item.quantity * item.pack_size;
    });

    const discountAmount = this.discount?.discount_amount || 0;
    const total = Math.max(subtotal - discountAmount, 0);

    return {
        subtotal,
        discount_amount: discountAmount,
        total,
        item_count: itemCount,
        items_total_units: itemsTotalUnits,
    };
};

cartSchema.statics.extendExpiry = async function (cartId, daysToAdd = 7) {
    const newExpiredAt = new Date();
    newExpiredAt.setDate(newExpiredAt.getDate() + daysToAdd);

    return await this.findByIdAndUpdate(
        cartId,
        { expired_at: newExpiredAt },
        { new: true, includeExpired: true }
    );
};



const sanitizeTransform = (_, ret) => {
    delete ret.__v;
    return ret;
};

cartSchema.set('toJSON', { transform: sanitizeTransform });
cartSchema.set('toObject', { transform: sanitizeTransform });

module.exports = mongoose.model('Cart', cartSchema);
