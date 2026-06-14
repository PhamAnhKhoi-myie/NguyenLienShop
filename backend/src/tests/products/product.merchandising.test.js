const ProductService = require('../../modules/products/product.service');

describe('Product merchandising labels', () => {
    it('normalizes string pagination values before calculating slices', () => {
        expect(ProductService._normalizePagination('2', '9')).toEqual({
            page: 2,
            limit: 9,
        });
        expect(ProductService._normalizePagination('invalid', '999')).toEqual({
            page: 1,
            limit: 100,
        });
    });

    it('derives stock and sale labels from active variants and units', () => {
        const variant = ProductService._decorateVariant({
            status: 'ACTIVE',
            stock: { available: 1000 },
            units: [
                {
                    pack_size: 100,
                    min_order_qty: 1,
                    price_tiers: [
                        {
                            min_qty: 1,
                            max_qty: null,
                            unit_price: 50000,
                        },
                    ],
                    promotion: {
                        enabled: true,
                        type: 'FIXED',
                        value: 5000,
                    },
                },
            ],
        });

        const product = ProductService._decorateProduct(
            {
                new_until: new Date(Date.now() + 60000),
                is_best_seller: true,
            },
            [variant]
        );

        expect(product).toMatchObject({
            min_price: 45000,
            max_price: 45000,
            original_min_price: 50000,
            original_max_price: 50000,
            in_stock: true,
            is_on_sale: true,
            is_new: true,
            is_best_seller: true,
        });
    });

    it('requires enough stock for the minimum sellable quantity', () => {
        const variant = ProductService._decorateVariant({
            status: 'ACTIVE',
            stock: { available: 99 },
            units: [
                {
                    pack_size: 100,
                    min_order_qty: 1,
                    price_tiers: [
                        {
                            min_qty: 1,
                            max_qty: null,
                            unit_price: 50000,
                        },
                    ],
                },
            ],
        });

        expect(variant.in_stock).toBe(false);
    });
});
