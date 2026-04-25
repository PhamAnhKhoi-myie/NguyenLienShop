const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
    {
        // Ownership & Context (MANDATORY)
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        product_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true,
            index: true
        },
        variant_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Variant',
            required: true,
            index: true
        },
        order_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order',
            required: true
        },

        // Purchase Verification (MANDATORY)
        is_verified_purchase: {
            type: Boolean,
            default: false,
            index: true
        },

        // Rating
        rating: {
            overall: {
                type: Number,
                min: 1,
                max: 5,
                required: true,
                index: true
            },
            quality: {
                type: Number,
                min: 1,
                max: 5,
                sparse: true
            },
            value_for_money: {
                type: Number,
                min: 1,
                max: 5,
                sparse: true
            },
            delivery_speed: {
                type: Number,
                min: 1,
                max: 5,
                sparse: true
            }
        },

        // Content
        title: {
            type: String,
            maxlength: 200,
            trim: true,
            sparse: true
        },
        content: {
            type: String,
            required: true,
            minlength: 10,
            maxlength: 5000,
            trim: true
        },

        // Edit Tracking (IMPORTANT)
        original_content: {
            type: String,
            sparse: true
        },
        edited_at: {
            type: Date,
            sparse: true
        },
        edit_count: {
            type: Number,
            default: 0,
            min: 0
        },

        // Moderation (CRITICAL)
        is_approved: {
            type: Boolean,
            default: false,
            index: true
        },
        is_flagged: {
            type: Boolean,
            default: false,
            index: true
        },
        flag_reason: {
            type: String,
            enum: ['spam', 'inappropriate', 'fake', 'duplicate', 'other'],
            sparse: true
        },
        approved_at: {
            type: Date,
            sparse: true
        },
        approved_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            sparse: true
        },
        rejected_at: {
            type: Date,
            sparse: true
        },
        rejection_reason: {
            type: String,
            sparse: true
        },
        flagged_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            sparse: true
        },

        // Helpful Voting (NICE-TO-HAVE)
        helpful_count: {
            type: Number,
            default: 0,
            min: 0
        },
        unhelpful_count: {
            type: Number,
            default: 0,
            min: 0
        },
        helpful_by: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            }
        ],
        unhelpful_by: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            }
        ],

        // Soft Delete (MANDATORY)
        is_deleted: {
            type: Boolean,
            default: false,
            index: true
        },
        deleted_at: {
            type: Date,
            sparse: true
        },

        // Timestamps
        created_at: {
            type: Date,
            default: Date.now,
            index: true
        },
        updated_at: {
            type: Date,
            default: Date.now
        }
    },
    { timestamps: false } // ✅ We manage timestamps manually
);

// ✅ CRITICAL: Auto-exclude soft-deleted & unapproved reviews from public queries
reviewSchema.pre(/^find/, function () {
    // Only show approved OR user's own reviews
    if (!this.getOptions().includeUnapproved) {
        this.where({ is_deleted: false, is_approved: true });
    }
});

// ✅ CRITICAL: Prevent duplicate review from same user on same product
reviewSchema.index(
    { user_id: 1, product_id: 1, variant_id: 1 },
    {
        unique: true,
        sparse: true,
        partialFilterExpression: { is_deleted: false }
    }
);

// ✅ Indexes for queries
reviewSchema.index({ product_id: 1, is_approved: 1, created_at: -1 });
reviewSchema.index({ user_id: 1, created_at: -1 });
reviewSchema.index({ is_flagged: 1, is_approved: 1 });
reviewSchema.index({ variant_id: 1, is_approved: 1 });

// ✅ Update timestamps on save
reviewSchema.pre('save', function (next) {
    if (this.isNew) {
        this.created_at = new Date();
    }
    this.updated_at = new Date();
    next();
});

module.exports = mongoose.model('Review', reviewSchema);