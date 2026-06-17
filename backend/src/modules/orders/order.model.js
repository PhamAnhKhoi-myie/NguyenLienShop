const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
    {

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

        },


        address_snapshot: {
            receiver_name: String,
            phone: String,
            province_code: String,
            province_name: String,
            ward_code: String,
            ward_name: String,
            detail: String,
            full_address: String,
            note: String,
            street: String,
            district: String,
            city: String,
            postal_code: String,
            country: String,
            recipient_name: String
        },


        items: [
            {
                _id: mongoose.Schema.Types.ObjectId,

                product_id: mongoose.Schema.Types.ObjectId,
                variant_id: mongoose.Schema.Types.ObjectId,
                unit_id: mongoose.Schema.Types.ObjectId,
                product_type: {
                    type: String,
                    enum: ['SIMPLE', 'VARIABLE'],
                    default: 'VARIABLE',
                },

                product_name: { type: String, required: true },
                product_image: String,
                variant_label: { type: String, required: true },
                sku: { type: String, required: true },

                unit_label: { type: String, required: true },
                pack_size: { type: Number, required: true },

                quantity_ordered: {
                    type: Number,
                    required: true,

                },
                quantity_fulfilled: {
                    type: Number,
                    default: 0

                },

                unit_price: {
                    type: Number,
                    required: true,
                    validate: {
                        validator: Number.isInteger,
                        message: 'Unit price must be an integer'
                    }

                },
                original_unit_price: {
                    type: Number,
                    default: 0,
                    validate: {
                        validator: Number.isInteger,
                        message: 'Original unit price must be an integer'
                    }
                },
                promotion_discount_amount: {
                    type: Number,
                    default: 0,
                    validate: {
                        validator: Number.isInteger,
                        message: 'Promotion discount must be an integer'
                    }
                },
                promotion_discount_percent: {
                    type: Number,
                    default: 0,
                    min: 0,
                    max: 99
                },
                is_on_sale: {
                    type: Boolean,
                    default: false
                },
                line_total: {
                    type: Number,
                    required: true,
                    validate: {
                        validator: Number.isInteger,
                        message: 'Line total must be an integer'
                    }

                },
                original_line_total: {
                    type: Number,
                    default: 0,
                    validate: {
                        validator: Number.isInteger,
                        message: 'Original line total must be an integer'
                    }
                },

                review_status: {
                    type: String,
                    enum: ['pending', 'reviewed'],
                    default: 'pending'
                }
            }
        ],


        pricing: {
            original_subtotal: {
                type: Number,
                default: 0,
                validate: Number.isInteger
            },
            promotion_discount_amount: {
                type: Number,
                default: 0,
                validate: Number.isInteger
            },
            subtotal: {
                type: Number,
                required: true,
                validate: Number.isInteger
            },
            shipping_fee: {
                type: Number,
                default: 0,
                validate: Number.isInteger
            },
            discount_amount: {
                type: Number,
                default: 0,
                validate: Number.isInteger
            },
            total_amount: {
                type: Number,
                required: true,
                validate: Number.isInteger
            }
        },

        currency: {
            type: String,
            default: 'VND',
            enum: ['VND', 'USD', 'EUR']
        },


        discount: {
            code: String,
            type: {
                type: String,
                enum: ['percentage', 'fixed', null],
                default: null
            },
            value: Number,
            scope: {
                type: String,
                enum: ['ORDER', 'ITEM'],
                default: 'ORDER'
            },
            applied_amount: Number
        },


        payment: {
            method: {
                type: String,
                enum: ['COD', 'VNPAY', 'PAYPAL', 'PAYOS', 'MOMO', 'CARD'],
                required: true
            },
            status: {
                type: String,
                enum: ['PENDING', 'PAID', 'FAILED', 'REFUND_PENDING', 'REFUNDED'],
                default: 'PENDING'
            },
            paid_at: Date,
            refund_requested_at: Date,
            refunded_at: Date,
            refund_reference: String,
            refund_note: String,
            refund_reason: String,
            refund_completed_by: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            }
        },

        payment_id: mongoose.Schema.Types.ObjectId,


        shipment: {
            carrier: String,
            tracking_code: String,
            shipped_at: Date,
            delivered_at: Date
        },

        shipment_id: mongoose.Schema.Types.ObjectId,

        customer_receipt: {
            confirmed_at: Date,
            confirmed_by: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            }
        },

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
                changed_by: mongoose.Schema.Types.ObjectId,
                note: String
            }
        ],


        payment_expires_at: Date,


        is_deleted: { type: Boolean, default: false, index: true },
        deleted_at: Date,


        notes: String,
        customer_notes: String
    },
    {
        timestamps: true,
        collection: 'orders'
    }
);


orderSchema.index({ user_id: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ 'payment.status': 1 });
orderSchema.index({ payment_expires_at: 1 });
orderSchema.index({ is_deleted: 1, createdAt: -1 });



orderSchema.statics.generateOrderCode = async function () {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    const code = `ORD-${date}-${random}`;

    const existing = await this.findOne({ order_code: code });
    if (existing) {
        return this.generateOrderCode();
    }

    return code;
};

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

orderSchema.methods.getTotalItemsOrdered = function () {
    return this.items.reduce((sum, item) => {
        return sum + (item.quantity_ordered * item.pack_size);
    }, 0);
};

orderSchema.methods.getTotalItemsFulfilled = function () {
    return this.items.reduce((sum, item) => {
        return sum + (item.quantity_fulfilled * item.pack_size);
    }, 0);
};

orderSchema.methods.canBeFulfilled = function () {
    return ['PAID', 'PROCESSING'].includes(this.status);
};

orderSchema.methods.canBeCanceled = function () {
    return ['PENDING', 'PAID', 'PROCESSING'].includes(this.status);
};



orderSchema.pre('updateOne', function (next) {
    if (this.getUpdate().$set && this.getUpdate().$set.is_deleted === true) {
        this.getUpdate().$set.deleted_at = new Date();
    }
    next();
});

orderSchema.pre(/^find/, function (next) {
    if (this.getOptions().includeDeleted !== true) {
        this.where({ is_deleted: false });
    }
    next();
});

module.exports = mongoose.model('Order', orderSchema);
