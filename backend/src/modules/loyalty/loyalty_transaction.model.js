const mongoose = require('mongoose');
const {
    TIER_ORDER,
    TRANSACTION_TYPES,
    TRANSACTION_SOURCES,
} = require('./loyalty.config');

const loyaltyTransactionSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        order_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order',
            default: null,
            index: true,
        },
        type: {
            type: String,
            enum: Object.values(TRANSACTION_TYPES),
            required: true,
            index: true,
        },
        source: {
            type: String,
            enum: Object.values(TRANSACTION_SOURCES),
            required: true,
            index: true,
        },
        points_amount: {
            type: Number,
            default: 0,
            validate: {
                validator: Number.isInteger,
                message: 'Points amount must be an integer',
            },
        },
        coins_amount: {
            type: Number,
            default: 0,
            validate: {
                validator: Number.isInteger,
                message: 'Coins amount must be an integer',
            },
        },
        balance_after: {
            points: {
                type: Number,
                default: 0,
                validate: Number.isInteger,
            },
            lifetime_points: {
                type: Number,
                default: 0,
                validate: Number.isInteger,
            },
            coins_balance: {
                type: Number,
                default: 0,
                validate: Number.isInteger,
            },
            tier: {
                type: String,
                enum: TIER_ORDER,
                default: 'bronze',
            },
        },
        tier_change: {
            from: {
                type: String,
                enum: [...TIER_ORDER, null],
                default: null,
            },
            to: {
                type: String,
                enum: [...TIER_ORDER, null],
                default: null,
            },
            reason: {
                type: String,
                trim: true,
                default: null,
            },
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    {
        collection: 'loyalty_transactions',
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        },
    }
);

loyaltyTransactionSchema.index(
    { user_id: 1, order_id: 1, source: 1 },
    {
        unique: true,
        name: 'loyalty_order_reward_unique_idx',
        partialFilterExpression: {
            order_id: { $type: 'objectId' },
        },
    }
);
loyaltyTransactionSchema.index(
    { user_id: 1, created_at: -1 },
    { name: 'loyalty_user_history_idx' }
);
loyaltyTransactionSchema.index(
    { source: 1, created_at: -1 },
    { name: 'loyalty_source_history_idx' }
);

module.exports = mongoose.model(
    'LoyaltyTransaction',
    loyaltyTransactionSchema
);
