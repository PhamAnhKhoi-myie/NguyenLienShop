const {
    DEFAULT_CURRENCY,
    getDefaultShippingFee,
} = require('../../config/commerce');

describe('commerce config', () => {
    const originalShippingFee = process.env.DEFAULT_SHIPPING_FEE;

    afterEach(() => {
        if (originalShippingFee === undefined) {
            delete process.env.DEFAULT_SHIPPING_FEE;
        } else {
            process.env.DEFAULT_SHIPPING_FEE = originalShippingFee;
        }
    });

    it('defaults to free shipping in VND', () => {
        delete process.env.DEFAULT_SHIPPING_FEE;

        expect(DEFAULT_CURRENCY).toBe('VND');
        expect(getDefaultShippingFee()).toBe(0);
    });

    it('accepts a configured integer shipping fee', () => {
        process.env.DEFAULT_SHIPPING_FEE = '30000';

        expect(getDefaultShippingFee()).toBe(30000);
    });

    it.each(['-1', '1000.5', 'invalid'])(
        'rejects invalid shipping fee %s',
        (value) => {
            process.env.DEFAULT_SHIPPING_FEE = value;

            expect(() => getDefaultShippingFee()).toThrow(
                'DEFAULT_SHIPPING_FEE must be a non-negative integer'
            );
        }
    );
});
