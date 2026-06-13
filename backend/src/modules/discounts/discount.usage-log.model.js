const mongoose = require('mongoose');













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
            required: false,
            sparse: true,
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
        timestamps: { createdAt: 'created_at', updatedAt: false },
    }
);






discountUsageLogSchema.index({ created_at: 1 }, { expireAfterSeconds: 31536000 });


discountUsageLogSchema.index({ discount_id: 1, user_id: 1, created_at: -1 });


discountUsageLogSchema.index({ discount_id: 1, created_at: -1 });


discountUsageLogSchema.index({ discount_id: 1, session_key: 1 });











discountUsageLogSchema.statics.getUserUsageCount = async function (discountId, userId) {
    const count = await this.countDocuments({
        discount_id: discountId,
        user_id: userId,
        created_at: { $gte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000) },
    });
    return count;
};






discountUsageLogSchema.statics.getTotalUsageCount = async function (discountId) {
    const count = await this.countDocuments({ discount_id: discountId });
    return count;
};






discountUsageLogSchema.statics.getUniqueUserCount = async function (discountId) {
    const result = await this.aggregate([
        { $match: { discount_id: discountId, user_id: { $ne: null } } },
        { $group: { _id: '$user_id' } },
        { $count: 'unique_users' },
    ]);
    return result[0]?.unique_users || 0;
};






discountUsageLogSchema.statics.getTotalDiscountRevenue = async function (discountId) {
    const result = await this.aggregate([
        { $match: { discount_id: discountId } },
        { $group: { _id: null, total_discount: { $sum: '$discount_amount' } } },
    ]);
    return result[0]?.total_discount || 0;
};







discountUsageLogSchema.statics.logUsage = async function (data, options = {}) {
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

    const payload = {
        discount_id: discountId,
        user_id: userId || null,
        order_id: orderId || null,
        discount_code: discountCode,
        discount_amount: discountAmount,
        order_total: orderTotal,
        session_key: sessionKey,
        ip_address: ipAddress,
        metadata,
    };

    if (options.session) {
        const [created] = await this.create([payload], { session: options.session });
        return created;
    }

    return this.create(payload);
};







discountUsageLogSchema.statics.getRecentUsage = async function (discountId, limit = 10) {
    return this.find({ discount_id: discountId })
        .select('user_id discount_code discount_amount order_total created_at')
        .sort({ created_at: -1 })
        .limit(limit)
        .lean();
};

const DiscountUsageLog = mongoose.model('DiscountUsageLog', discountUsageLogSchema);

module.exports = DiscountUsageLog;
