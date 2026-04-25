const asyncHandler = require('../../utils/asyncHandler.util');
const AppError = require('../../utils/appError.util');
const { assertAuthenticated, assertRole } = require('../../utils/auth.util');
const { validateObjectId } = require('../../utils/validator.util');
const ProductService = require('./product.service');
const ProductMapper = require('./product.mapper');
const {
    createProductSchema,
    updateProductSchema,
    getProductsSchema,
    searchProductsSchema,
    getProductsByCategorySchema,
} = require('./product.validator');

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
 * - sortBy (popular|rating|price_asc|price_desc|newest, default newest)
 */
const getAllProducts = asyncHandler(async (req, res) => {
    const filters = getProductsSchema.parse(req.query);

    const result = await ProductService.getAllProducts(
        filters.page,
        filters.limit,
        {
            category_id: filters.category_id,
            min_price: filters.min_price,
            max_price: filters.max_price,
            status: filters.status,
            search: filters.search,
            sortBy: filters.sortBy,
        }
    );

    res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
    });
});

/**
 * GET /api/v1/products/search
 * Search products by text query
 * 
 * Query params:
 * - q (required, min 2 chars)
 * - limit (optional, default 20, max 50)
 */
const searchProducts = asyncHandler(async (req, res) => {
    const filters = searchProductsSchema.parse(req.query);

    const products = await ProductService.searchProducts(
        filters.q,
        filters.limit
    );

    res.status(200).json({
        success: true,
        data: products,
    });
});

/**
 * GET /api/v1/products/category/:categoryId
 * Get products by category
 * 
 * Path params:
 * - categoryId (MongoDB ObjectId)
 * 
 * Query params:
 * - limit (optional, default 50, max 100)
 */
const getProductsByCategory = asyncHandler(async (req, res) => {
    const { categoryId } = getProductsByCategorySchema.parse({
        categoryId: req.params.categoryId,
        limit: req.query.limit,
    });

    const products = await ProductService.getProductsByCategory(
        categoryId,
        parseInt(req.query.limit || 50, 10)
    );

    res.status(200).json({
        success: true,
        data: products,
    });
});

/**
 * GET /api/v1/products/slug/:slug
 * Get product by slug (with variants + units)
 * 
 * Path params:
 * - slug (product slug)
 */
const getProductBySlug = asyncHandler(async (req, res) => {
    const product = await ProductService.getProductBySlug(req.params.slug);

    res.status(200).json({
        success: true,
        data: product,
    });
});

/**
 * GET /api/v1/products/:productId
 * Get product by ID (with variants + units)
 * 
 * Path params:
 * - productId (MongoDB ObjectId)
 */
const getProductById = asyncHandler(async (req, res) => {
    validateObjectId(req.params.productId);

    const product = await ProductService.getProductById(
        req.params.productId
    );

    res.status(200).json({
        success: true,
        data: product,
    });
});

// ===== ADMIN ENDPOINTS =====

/**
 * POST /api/v1/products
 * Create new product (manager+ only)
 * 
 * ✅ Authorization: MANAGER or ADMIN
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
const createProduct = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    assertRole(user, ['MANAGER', 'ADMIN']);

    // req.body already validated by validate middleware
    const product = await ProductService.createProduct(req.body);

    res.status(201).json({
        success: true,
        data: product,
    });
});

/**
 * PATCH /api/v1/products/:productId
 * Update product (manager+ only)
 * 
 * ✅ Authorization: MANAGER or ADMIN
 * 
 * Body: Same as create, all optional
 */
const updateProduct = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    assertRole(user, ['MANAGER', 'ADMIN']);
    validateObjectId(req.params.productId);

    // req.body already validated by validate middleware
    const product = await ProductService.updateProduct(
        req.params.productId,
        req.body
    );

    res.status(200).json({
        success: true,
        data: product,
    });
});

/**
 * DELETE /api/v1/products/:productId
 * Soft delete product (manager+ only)
 * 
 * ✅ Authorization: MANAGER or ADMIN
 * ✅ Cascades: Deletes all variants
 * 
 * Path params:
 * - productId (MongoDB ObjectId)
 */
const deleteProduct = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    assertRole(user, ['MANAGER', 'ADMIN']);
    validateObjectId(req.params.productId);

    const result = await ProductService.deleteProduct(req.params.productId);

    res.status(200).json({
        success: true,
        data: result,
    });
});

module.exports = {
    getAllProducts,
    searchProducts,
    getProductsByCategory,
    getProductBySlug,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
};