const {
    createOrderBodySchema,
    completeRefundBodySchema,
    getOrdersQuerySchema,
} = require('../../modules/orders/order.validator');

const validOrder = {
    cart_id: '507f1f77bcf86cd799439016',
    address_snapshot: {
        receiver_name: 'Nguyen Van A',
        phone: '0901234567',
        province_code: '79',
        ward_code: '26743',
        detail: '123 Nguyen Trai',
    },
    payment_method: 'COD',
};

describe('create order validation', () => {
    it('accepts an order without client-controlled pricing', () => {
        expect(createOrderBodySchema.parse(validOrder)).toEqual(validOrder);
    });

    it.each(['shipping_fee', 'currency'])(
        'rejects client-controlled %s',
        (field) => {
            expect(() =>
                createOrderBodySchema.parse({
                    ...validOrder,
                    [field]: field === 'shipping_fee' ? 0 : 'VND',
                })
            ).toThrow();
        }
    );
});

describe('order refund validation', () => {
    it('accepts refund pending as a payment status filter', () => {
        const result = getOrdersQuerySchema.parse({
            payment_status: 'REFUND_PENDING',
        });

        expect(result.payment_status).toBe('REFUND_PENDING');
    });

    it('accepts manual refund confirmation notes', () => {
        const result = completeRefundBodySchema.parse({
            refund_reference: 'VNPAY-RF-123456',
            refund_note: 'Refunded manually in provider dashboard.',
        });

        expect(result.refund_reference).toBe('VNPAY-RF-123456');
    });
});
