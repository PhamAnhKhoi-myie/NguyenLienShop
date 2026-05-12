const express = require('express');
const router = express.Router();
const validate = require('../../../middlewares/validate.middleware');
const productController = require('../product.controller');
const { z } = require('zod');

const {
    createProductSchema,
    updateProductSchema,
    getProductsSchema,
    searchProductsSchema,
    getProductsByCategoryQuerySchema,
    productIdParamSchema,
    categoryIdParamSchema
} = require('../product.validator');

const { authenticate } = require('../../../middlewares/auth.middleware');
const { authorize } = require('../../../middlewares/authorize.middleware');

// ===== SLUG PARAM SCHEMA =====
const slugParamSchema = z.object({
    slug: z.string().min(1).max(200)
});

// ===== PUBLIC =====

router.get(
    '/',
    validate({ query: getProductsSchema }),
    productController.getAllProducts
);

router.get(
    '/search',
    validate({ query: searchProductsSchema }),
    productController.searchProducts
);

router.get(
    '/category/:categoryId',
    validate({
        params: categoryIdParamSchema,
        query: getProductsByCategoryQuerySchema
    }),
    productController.getProductsByCategory
);

router.get(
    '/slug/:slug',
    validate({ params: slugParamSchema }),
    productController.getProductBySlug
);

router.get(
    '/:productId',
    validate({ params: productIdParamSchema }),
    productController.getProductById
);

// ===== ADMIN =====

router.post(
    '/',
    authenticate,
    authorize(['ADMIN', 'MANAGER']),
    validate({ body: createProductSchema }),
    productController.createProduct
);

router.patch(
    '/:productId',
    authenticate,
    authorize(['ADMIN', 'MANAGER']),
    validate({
        params: productIdParamSchema,
        body: updateProductSchema
    }),
    productController.updateProduct
);

router.delete(
    '/:productId',
    authenticate,
    authorize(['ADMIN', 'MANAGER']),
    validate({ params: productIdParamSchema }),
    productController.deleteProduct
);

module.exports = router;