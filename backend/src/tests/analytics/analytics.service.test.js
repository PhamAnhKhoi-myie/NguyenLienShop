const AnalyticsService = require('../../modules/analytics/analytics.service');
const User = require('../../modules/users/user.model');
const Product = require('../../modules/products/product.model');
const Order = require('../../modules/orders/order.model');

describe('AnalyticsService dashboard stats', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('aggregates customers, products, and paid revenue from backend models', async () => {
        jest.spyOn(User, 'countDocuments').mockResolvedValue(12);
        jest.spyOn(User, 'aggregate')
            .mockResolvedValueOnce([{ _id: '2026-06-01', count: 2 }])
            .mockResolvedValueOnce([{ _id: 'ACTIVE', count: 10 }])
            .mockResolvedValueOnce([{ _id: 'silver', count: 4 }]);

        jest.spyOn(Product, 'countDocuments').mockResolvedValue(8);
        jest.spyOn(Product, 'aggregate')
            .mockResolvedValueOnce([{ _id: 'ACTIVE', count: 7 }])
            .mockResolvedValueOnce([
                { category_id: null, name: 'Bao trai cay', count: 5 },
            ]);

        jest.spyOn(Order, 'aggregate')
            .mockResolvedValueOnce([
                {
                    product_id: null,
                    name: 'Tui bao xoai',
                    quantity: 25,
                    revenue: 500000,
                },
            ])
            .mockResolvedValueOnce([
                {
                    gross_sales: 1000000,
                    product_discount: 100000,
                    voucher_discount: 50000,
                    shipping_fee: 30000,
                    net_revenue: 880000,
                    order_count: 4,
                    average_order_value: 220000,
                },
            ])
            .mockResolvedValueOnce([
                { _id: '2026-06-01', revenue: 880000, orders: 4 },
            ])
            .mockResolvedValueOnce([
                { _id: 'COD', revenue: 880000, orders: 4 },
            ]);

        const result = await AnalyticsService.getDashboardStats({
            date_from: '2026-06-01',
            date_to: '2026-06-30',
        });

        expect(result.customers.total).toBe(12);
        expect(result.products.total).toBe(8);
        expect(result.revenue.net_revenue).toBe(880000);
        expect(result.revenue.order_count).toBe(4);
        expect(result.range.timezone).toBe('Asia/Ho_Chi_Minh');

        Order.aggregate.mock.calls.forEach(([pipeline]) => {
            expect(pipeline[0].$match).toMatchObject({
                is_deleted: false,
                status: { $nin: ['CANCELED', 'FAILED'] },
                'payment.status': 'PAID',
            });
            expect(pipeline[0].$match['payment.paid_at']).toEqual({
                $gte: expect.any(Date),
                $lte: expect.any(Date),
            });
        });
    });
});
