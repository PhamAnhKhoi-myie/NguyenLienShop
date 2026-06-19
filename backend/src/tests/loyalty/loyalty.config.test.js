const {
    calculatePointsForOrder,
    calculateRewardableAmount,
    calculateShippingDiscount,
    getTierForPoints,
    getPreviousTier,
} = require('../../modules/loyalty/loyalty.config');

describe('loyalty config', () => {
    it('calculates points from subtotal after voucher discount and excludes shipping', () => {
        const order = {
            pricing: {
                subtotal: 56500,
                discount_amount: 500,
                shipping_fee: 30000,
                total_amount: 86000,
            },
        };

        expect(calculateRewardableAmount(order)).toBe(56000);
        expect(calculatePointsForOrder(order)).toBe(56);
    });

    it('maps lifetime points to the configured tier thresholds', () => {
        expect(getTierForPoints(0)).toBe('bronze');
        expect(getTierForPoints(2000)).toBe('silver');
        expect(getTierForPoints(5000)).toBe('gold');
        expect(getTierForPoints(10000)).toBe('platinum');
        expect(getTierForPoints(20000)).toBe('diamond');
    });

    it('downgrades only one tier step for inactivity', () => {
        expect(getPreviousTier('diamond')).toBe('platinum');
        expect(getPreviousTier('gold')).toBe('silver');
        expect(getPreviousTier('bronze')).toBe('bronze');
    });

    it('applies tier shipping benefits to the base shipping fee', () => {
        expect(calculateShippingDiscount(30000, 'silver')).toEqual({
            base_shipping_fee: 30000,
            shipping_discount_percent: 10,
            shipping_discount_amount: 3000,
            shipping_fee: 27000,
        });
        expect(calculateShippingDiscount(30000, 'diamond').shipping_fee).toBe(0);
    });
});
