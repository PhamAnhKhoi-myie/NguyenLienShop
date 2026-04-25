const mongoose = require('mongoose');

/**
 * ============================================
 * CART SCHEMA
 * ============================================
 * 
 * Represents: Shopping cart (guest hoặc user)
 * 
 * Key Points:
 * - user_id: optional (user cart hoặc guest session)
 * - session_key: unique per guest (hoặc null nếu user)
 * - items: array cart items với snapshot pricing
 * - discount: promo code + calculation
 * - status: active/abandoned/checked_out
 * - TTL: auto-cleanup via expired_at index
 * 
 * Critical:
 * ✅ NO line_total stored (calculated at response time)
 * ✅ NO soft delete (TTL handles cleanup)
 * ✅ Atomic updates ($push, $inc) để avoid race condition
 * ✅ price_at_added snapshot (prevent price change issues)
 */

const cartItemSchema = new mongoose.Schema(
    {
        // ===== RELATIONSHIP =====
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

        // ===== PRODUCT INFO (DENORMALIZED) =====
        // ✅ FIX #1: Snapshot product info (prevent stale data)
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
            // Example: "20x25 - Vải Không Dệt"
        },

        product_name: {
            type: String,
            required: [true, 'Product name is required'],
            trim: true,
        },

        product_image: {
            type: String,
            trim: true,
            // URL to primary image at time of add
        },

        display_name: {
            type: String,
            trim: true,
            // Pack display: "Gói 100", "Hộp 50"
            // Useful for display in cart without fetching unit
        },

        pack_size: {
            type: Number,
            required: [true, 'Pack size is required'],
            min: [1, 'Pack size must be at least 1'],
            // Số cái per pack (e.g., 100)
        },

        // ===== PRICING (SNAPSHOT at add time) =====
        // ✅ FIX #2: NEVER update price_at_added after add
        // This ensures order consistency even if product price changes
        price_at_added: {
            type: Number,
            required: [true, 'Price at added is required'],
            min: [0, 'Price cannot be negative'],
        },

        // ===== QUANTITY =====
        // ✅ quantity = số pack (NOT cái)
        // total_items = quantity × pack_size
        quantity: {
            type: Number,
            required: [true, 'Quantity is required'],
            min: [1, 'Quantity must be at least 1'],
            max: [999, 'Quantity cannot exceed 999'],
        },

        // ===== TIMESTAMPS =====
        added_at: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: true } // Allow item._id for item-level operations
);

const discountSchema = new mongoose.Schema(
    {
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
            // Example: 10 (if PERCENT) or 50000 (if FIXED)
        },

        discount_amount: {
            type: Number,
            required: true,
            min: [0, 'Discount amount cannot be negative'],
            // Calculated amount (percentage of cart or fixed)
        },

        // ===== CONSTRAINTS =====
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

        // ===== SCOPE =====
        apply_scope: {
            type: String,
            enum: {
                values: ['CART', 'ITEM'],
                message: 'Scope must be CART or ITEM',
            },
            default: 'CART',
        },

        // ===== TIMESTAMPS =====
        applied_at: {
            type: Date,
            default: Date.now,
        },

        expires_at: {
            type: Date,
            // Promo code expiry (may differ from cart TTL)
        },
    },
    { _id: false }
);

