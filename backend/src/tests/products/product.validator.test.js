const {
    createProductSchema,
    updateProductSchema,
} = require('../../modules/products/product.validator');

function buildImages(count) {
    return Array.from({ length: count }, (_, index) => ({
        url: `https://example.com/product-${index + 1}.jpg`,
        alt: `Product image ${index + 1}`,
        is_primary: index === 0,
        sort_order: index,
    }));
}

describe('product image validation', () => {
    test('accepts up to 6 images when creating a product', () => {
        const result = createProductSchema.safeParse({
            name: 'Product name',
            category_id: '507f1f77bcf86cd799439011',
            images: buildImages(6),
        });

        expect(result.success).toBe(true);
    });

    test('rejects more than 6 images when creating or updating a product', () => {
        const images = buildImages(7);
        const createResult = createProductSchema.safeParse({
            name: 'Product name',
            category_id: '507f1f77bcf86cd799439011',
            images,
        });
        const updateResult = updateProductSchema.safeParse({ images });

        expect(createResult.success).toBe(false);
        expect(updateResult.success).toBe(false);
    });
});
