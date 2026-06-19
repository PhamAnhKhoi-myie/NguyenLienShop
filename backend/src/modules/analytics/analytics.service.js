const User = require('../users/user.model');
const Product = require('../products/product.model');
const Order = require('../orders/order.model');
const Category = require('../categories/category.model');

const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh';
const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;
const DEFAULT_RANGE_DAYS = 30;
const LONG_RANGE_DAYS = 186;

function parseLocalDate(value, endOfDay = false) {
    if (!value) {
        return null;
    }

    const normalized = String(value).trim();
    const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (match) {
        const [, year, month, day] = match.map(Number);
        const utcMidnight = Date.UTC(year, month - 1, day) - VIETNAM_OFFSET_MS;
        const date = new Date(utcMidnight);

        if (endOfDay) {
            date.setUTCDate(date.getUTCDate() + 1);
            date.setUTCMilliseconds(date.getUTCMilliseconds() - 1);
        }

        return date;
    }

    const parsed = new Date(normalized);

    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return parsed;
}

function getLocalStartOfToday(now = new Date()) {
    const local = new Date(now.getTime() + VIETNAM_OFFSET_MS);

    return new Date(
        Date.UTC(
            local.getUTCFullYear(),
            local.getUTCMonth(),
            local.getUTCDate()
        ) - VIETNAM_OFFSET_MS
    );
}

function buildDateRange(filters = {}, now = new Date()) {
    const todayStart = getLocalStartOfToday(now);
    const defaultTo = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
    const defaultFrom = new Date(
        todayStart.getTime() - (DEFAULT_RANGE_DAYS - 1) * 24 * 60 * 60 * 1000
    );

    const from = parseLocalDate(filters.date_from) || defaultFrom;
    const to = parseLocalDate(filters.date_to, true) || defaultTo;
    const safeTo = to < from ? defaultTo : to;
    const rangeDays = Math.max(
        Math.ceil((safeTo.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)),
        1
    );
    const granularity =
        rangeDays > LONG_RANGE_DAYS ? 'month' : filters.granularity || 'day';

    return {
        from,
        to: safeTo,
        granularity,
        range_days: rangeDays,
        timezone: VIETNAM_TIMEZONE,
    };
}

function getDateFormat(granularity) {
    return granularity === 'month' ? '%Y-%m' : '%Y-%m-%d';
}

function emptyRevenueTotals() {
    return {
        gross_sales: 0,
        product_discount: 0,
        voucher_discount: 0,
        shipping_fee: 0,
        net_revenue: 0,
        order_count: 0,
        average_order_value: 0,
    };
}

function normalizeBreakdown(items, keyName) {
    return (items || []).map((item) => ({
        [keyName]: item._id || 'UNKNOWN',
        count: item.count || 0,
    }));
}

class AnalyticsService {
    static async getDashboardStats(filters = {}) {
        const range = buildDateRange(filters);

        const [customers, products, revenue] = await Promise.all([
            this.getCustomerStats(range),
            this.getProductStats(range),
            this.getRevenueStats(range),
        ]);

        return {
            range: {
                date_from: range.from,
                date_to: range.to,
                granularity: range.granularity,
                timezone: range.timezone,
            },
            customers,
            products,
            revenue,
        };
    }

    static async getCustomerStats(range) {
        const customerMatch = {
            $and: [
                { roles: 'CUSTOMER' },
                { roles: { $nin: ['ADMIN', 'MANAGER'] } },
            ],
            deleted_at: null,
        };

        const [total, newSeries, statusBreakdown, tierBreakdown] =
            await Promise.all([
                User.countDocuments(customerMatch),
                User.aggregate([
                    {
                        $match: {
                            ...customerMatch,
                            created_at: {
                                $gte: range.from,
                                $lte: range.to,
                            },
                        },
                    },
                    {
                        $group: {
                            _id: {
                                $dateToString: {
                                    format: getDateFormat(range.granularity),
                                    date: '$created_at',
                                    timezone: VIETNAM_TIMEZONE,
                                },
                            },
                            count: { $sum: 1 },
                        },
                    },
                    { $sort: { _id: 1 } },
                ]),
                User.aggregate([
                    { $match: customerMatch },
                    {
                        $group: {
                            _id: '$status',
                            count: { $sum: 1 },
                        },
                    },
                    { $sort: { count: -1 } },
                ]),
                User.aggregate([
                    { $match: customerMatch },
                    {
                        $group: {
                            _id: { $ifNull: ['$tier', 'bronze'] },
                            count: { $sum: 1 },
                        },
                    },
                    { $sort: { count: -1 } },
                ]),
            ]);

        return {
            total,
            new_series: newSeries.map((item) => ({
                date: item._id,
                count: item.count,
            })),
            status_breakdown: normalizeBreakdown(statusBreakdown, 'status'),
            tier_breakdown: normalizeBreakdown(tierBreakdown, 'tier'),
        };
    }

