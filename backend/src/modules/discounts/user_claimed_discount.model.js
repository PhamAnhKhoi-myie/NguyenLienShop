const mongoose = require('mongoose');

const userClaimedDiscountSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        discount_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Discount',
            required: true,
            index: true,
        },
        discount_code: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
        },
        status: {
            type: String,
            enum: ['claimed', 'used', 'expired', 'revoked'],
            default: 'claimed',
            index: true,
        },
        used_count: {
            type: Number,
            default: 0,
            min: 0,
        },
        claimed_at: {
            type: Date,
            default: Date.now,
        },
        last_used_at: {
            type: Date,
            default: null,
        },
        used_at: {
            type: Date,
            default: null,
        },
        order_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order',
            default: null,
        },
    },
    {
        collection: 'user_claimed_discounts',
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        },
    }
);

userClaimedDiscountSchema.index(
    { user_id: 1, discount_id: 1 },
    { unique: true, name: 'user_discount_claim_unique_idx' }
);
userClaimedDiscountSchema.index(
    { user_id: 1, status: 1, claimed_at: -1 },
    { name: 'user_claimed_discount_status_idx' }
);

const UserClaimedDiscount = mongoose.model(
    'UserClaimedDiscount',
    userClaimedDiscountSchema
);

module.exports = UserClaimedDiscount;
