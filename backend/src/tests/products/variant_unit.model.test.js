const VariantUnit = require('../../modules/products/variant_unit.model');

describe('VariantUnit pricing', () => {
    const tiers = [
        { min_qty: 1, max_qty: 4, unit_price: 45000 },
        { min_qty: 5, max_qty: 9, unit_price: 42300 },
        { min_qty: 10, max_qty: null, unit_price: 39600 },
    ];

    it.each([
        [4, 45000, 180000],
        [5, 42300, 211500],
        [9, 42300, 380700],
        [10, 39600, 396000],
        [1, 45000, 45000],
    ])(
        'uses the correct tier for quantity %i',
        (quantity, unitPrice, totalPrice) => {
            expect(
                VariantUnit.calculatePrice(quantity, tiers, 100)
            ).toMatchObject({
                qty_packs: quantity,
                unit_price: unitPrice,
                total_price: totalPrice,
            });
        }
    );

    it('rejects decimal VND prices', () => {
        expect(() =>
            VariantUnit.validatePriceTiers([
                { min_qty: 1, max_qty: null, unit_price: 45000.5 },
            ])
        ).toThrow('unit_price must be an integer');
    });

    it('applies a fixed promotion after selecting the quantity tier', () => {
        expect(
            VariantUnit.calculatePrice(5, tiers, 100, {
                enabled: true,
                type: 'FIXED',
                value: 5000,
                allow_voucher: true,
            })
        ).toMatchObject({
            original_unit_price: 42300,
            unit_price: 37300,
            promotion_discount_amount: 5000,
            promotion_discount_percent: 12,
            original_total_price: 211500,
            total_price: 186500,
            is_on_sale: true,
            voucher_allowed: true,
        });
    });

    it('applies an active percent promotion and rounds to integer VND', () => {
        expect(
            VariantUnit.calculatePrice(1, tiers, 100, {
                enabled: true,
                type: 'PERCENT',
                value: 15,
            })
        ).toMatchObject({
            original_unit_price: 45000,
            unit_price: 38250,
            total_price: 38250,
            promotion_discount_percent: 15,
        });
    });

    it('does not apply a scheduled promotion before it starts', () => {
        expect(
            VariantUnit.calculatePrice(
                1,
                tiers,
                100,
                {
                    enabled: true,
                    type: 'FIXED',
                    value: 5000,
                    starts_at: new Date('2030-01-01T00:00:00.000Z'),
                },
                new Date('2029-12-31T00:00:00.000Z')
            )
        ).toMatchObject({
            original_unit_price: 45000,
            unit_price: 45000,
            is_on_sale: false,
        });
    });
});

describe('VariantUnit order quantity validation', () => {
    const baseUnit = {
        variant_id: '507f1f77bcf86cd799439011',
        unit_type: 'PACK',
        display_name: 'Goi 100 cai',
        pack_size: 100,
        price_tiers: [{ min_qty: 1, max_qty: null, unit_price: 45000 }],
        min_order_qty: 2,
        qty_step: 1,
        is_default: true,
        currency: 'VND',
    };

    it('rejects max_order_qty smaller than min_order_qty on documents', async () => {
        const unit = new VariantUnit({
            ...baseUnit,
            max_order_qty: 1,
        });

        await expect(unit.validate()).rejects.toThrow(
            'max_order_qty must be >= min_order_qty'
        );
    });

    it('uses $set.min_order_qty when validating update queries', () => {
        const validator = VariantUnit.schema.path('max_order_qty').validators
            .find((item) => item.message === 'max_order_qty must be >= min_order_qty')
            .validator;

        const updateQueryContext = {
            getUpdate: () => ({
                $set: {
                    min_order_qty: 1,
                    max_order_qty: 1,
                },
            }),
        };

        expect(validator.call(updateQueryContext, 1)).toBe(true);
    });
});