    static async getProductStats(range) {
        const paidOrderMatch = this.getPaidOrderMatch(range);

        const [total, statusBreakdown, categoryBreakdown, topSelling] =
            await Promise.all([
                Product.countDocuments({ is_deleted: false }),
                Product.aggregate([
                    { $match: { is_deleted: false } },
                    {
                        $group: {
                            _id: '$status',
                            count: { $sum: 1 },
                        },
                    },
                    { $sort: { count: -1 } },
                ]),
                Product.aggregate([
                    { $match: { is_deleted: false } },
                    {
                        $group: {
                            _id: '$category_id',
                            count: { $sum: 1 },
                        },
                    },
                    { $sort: { count: -1 } },
                    { $limit: 8 },
                    {
                        $lookup: {
                            from: Category.collection.name,
                            localField: '_id',
                            foreignField: '_id',
                            as: 'category',
                        },
                    },
                    {
                        $unwind: {
                            path: '$category',
                            preserveNullAndEmptyArrays: true,
                        },
                    },
                    {
                        $project: {
                            category_id: '$_id',
                            name: {
                                $ifNull: ['$category.name', 'Uncategorized'],
                            },
                            count: 1,
                        },
                    },
                ]),
                Order.aggregate([
                    { $match: paidOrderMatch },
                    { $unwind: '$items' },
                    {
                        $group: {
                            _id: '$items.product_id',
                            name: { $first: '$items.product_name' },
                            quantity: {
                                $sum: {
                                    $multiply: [
                                        '$items.quantity_ordered',
                                        '$items.pack_size',
                                    ],
                                },
                            },
                            revenue: { $sum: '$items.line_total' },
                        },
                    },
                    { $sort: { quantity: -1, revenue: -1 } },
                    { $limit: 8 },
                    {
                        $project: {
                            product_id: '$_id',
                            name: 1,
                            quantity: 1,
                            revenue: 1,
                            _id: 0,
                        },
                    },
                ]),
            ]);

        return {
            total,
            status_breakdown: normalizeBreakdown(statusBreakdown, 'status'),
            category_breakdown: categoryBreakdown.map((item) => ({
                category_id: item.category_id?.toString?.() || null,
                name: item.name,
                count: item.count,
            })),
            top_selling: topSelling.map((item) => ({
                product_id: item.product_id?.toString?.() || null,
                name: item.name,
                quantity: item.quantity || 0,
                revenue: item.revenue || 0,
            })),
        };
    }

    static async getRevenueStats(range) {
        const paidOrderMatch = this.getPaidOrderMatch(range);
        const dateFormat = getDateFormat(range.granularity);

        const [totalsResult, series, paymentMethodBreakdown] =
            await Promise.all([
                Order.aggregate([
                    { $match: paidOrderMatch },
                    {
                        $group: {
                            _id: null,
                            gross_sales: {
                                $sum: {
                                    $ifNull: [
                                        '$pricing.original_subtotal',
                                        '$pricing.subtotal',
                                    ],
                                },
                            },
                            product_discount: {
                                $sum: '$pricing.promotion_discount_amount',
                            },
                            voucher_discount: {
                                $sum: '$pricing.discount_amount',
                            },
                            shipping_fee: { $sum: '$pricing.shipping_fee' },
                            net_revenue: { $sum: '$pricing.total_amount' },
                            order_count: { $sum: 1 },
                        },
                    },
                    {
                        $project: {
                            gross_sales: 1,
                            product_discount: 1,
                            voucher_discount: 1,
                            shipping_fee: 1,
                            net_revenue: 1,
                            order_count: 1,
                            average_order_value: {
                                $cond: [
                                    { $gt: ['$order_count', 0] },
                                    {
                                        $round: [
                                            {
                                                $divide: [
                                                    '$net_revenue',
                                                    '$order_count',
                                                ],
                                            },
                                            0,
                                        ],
                                    },
                                    0,
                                ],
                            },
                        },
                    },
                ]),
                Order.aggregate([
                    { $match: paidOrderMatch },
                    {
                        $group: {
                            _id: {
                                $dateToString: {
                                    format: dateFormat,
                                    date: '$payment.paid_at',
                                    timezone: VIETNAM_TIMEZONE,
                                },
                            },
                            revenue: { $sum: '$pricing.total_amount' },
                            orders: { $sum: 1 },
                        },
                    },
                    { $sort: { _id: 1 } },
                ]),
                Order.aggregate([
                    { $match: paidOrderMatch },
                    {
                        $group: {
                            _id: '$payment.method',
                            revenue: { $sum: '$pricing.total_amount' },
                            orders: { $sum: 1 },
                        },
                    },
                    { $sort: { revenue: -1 } },
                ]),
            ]);

        const totals = totalsResult[0] || emptyRevenueTotals();

        return {
            ...emptyRevenueTotals(),
            ...totals,
            series: series.map((item) => ({
                date: item._id,
                revenue: item.revenue || 0,
                orders: item.orders || 0,
            })),
            payment_method_breakdown: paymentMethodBreakdown.map((item) => ({
                method: item._id || 'UNKNOWN',
                revenue: item.revenue || 0,
                orders: item.orders || 0,
            })),
        };
    }

    static getPaidOrderMatch(range) {
        return {
            is_deleted: false,
            status: { $nin: ['CANCELED', 'FAILED'] },
            'payment.status': 'PAID',
            'payment.paid_at': {
                $gte: range.from,
                $lte: range.to,
            },
        };
    }
}

module.exports = AnalyticsService;
