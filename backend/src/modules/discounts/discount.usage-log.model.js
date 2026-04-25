const mongoose = require('mongoose');

/**
 * DiscountUsageLog Schema
 * Tracks per-user discount usage for:
 * - Enforcing per-user usage limits
 * - Audit trail of discount redemptions
 * - Analytics and reporting
 *
 * Design Notes:
 * - TTL index on createdAt (auto-cleanup old logs after 1 year)
 * - Compound index on (discountId, userId) for fast lookup of user usage count
 * - Used at checkout time to verify user hasn't exceeded limits
 */
const discountUsageLogSchema = new mongoose.Schema(
    {
        discount_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Discount',
            required: true,
            index: true,
            description: 'Reference to the discount that was used',
        },
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: false, // Guest users may not have user_id
            sparse: true, // Allow null for guest users, but don't index nulls
            index: true,
            description: 'Reference to user who used the discount (null for guests)',
        },
        order_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order',
            required: false,
            description: 'Reference to order where discount was applied (optional)',
        },
        discount_code: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
            description: 'Discount code for easy identification',
        },
        discount_amount: {
            type: Number,
            required: true,
            description: 'Amount of discount given (in VND)',
        },
        order_total: {
            type: Number,
            required: false,
            description: 'Total order value this discount was applied to',
        },
        session_key: {
            type: String,
            required: false,
            description: 'Session identifier for guest carts (UUID)',
        },
        ip_address: {
            type: String,
            required: false,
            description: 'IP address of user who applied discount (for fraud detection)',
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            required: false,
            description: 'Additional metadata (device, browser, etc.) for tracking',
        },
        created_at: {
            type: Date,
            default: Date.now,
            description: 'When the discount was used',
        },
    },
    {
        collection: 'discount_usage_logs',
        timestamps: { createdAt: 'created_at', updatedAt: false }, // No updatedAt
    }
);

/**
 * Indexes for Performance & Querying
 */

// Simple index on created_at for sorting
discountUsageLogSchema.index({ created_at: 1 }, { expireAfterSeconds: 31536000 }); // TTL: 365 days

// Compound index: Fast lookup of how many times a user has used a specific discount
discountUsageLogSchema.index({ discount_id: 1, user_id: 1, created_at: -1 });

// Compound index: All usage for a discount (for analytics)
discountUsageLogSchema.index({ discount_id: 1, created_at: -1 });

// Index for guest cart tracking
discountUsageLogSchema.index({ discount_id: 1, session_key: 1 });

/**
 * Statics: Database Query Methods
 */

/**
 * Get count of times a user has used a specific discount
 * @param {ObjectId} discountId - Discount ID
 * @param {ObjectId} userId - User ID
 * @returns {Promise<number>} - Count of usage
 */
discountUsageLogSchema.statics.getUserUsageCount = async function (discountId, userId) {
    const count = await this.countDocuments({
        discount_id: discountId,
        user_id: userId,
        created_at: { $gte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
    });
    return count;
};

/**
 * Get total usage count of a discount
 * @param {ObjectId} discountId - Discount ID
 * @returns {Promise<number>} - Total count
 */
discountUsageLogSchema.statics.getTotalUsageCount = async function (discountId) {
    const count = await this.countDocuments({ discount_id: discountId });
    return count;
};

/**
 * Get unique user count who used a discount
 * @param {ObjectId} discountId - Discount ID
 * @returns {Promise<number>} - Count of unique users
 */
discountUsageLogSchema.statics.getUniqueUserCount = async function (discountId) {
    const result = await this.aggregate([
        { $match: { discount_id: discountId, user_id: { $ne: null } } },
        { $group: { _id: '$user_id' } },
        { $count: 'unique_users' },
    ]);
    return result[0]?.unique_users || 0;
};

/**
 * Get total discount revenue given
 * @param {ObjectId} discountId - Discount ID
 * @returns {Promise<number>} - Total amount in VND
 */
discountUsageLogSchema.statics.getTotalDiscountRevenue = async function (discountId) {
    const result = await this.aggregate([
        { $match: { discount_id: discountId } },
        { $group: { _id: null, total_discount: { $sum: '$discount_amount' } } },
    ]);
    return result[0]?.total_discount || 0;
};

/**
 * Log a discount usage
 * Called when discount is successfully applied to an order
 * @param {Object} data - Usage data
 * @returns {Promise<Document>} - Created usage log
 */
discountUsageLogSchema.statics.logUsage = async function (data) {
    const {
        discountId,
        userId,
        orderId,
        discountCode,
        discountAmount,
        orderTotal,
        sessionKey,
        ipAddress,
        metadata,
    } = data;

    return this.create({
        discount_id: discountId,
        user_id: userId || null,
        order_id: orderId || null,
        discount_code: discountCode,
        discount_amount: discountAmount,
        order_total: orderTotal,
        session_key: sessionKey,
        ip_address: ipAddress,
        metadata,
    });
};

/**
 * Get recent usage logs for a discount (for dashboard)
 * @param {ObjectId} discountId - Discount ID
 * @param {number} limit - Max results (default 10)
 * @returns {Promise<Array>} - Array of recent usage logs
 */
discountUsageLogSchema.statics.getRecentUsage = async function (discountId, limit = 10) {
    return this.find({ discount_id: discountId })
        .select('user_id discount_code discount_amount order_total created_at')
        .sort({ created_at: -1 })
        .limit(limit)
        .lean();
};

const DiscountUsageLog = mongoose.model('DiscountUsageLog', discountUsageLogSchema);

module.exports = DiscountUsageLog;
