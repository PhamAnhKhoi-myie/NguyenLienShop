const mongoose = require('mongoose');
const Cart = require('../../modules/carts/cart.model');
const CartMapper = require('../../modules/carts/cart.mapper');
const CartService = require('../../modules/carts/cart.service');
const Product = require('../../modules/products/product.model');
const Variant = require('../../modules/products/variant.model');
const VariantUnit = require('../../modules/products/variant_unit.model');

const createFixture = () => {
    const productId = new mongoose.Types.ObjectId();
    const variantId = new mongoose.Types.ObjectId();
    const unitId = new mongoose.Types.ObjectId();
    const cartId = new mongoose.Types.ObjectId();
    const itemId = new mongoose.Types.ObjectId();
    const categoryId = new mongoose.Types.ObjectId();
    const tiers = [
        { min_qty: 1, max_qty: 4, unit_price: 45000 },
        { min_qty: 5, max_qty: 9, unit_price: 42300 },
        { min_qty: 10, max_qty: null, unit_price: 39600 },
    ];

    const product = {
        _id: productId,
        name: 'Túi bao trái cây',
        category_id: categoryId,
        images: [],
        status: 'ACTIVE',
    };
    const variant = {
        _id: variantId,
        product_id: productId,
        sku: 'TEST-SKU',
        size: '20x25',
        fabric_type: 'Vải không dệt',
        status: 'ACTIVE',
        stock: { available: 100000 },
    };
    const unit = {
        _id: unitId,
        variant_id: variantId,
        display_name: 'Gói 100 túi',
        pack_size: 100,
        min_order_qty: 1,
        max_order_qty: null,
        qty_step: 1,
        price_tiers: tiers,
        promotion: {
            enabled: true,
            type: 'FIXED',
            value: 5000,
            allow_voucher: false,
        },
    };
    const item = {
        _id: itemId,
        product_id: productId,
        variant_id: variantId,
        unit_id: unitId,
        category_id: categoryId,
        sku: variant.sku,
        product_name: product.name,
        variant_label: `${variant.size} - ${variant.fabric_type}`,
        display_name: unit.display_name,
        pack_size: unit.pack_size,
        price_at_added: 45000,
        quantity: 4,
    };
    const items = [item];
    items.id = (id) =>
        items.find((candidate) => candidate._id.toString() === id.toString());

    const cart = {
        _id: cartId,
        items,
        discount: null,
        toObject: () => ({ items: items.map((entry) => ({ ...entry })) }),
    };

    return {
        productId,
        variantId,
        unitId,
        cartId,
        itemId,
        product,
        variant,
        unit,
        item,
        cart,
    };
};

describe('CartService tier repricing', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('reprices the full quantity when adding to an existing item', async () => {
        const fixture = createFixture();
        let savedItemData;

        jest.spyOn(Product, 'findById').mockResolvedValue(fixture.product);
        jest.spyOn(Variant, 'findById').mockResolvedValue(fixture.variant);
        jest.spyOn(VariantUnit, 'findById').mockResolvedValue(fixture.unit);
        jest.spyOn(Cart, 'getOrCreateUserCart').mockResolvedValue(fixture.cart);
        jest.spyOn(Cart, 'addItemAtomic').mockImplementation(
            async (_cartId, itemData) => {
                savedItemData = itemData;
                const updatedItem = {
                    ...fixture.item,
                    quantity: 5,
                    price_at_added: itemData.price_at_added,
                };
                return {
                    ...fixture.cart,
                    items: [updatedItem],
                };
            }
        );
        jest.spyOn(CartMapper, 'toResponseDTO').mockReturnValue({ ok: true });
        jest.spyOn(CartService, '_createCartAuditLog').mockResolvedValue();

        await CartService.addItemToCart(
            fixture.cartId.toString(),
            'user',
            {
                product_id: fixture.productId.toString(),
                variant_id: fixture.variantId.toString(),
                unit_id: fixture.unitId.toString(),
                quantity: 1,
            }
        );

        expect(savedItemData).toMatchObject({
            quantity: 1,
            expected_quantity: 4,
            original_price_at_added: 42300,
            price_at_added: 37300,
            promotion_discount_amount: 5000,
            is_on_sale: true,
            voucher_allowed: false,
        });
    });

    it('updates quantity and tier price together', async () => {
        const fixture = createFixture();
        const updatedItems = [
            {
                ...fixture.item,
                quantity: 5,
                original_price_at_added: 42300,
                price_at_added: 37300,
            },
        ];
        updatedItems.id = (id) =>
            updatedItems.find(
                (candidate) => candidate._id.toString() === id.toString()
            );
        const updatedCart = {
            ...fixture.cart,
            items: updatedItems,
        };

        jest.spyOn(Cart, 'findById').mockResolvedValue(fixture.cart);
        jest.spyOn(Product, 'findById').mockResolvedValue(fixture.product);
        jest.spyOn(Variant, 'findById').mockResolvedValue(fixture.variant);
        jest.spyOn(VariantUnit, 'findById').mockResolvedValue(fixture.unit);
        const updateSpy = jest
            .spyOn(Cart, 'updateItemQuantityAtomic')
            .mockResolvedValue(updatedCart);
        jest.spyOn(CartMapper, 'toResponseDTO').mockReturnValue({ ok: true });
        jest.spyOn(CartService, '_createCartAuditLog').mockResolvedValue();

        await CartService.updateItemQuantity(
            fixture.cartId,
            fixture.itemId,
            5,
            fixture.productId
        );

        expect(updateSpy).toHaveBeenCalledWith(
            fixture.cartId,
            fixture.itemId,
            5,
            37300,
            4,
            expect.objectContaining({
                original_unit_price: 42300,
                unit_price: 37300,
                promotion_discount_amount: 5000,
                is_on_sale: true,
                voucher_allowed: false,
            })
        );
    });

    it('reports automatic promotion savings separately from vouchers', () => {
        const fixture = createFixture();
        const totals = CartMapper.calculateCartTotals(
            [
                {
                    ...fixture.item,
                    original_price_at_added: 45000,
                    price_at_added: 40000,
                    quantity: 2,
                },
            ],
            { discount_amount: 10000 }
        );

        expect(totals).toEqual({
            original_subtotal: 90000,
            promotion_discount_amount: 10000,
            subtotal: 80000,
            discount_amount: 10000,
            total: 70000,
        });
    });
});
