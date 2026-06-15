const asyncHandler = require('../../utils/asyncHandler.util');
const AppError = require('../../utils/appError.util');
const { assertAuthenticated, assertRole } = require('../../utils/auth.util');
const ProductService = require('./product.service');
const { buildAuditMetadata } = require('../../utils/audit.util');



const getAllProducts = asyncHandler(async (req, res) => {
    const filters = req.query;

    const result = await ProductService.getAllProducts(
        filters.page,
        filters.limit,
        {
            category_id: filters.category_id,
            min_price: filters.min_price,
            max_price: filters.max_price,
            status: filters.status,
            badge: filters.badge,
            search: filters.search,
            bag_type: filters.bag_type,
            sortBy: filters.sortBy,
        }
    );

    res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
    });
});

const searchProducts = asyncHandler(async (req, res) => {
    const { q, limit } = req.query;

    const products = await ProductService.searchProducts(q, limit);

    res.status(200).json({
        success: true,
        data: products,
    });
});

const getProductsByCategory = asyncHandler(async (req, res) => {
    const { categoryId } = req.params;
    const { limit } = req.query;

    const products = await ProductService.getProductsByCategory(
        categoryId,
        limit
    );

    res.status(200).json({
        success: true,
        data: products,
    });
});

const getProductBySlug = asyncHandler(async (req, res) => {
    const includeUnits = req.query.include_units === 'true';

    const product = await ProductService.getProductBySlug(
        req.params.slug,
        { includeUnits }
    );

    res.status(200).json({
        success: true,
        data: product,
    });
});

const getProductById = asyncHandler(async (req, res) => {
    const { productId } = req.params;
    const includeUnits = req.query.include_units === 'true';

    const product = await ProductService.getProductById(productId, {
        includeUnits,
    });

    res.status(200).json({
        success: true,
        data: product,
    });
});



const createProduct = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);

    const product = await ProductService.createProduct(
        req.body,
        user.userId,
        buildAuditMetadata(req)
    );

    res.status(201).json({
        success: true,
        data: product,
    });
});

const updateProduct = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);

    const { productId } = req.params;

    const product = await ProductService.updateProduct(
        productId,
        req.body,
        user.userId,
        buildAuditMetadata(req)
    );

    res.status(200).json({
        success: true,
        data: product,
    });
});

const deleteProduct = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);

    const { productId } = req.params;

    const result = await ProductService.deleteProduct(
        productId,
        user.userId,
        buildAuditMetadata(req)
    );

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
