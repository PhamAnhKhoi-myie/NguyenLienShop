const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
    {
        // === CORE IDENTIFICATION ===
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },

        order_code: {
            type: String,
            unique: true,
            required: true,
            // Format: ORD-YYYYMMDD-XXXXX
        },

        // === ADDRESS SNAPSHOT (Immutable) ===
        address_snapshot: {
            street: String,
            district: String,
            city: String,
            postal_code: String,
            country: String,
            phone: String,
            recipient_name: String
        },

        // === ITEMS (Order Snapshot) ===
        items: [
            {
                _id: mongoose.Schema.Types.ObjectId,

                // ✅ References (for lookup/reorder/review)
                product_id: mongoose.Schema.Types.ObjectId,
                variant_id: mongoose.Schema.Types.ObjectId,
                unit_id: mongoose.Schema.Types.ObjectId,

                // ✅ Snapshot data (IMMUTABLE - frozen at order time)
                product_name: { type: String, required: true },
                product_image: String,
                variant_label: { type: String, required: true },
                sku: { type: String, required: true },

                // unit_id = reference; pack_size = snapshot (not redundant)
                unit_label: { type: String, required: true }, // "Gói 100 cái"
                pack_size: { type: Number, required: true },   // 100 items per pack

                // ✅ Quantity tracking
                quantity_ordered: {
                    type: Number,
                    required: true,
                    // Number of PACKS (not individual items)
                },
                quantity_fulfilled: {
                    type: Number,
                    default: 0
                    // Number of PACKS fulfilled
                },

                // ✅ Pricing snapshot (IMMUTABLE)
                unit_price: {
                    type: Number,
                    required: true
                    // Price per PACK at order time
                },
                line_total: {
                    type: Number,
                    required: true
                    // quantity_ordered × unit_price (snapshot)
                },

                // ✅ Review tracking
                review_status: {
                    type: String,
                    enum: ['pending', 'reviewed'],
                    default: 'pending'
                }
            }
        ],

        // === PRICING BREAKDOWN (All immutable) ===
        pricing: {
            subtotal: { type: Number, required: true },      // Sum of line_totals
            shipping_fee: { type: Number, default: 0 },
            discount_amount: { type: Number, default: 0 },   // Applied discount
            total_amount: { type: Number, required: true }   // Final amount
        },

        currency: {
            type: String,
            default: 'VND',
            enum: ['VND', 'USD', 'EUR']
        },

        // === DISCOUNT SNAPSHOT ===
        discount: {
            code: String,                                     // Promo code reference
            type: {
                type: String,
                enum: ['percentage', 'fixed', null],
                default: null
            },
            value: Number,                                    // % or amount
            scope: {
                type: String,
                enum: ['ORDER', 'ITEM'],
                default: 'ORDER'
            },
            applied_amount: Number                            // Actual discount applied
        },

        // === PAYMENT SNAPSHOT ===
        payment: {
            method: {
                type: String,
                enum: ['COD', 'VNPAY', 'MOMO', 'CARD'],
                required: true
            },
            status: {
                type: String,
                enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'],
                default: 'PENDING'
            },
            paid_at: Date,
            refunded_at: Date
        },

        payment_id: mongoose.Schema.Types.ObjectId,        // External payment record

        // === SHIPMENT SNAPSHOT (Lightweight) ===
        shipment: {
            carrier: String,                                  // 'GHN', 'GRAB', etc
            tracking_code: String,
            shipped_at: Date,
            delivered_at: Date
        },

        shipment_id: mongoose.Schema.Types.ObjectId,       // External shipment record

        // === ORDER STATUS & LIFECYCLE ===
        status: {
            type: String,
            enum: ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'FAILED', 'CANCELED'],
            default: 'PENDING',
        },

        status_history: [
            {
                from: String,
                to: String,
                changed_at: { type: Date, default: Date.now },
                changed_by: mongoose.Schema.Types.ObjectId,    // Optional: admin/system user
                note: String                                     // Why the change?
            }
        ],

        // === TIMESTAMPS & EXPIRY ===
        payment_expires_at: Date,                           // Auto-fail PENDING order

        // === AUDIT & SOFT DELETE ===
        is_deleted: { type: Boolean, default: false, index: true },
        deleted_at: Date,

        // === METADATA ===
        notes: String,                                      // Admin notes
        customer_notes: String                              // Customer notes at checkout
    },
    {
        timestamps: true,
        collection: 'orders'
    }
);

// ===== INDEXES =====
orderSchema.index({ user_id: 1, created_at: -1 });     // User order history
orderSchema.index({ status: 1, created_at: -1 });       // Status filtering with newest first
orderSchema.index({ 'payment.status': 1 });            // Payment status
orderSchema.index({ payment_expires_at: 1 });          // TTL cleanup
orderSchema.index({ is_deleted: 1, created_at: -1 });  // Soft-delete queries

// ===== METHODS =====

/**
 * Generate unique order code
 * Format: ORD-YYYYMMDD-XXXXX (5 random alphanumeric)
 */
orderSchema.statics.generateOrderCode = async function () {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    const code = `ORD-${date}-${random}`;

    // Ensure uniqueness
    const existing = await this.findOne({ order_code: code });
    if (existing) {
        return this.generateOrderCode(); // Recursive retry
    }

    return code;
};

/**
 * Add status transition with audit trail
 */
orderSchema.methods.addStatusTransition = function (
    toStatus,
    changedBy = null,
    note = ''
) {
    this.status_history.push({
        from: this.status,
        to: toStatus,
        changed_at: new Date(),
        changed_by: changedBy,
        note
    });

    this.status = toStatus;
};

/**
 * Calculate total items ordered
 * Useful for display: "120 items" = 3 packs × 40
 */
orderSchema.methods.getTotalItemsOrdered = function () {
    return this.items.reduce((sum, item) => {
        return sum + (item.quantity_ordered * item.pack_size);
    }, 0);
};

/**
 * Calculate total items fulfilled
 * (No need to store in DB - derived field)
 */
orderSchema.methods.getTotalItemsFulfilled = function () {
    return this.items.reduce((sum, item) => {
        return sum + (item.quantity_fulfilled * item.pack_size);
    }, 0);
};

/**
 * Check if order can be fulfilled
 * (status must be PAID or PROCESSING)
 */
orderSchema.methods.canBeFulfilled = function () {
    return ['PAID', 'PROCESSING'].includes(this.status);
};

/**
 * Check if order can be canceled
 * (before shipping)
 */
orderSchema.methods.canBeCanceled = function () {
    return ['PENDING', 'PAID', 'PROCESSING'].includes(this.status);
};

// ===== MIDDLEWARE =====

/**
 * Soft delete: set is_deleted + deleted_at
 */
orderSchema.pre('updateOne', function (next) {
    if (this.getUpdate().$set && this.getUpdate().$set.is_deleted === true) {
        this.getUpdate().$set.deleted_at = new Date();
    }
    next();
});

/**
 * Always exclude soft-deleted orders in queries
 */
orderSchema.pre(/^find/, function (next) {
    if (this.getOptions().includeDeleted !== true) {
        this.where({ is_deleted: false });
    }
    next();
});

module.exports = mongoose.model('Order', orderSchema);