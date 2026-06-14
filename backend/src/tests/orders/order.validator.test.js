const {
    createOrderBodySchema,
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
