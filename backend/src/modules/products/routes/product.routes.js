const express = require('express');
const router = express.Router();
const validate = require('../../../middlewares/validate.middleware');
const productController = require('../product.controller');
const {
    createProductSchema,
    updateProductSchema,
    getProductsSchema,
    searchProductsSchema,
    getProductsByCategorySchema,
} = require('../product.validator');
const { authenticate } = require('../../../middlewares/auth.middleware');
const { authorize } = require('../../../middlewares/authorize.middleware');
const { validateObjectId } = require('../../../utils/validator.util');

const validateProductId = (req, res, next) => {
    validateObjectId(req.params.productId);
    next();
};

const validateCategoryId = (req, res, next) => {
    validateObjectId(req.params.categoryId);
    next();
};
// ============================================================================
// ===== PRODUCT ROUTES =====
// ============================================================================

// ===== PUBLIC ENDPOINTS =====

/**
 * GET /api/v1/products
 * Get all products with pagination + filtering
 * 
 * Query params:
 * - page (default 1)
 * - limit (default 20, max 100)
 * - category_id (optional)
 * - min_price (optional)
 * - max_price (optional)
 * - status (optional)
 * - search (optional, text search)
 * - sortBy (optional)
 */
router.get(
    '/',
    validate({ query: getProductsSchema }),
    productController.getAllProducts
);

/**
 * GET /api/v1/products/search
 * Search products by text query
 * 
 * Query params:
 * - q (required)
 * - limit (optional)
 * 
 * ⚠️ IMPORTANT: This route MUST come before /:productId
 */
router.get(
    '/search',
    validate({ query: searchProductsSchema }),
    productController.searchProducts
);

/**
 * GET /api/v1/products/category/:categoryId
 * Get products by category
 * 
 * ⚠️ IMPORTANT: This route MUST come before /:productId
 */
router.get(
    '/category/:categoryId',
    validateCategoryId,
    validate({ query: getProductsByCategorySchema }),
    productController.getProductsByCategory
);

/**
 * GET /api/v1/products/slug/:slug
 * Get product by slug
 * 
 * ⚠️ IMPORTANT: This route MUST come before /:productId
 */
router.get(
    '/slug/:slug',
    productController.getProductBySlug
);

/**
 * GET /api/v1/products/:productId
 * Get product by ID (with variants + units)
 */
router.get(
    '/:productId',
    validateProductId,
    productController.getProductById
);

// ===== ADMIN ENDPOINTS =====

/**
 * POST /api/v1/products
 * Create new product (manager+ only)
 * 
 * Body:
 * - name (required, 2-200 chars)
 * - category_id (required)
 * - slug (optional, auto-generated if not provided)
 * - brand (optional)
 * - short_description (optional)
 * - description (optional)
 * - images (optional array)
 * - search_keywords (optional array, max 10)
 * - status (optional, default ACTIVE)
 */
router.post(
    '/',
    authenticate,
    authorize(['ADMIN', 'MANAGER']),
    validate({ body: createProductSchema }),
    productController.createProduct
);

/**
 * PATCH /api/v1/products/:productId
 * Update product (manager+ only)
 * 
 * Body: Same as create, all optional
 */
router.patch(
    '/:productId',
    authenticate,
    authorize(['ADMIN', 'MANAGER']),
    validateProductId,
    validate({ body: updateProductSchema }),
    productController.updateProduct
);

/**
 * DELETE /api/v1/products/:productId
 * Soft delete product (manager+ only)
 */
router.delete(
    '/:productId',
    authenticate,
    authorize(['ADMIN', 'MANAGER']),
    validateProductId,
    productController.deleteProduct
);

module.exports = router;