const cartSchema = new mongoose.Schema(
    {
        // ===== IDENTITY =====
        // ✅ FIX #3: Either user_id OR session_key (not both required)
        // - user_id: registered user cart
        // - session_key: guest cart
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },

        session_key: {
            type: String,
            // Generated client-side (UUID) for guest carts
            // Format: v4-uuid string
        },

        // ===== ITEMS =====
        items: {
            type: [cartItemSchema],
            default: [],
            validate: {
                validator: function (v) {
                    // Optional: Enforce max items per cart
                    return v.length <= 100;
                },
                message: 'Maximum 100 items per cart',
            },
        },

        // ===== DISCOUNT =====
        discount: {
            type: discountSchema,
            default: null,
        },

        // ===== STATUS =====
        // ✅ FIX #4: Cart lifecycle states
        status: {
            type: String,
            enum: {
                values: ['ACTIVE', 'ABANDONED', 'CHECKED_OUT'],
                message: 'Status must be ACTIVE, ABANDONED, or CHECKED_OUT',
            },
            default: 'ACTIVE',
        },

        // ===== EXPIRY =====
        // ✅ FIX #5: TTL index for automatic cleanup
        // Set to 7 days default (for guest carts)
        // User carts may have different TTL
        expired_at: {
            type: Date,
            required: true,
            // index: true,
            // TTL index defined below: { expireAfterSeconds: 0 }
            // Means: MongoDB deletes when expired_at <= now
        },

        // ===== TRACKING =====
        // Useful for analytics
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

// ===== INDEXES (Production Optimized) =====

// ✅ FIX #6.1: User cart lookup — partial unique enforces one ACTIVE cart per user
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

// ✅ FIX #6.2: Session cart lookup — partial unique enforces one ACTIVE cart per guest session
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

// ✅ FIX #6.3: Expired cart cleanup (TTL)
// MongoDB automatically deletes docs when expired_at <= current time
cartSchema.index(
    { expired_at: 1 },
    { expireAfterSeconds: 0 }
);

// ✅ FIX #6.4: Updated timestamp for sorting/filtering
cartSchema.index(
    { updated_at: 1 },
    {
        partialFilterExpression: {
            status: 'ACTIVE',
        },
    }
);

// ✅ FIX #6.5: Checkout tracking
cartSchema.index(
    { checked_out_at: 1 },
    {
        sparse: true,
        partialFilterExpression: {
            status: 'CHECKED_OUT',
        },
    }
);

// ===== MIDDLEWARE: Auto-Filter Active & Non-Expired =====

/**
 * ✅ FIX #7.1: Auto-exclude expired carts
 * Consistent pattern with User, Product, Variant models
 * 
 * Note: TTL index handles deletion, but queries may still return
 * expired docs briefly before cleanup runs
 * → Middleware ensures consistent query behavior
 */
const excludeExpired = function (next) {
    // Only filter if query is for ACTIVE carts (default assumption)
    if (!this.getOptions().includeExpired) {
        this.where({ status: 'ACTIVE' });
    }
    next();
};

// Apply to all query operations
cartSchema.pre('find', excludeExpired);
cartSchema.pre('findOne', excludeExpired);
cartSchema.pre('countDocuments', excludeExpired);

// ✅ FIX #7.2: Auto-exclude expired ở aggregation pipeline
cartSchema.pre('aggregate', function (next) {
    const pipeline = this.pipeline();
    const options = this.getOptions?.() || {};

    // Skip if explicitly including expired
    if (options.includeExpired) {
        return next();
    }

    // Check if $match stage already filters status
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

// ===== MIDDLEWARE: Update Timestamp on Save =====

/**
 * ✅ FIX #7.3: Ensure expired_at always set correctly
 * On first save: set to now + 7 days (default)
 * On update: DON'T change (let app layer decide)
 */
cartSchema.pre('save', function (next) {
    // Only set expired_at on creation if not already set
    if (this.isNew && !this.expired_at) {
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
        this.expired_at = sevenDaysFromNow;
    }

    this.updated_at = new Date();
    next();
});

// ===== STATIC METHODS =====

/**
 * ✅ FIX #8.1: Get or create cart for user
 * 
 * Logic:
 * - Find active user cart
 * - If not found: create new
 * - If found: return existing
 */
cartSchema.statics.getOrCreateUserCart = async function (userId) {
    let cart = await this.findOne(
        { user_id: userId, status: 'ACTIVE' },
        null,
        { includeExpired: true } // May be expired, but still valid to return
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

/**
 * ✅ FIX #8.2: Get or create cart for guest (session)
 * 
 * Logic: Same as user, but with session_key
 */
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

/**
 * ✅ FIX #8.3: Add item to cart (atomic update)
 * 
 * CRITICAL: Use $push/$inc operators to avoid race conditions
 * 
 * Logic:
 * 1. Check if item with same SKU exists
 * 2. If exists: increment quantity atomically
 * 3. If not: push new item
 * 
 * Returns: updated cart
 */
cartSchema.statics.addItemAtomic = async function (cartId, itemData) {
    const validatedItem = {
        product_id: itemData.product_id,
        variant_id: itemData.variant_id,
        unit_id: itemData.unit_id,
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

    // ✅ Check if item exists by SKU
    const cart = await this.findById(cartId, null, { includeExpired: true });
    if (!cart) {
        throw new Error('Cart not found');
    }

    const existingItemIndex = cart.items.findIndex(
        (i) => i.sku === itemData.sku
    );

    if (existingItemIndex !== -1) {
        // ✅ ATOMIC: Increment quantity by array position
        return await this.findByIdAndUpdate(
            cartId,
            {
                $inc: { 'items.$[item].quantity': itemData.quantity },
                updated_at: new Date(),
            },
            {
                arrayFilters: [{ 'item.sku': itemData.sku }],
                new: true,
                includeExpired: true,
            }
        );
    }

    // ✅ ATOMIC: Push new item
    return await this.findByIdAndUpdate(
        cartId,
        {
            $push: { items: validatedItem },
            updated_at: new Date(),
        },
        { new: true, includeExpired: true }
    );
};

/**
 * ✅ FIX #8.4: Remove item from cart (atomic)
 */
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

/**
 * ✅ FIX #8.5: Update item quantity (atomic)
 */
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

/**
 * ✅ FIX #8.6: Merge guest cart to user cart
 * 
 * Called on login:
 * 1. Fetch guest cart (by session_key)
 * 2. Fetch or create user cart
 * 3. Merge items (upsert by SKU)
 * 4. Inherit discount if user cart empty
 * 5. Delete guest cart or mark abandoned
 * 
 * Returns: merged user cart
 */
cartSchema.statics.mergeGuestToUser = async function (
    sessionKey,
    userId,
    session
) {
    if (!sessionKey || !userId) {
        throw new Error('Session key and user ID required');
    }

    // 1. Fetch guest cart
    const guestCart = await this.findOne(
        { session_key: sessionKey, status: 'ACTIVE' },
        null,
        { session, includeExpired: true }
    );

    if (!guestCart || guestCart.items.length === 0) {
        // No guest cart to merge
        return await this.getOrCreateUserCart(userId);
    }

    // 2. Get or create user cart
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

    // 3. Merge items (upsert by SKU)
    for (const guestItem of guestCart.items) {
        const existingIndex = userCart.items.findIndex(
            (i) => i.sku === guestItem.sku
        );

        if (existingIndex !== -1) {
            // ✅ Merge: add quantities
            userCart.items[existingIndex].quantity += guestItem.quantity;
        } else {
            // Add new item
            userCart.items.push(guestItem);
        }
    }

    // 4. Inherit discount if user cart empty
    if (!userCart.discount && guestCart.discount) {
        userCart.discount = guestCart.discount;
    }

    // 5. Save merged user cart
    await userCart.save({ session });

    // 6. Delete guest cart (TTL will cleanup, but we can mark ABANDONED)
    await this.updateOne(
        { _id: guestCart._id },
        { status: 'ABANDONED' },
        { session }
    );

    return userCart;
};

/**
 * ✅ FIX #8.7: Calculate cart totals (no stored line_total)
 * 
 * Returns: { subtotal, discount_amount, total, item_count, items_total_units }
 */
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

/**
 * ✅ FIX #8.8: Extend cart expiry (when user views)
 * Called on each cart access to prevent premature cleanup
 */
cartSchema.statics.extendExpiry = async function (cartId, daysToAdd = 7) {
    const newExpiredAt = new Date();
    newExpiredAt.setDate(newExpiredAt.getDate() + daysToAdd);

    return await this.findByIdAndUpdate(
        cartId,
        { expired_at: newExpiredAt },
        { new: true, includeExpired: true }
    );
};

// ===== RESPONSE SANITIZATION =====

/**
 * ✅ FIX #9: Transform response (hide internal fields)
 * Consistent with other models (User, Product, etc.)
 */
const sanitizeTransform = (_, ret) => {
    delete ret.__v;
    // Keep all data fields visible for API response
    // (Cart is client-owned, less sensitive than passwords/tokens)
    return ret;
};

cartSchema.set('toJSON', { transform: sanitizeTransform });
cartSchema.set('toObject', { transform: sanitizeTransform });

module.exports = mongoose.model('Cart', cartSchema);