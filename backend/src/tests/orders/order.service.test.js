const mongoose = require('mongoose');
const Order = require('../../modules/orders/order.model');
const OrderService = require('../../modules/orders/order.service');
const ReviewService = require('../../modules/reviews/review.service');

function buildOrder(overrides = {}) {
    const orderId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();
    const itemId = new mongoose.Types.ObjectId();
    const productId = new mongoose.Types.ObjectId();
    const variantId = new mongoose.Types.ObjectId();

    const items = [
        {
            _id: itemId,
            product_id: productId,
            variant_id: variantId,
            product_name: 'Test product',
            variant_label: 'Default',
            sku: 'SKU-1',
            unit_label: 'Pack',
            pack_size: 1,
            quantity_ordered: 1,
            quantity_fulfilled: 1,
            unit_price: 1000,
            line_total: 1000,
            review_status: 'pending',
        },
    ];

    items.id = (id) =>
        items.find((item) => item._id.toString() === id.toString());

    return {
        _id: orderId,
        user_id: userId,
        order_code: 'ORD-20260101-ABCDE',
        items,
        pricing: {
            subtotal: 1000,
            shipping_fee: 0,
            discount_amount: 0,
            total_amount: 1000,
        },
        payment: {
            method: 'COD',
            status: 'PAID',
        },
        shipment: {
            delivered_at: new Date('2026-01-02T00:00:00.000Z'),
        },
        status: 'DELIVERED',
        status_history: [],
        save: jest.fn().mockResolvedValue(),
        ...overrides,
    };
}

describe('OrderService customer receipt confirmation', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('blocks reviews until the customer confirms receipt', async () => {
        const order = buildOrder();

        jest.spyOn(Order, 'findOne').mockResolvedValue(order);
        jest.spyOn(ReviewService, 'createReview').mockResolvedValue({});

        await expect(
            OrderService.writeReview(
                order._id.toString(),
                order.items[0]._id.toString(),
                5,
                'Great',
                'This product works well.',
                order.user_id.toString()
            )
        ).rejects.toMatchObject({
            code: 'ORDER_RECEIPT_NOT_CONFIRMED',
            statusCode: 409,
        });

        expect(ReviewService.createReview).not.toHaveBeenCalled();
    });

    it('blocks reviews after the three-day review window expires', async () => {
        const order = buildOrder({
            customer_receipt: {
                confirmed_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
                confirmed_by: 'user',
            },
        });

        jest.spyOn(Order, 'findOne').mockResolvedValue(order);
        jest.spyOn(ReviewService, 'createReview').mockResolvedValue({});

        await expect(
            OrderService.writeReview(
                order._id.toString(),
                order.items[0]._id.toString(),
                5,
                'Great',
                'This product works well.',
                order.user_id.toString()
            )
        ).rejects.toMatchObject({
            code: 'ORDER_REVIEW_EXPIRED',
            statusCode: 409,
        });

        expect(ReviewService.createReview).not.toHaveBeenCalled();
    });

    it('records customer receipt confirmation for delivered orders', async () => {
        const order = buildOrder();

        jest.spyOn(Order, 'findOne').mockResolvedValue(order);
        jest.spyOn(OrderService, '_createOrderAuditLog').mockResolvedValue();

        const result = await OrderService.confirmCustomerReceived(
            order._id.toString(),
            order.user_id.toString(),
            { ip: '127.0.0.1', userAgent: 'jest' }
        );

        expect(order.customer_receipt.confirmed_at).toBeInstanceOf(Date);
        expect(order.customer_receipt.confirmed_by).toBe(order.user_id.toString());
        expect(order.save).toHaveBeenCalledTimes(1);
        expect(OrderService._createOrderAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                action: 'CONFIRM_ORDER_RECEIPT',
                actorId: order.user_id.toString(),
            })
        );
        expect(result.customer_receipt.confirmed).toBe(true);
    });

    it('rejects customer receipt confirmation before delivery', async () => {
        const order = buildOrder({ status: 'SHIPPED' });

        jest.spyOn(Order, 'findOne').mockResolvedValue(order);

        await expect(
            OrderService.confirmCustomerReceived(
                order._id.toString(),
                order.user_id.toString()
            )
        ).rejects.toMatchObject({
            code: 'ORDER_NOT_DELIVERED',
            statusCode: 409,
        });

        expect(order.save).not.toHaveBeenCalled();
    });
});
