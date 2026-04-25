const asyncHandler = require('../../utils/asyncHandler.util');
const AppError = require('../../utils/appError.util');
const { assertAuthenticated } = require('../../utils/auth.util');
const CategoryService = require('./category.service');
const {
    createCategorySchema,
    updateCategorySchema,
    getCategoryTreeSchema,
} = require('./category.validator');
const { validateObjectId } = require('../../utils/validator.util');

// ===== PUBLIC ENDPOINTS =====

/**
 * GET /api/v1/categories/tree
 * Get category tree (hierarchical structure)
 */
const getCategoryTree = asyncHandler(async (req, res) => {
    const filters = getCategoryTreeSchema.parse(req.query);
    const tree = await CategoryService.getCategoryTree(filters);

    res.status(200).json({
        success: true,
        data: tree,
    });
});

/**
 * GET /api/v1/categories/all
 * Get all categories (flat list)
 */
const getAllCategories = asyncHandler(async (req, res) => {
    const filters = {
        status: req.query.status,
        parent_id: req.query.parent_id,
    };
    const categories = await CategoryService.getAllCategories(filters);

    res.status(200).json({
        success: true,
        data: categories,
    });
});

/**
 * GET /api/v1/categories/slug/:slug
 * Get category by slug
 */
const getCategoryBySlug = asyncHandler(async (req, res) => {
    const category = await CategoryService.getCategoryBySlug(req.params.slug);

    res.status(200).json({
        success: true,
        data: category,
    });
});

/**
 * GET /api/v1/categories/:categoryId
 * Get category by ID
 */
const getCategoryById = asyncHandler(async (req, res) => {
    validateObjectId(req.params.categoryId);
    const category = await CategoryService.getCategoryById(req.params.categoryId);

    res.status(200).json({
        success: true,
        data: category,
    });
});

/**
 * GET /api/v1/categories/:categoryId/breadcrumb
 * Get breadcrumb path to category
 */
const getCategoryBreadcrumb = asyncHandler(async (req, res) => {
    validateObjectId(req.params.categoryId);
    const breadcrumb = await CategoryService.getCategoryBreadcrumb(req.params.categoryId);

    res.status(200).json({
        success: true,
        data: breadcrumb,
    });
});

/**
 * GET /api/v1/categories/:categoryId/ancestors
 * Get all parent categories
 */
const getCategoryAncestors = asyncHandler(async (req, res) => {
    validateObjectId(req.params.categoryId);
    const ancestors = await CategoryService.getCategoryAncestors(req.params.categoryId);

    res.status(200).json({
        success: true,
        data: ancestors,
    });
});

/**
 * GET /api/v1/categories/:categoryId/children
 * Get direct child categories
 */
const getCategoryChildren = asyncHandler(async (req, res) => {
    const categoryId = req.params.categoryId || null;
    if (categoryId) validateObjectId(categoryId);

    const children = await CategoryService.getCategoryChildren(categoryId);

    res.status(200).json({
        success: true,
        data: children,
    });
});

/**
 * GET /api/v1/categories/:categoryId/descendants
 * Get all descendant categories
 */
const getCategoryDescendants = asyncHandler(async (req, res) => {
    validateObjectId(req.params.categoryId);
    const includeInactive = req.query.include_inactive === 'true';

    const descendants = await CategoryService.getCategoryDescendants(
        req.params.categoryId,
        includeInactive
    );

    res.status(200).json({
        success: true,
        data: descendants,
    });
});

// ===== ADMIN ENDPOINTS =====

/**
 * POST /api/v1/categories
 * Create new category (admin only)
 */
const createCategory = asyncHandler(async (req, res) => {
    assertAuthenticated(req.user);

    // req.body already validated by validate middleware
    const category = await CategoryService.createCategory(req.body);

    res.status(201).json({
        success: true,
        data: category,
    });
});

/**
 * PATCH /api/v1/categories/:categoryId
 * Update category (admin only)
 */
const updateCategory = asyncHandler(async (req, res) => {
    assertAuthenticated(req.user);
    validateObjectId(req.params.categoryId);

    // req.body already validated by validate middleware
    const category = await CategoryService.updateCategory(req.params.categoryId, req.body);

    res.status(200).json({
        success: true,
        data: category,
    });
});

/**
 * DELETE /api/v1/categories/:categoryId
 * Soft delete category (admin only)
 */
const deleteCategory = asyncHandler(async (req, res) => {
    assertAuthenticated(req.user);
    validateObjectId(req.params.categoryId);

    const result = await CategoryService.deleteCategory(req.params.categoryId);

    res.status(200).json({
        success: true,
        data: result,
    });
});

/**
 * DELETE /api/v1/categories/:categoryId/hard
 * Hard delete category permanently (admin only)
 */
const hardDeleteCategory = asyncHandler(async (req, res) => {
    assertAuthenticated(req.user);
    validateObjectId(req.params.categoryId);

    const result = await CategoryService.hardDeleteCategory(req.params.categoryId);

    res.status(200).json({
        success: true,
        data: result,
    });
});

/**
 * PATCH /api/v1/categories/:categoryId/restore
 * Restore soft-deleted category (admin only)
 */
const restoreCategory = asyncHandler(async (req, res) => {
    assertAuthenticated(req.user);
    validateObjectId(req.params.categoryId);

    const category = await CategoryService.restoreCategory(req.params.categoryId);

    res.status(200).json({
        success: true,
        data: category,
    });
});

module.exports = {
    getCategoryTree,
    getAllCategories,
    getCategoryBySlug,
    getCategoryById,
    getCategoryBreadcrumb,
    getCategoryAncestors,
    getCategoryChildren,
    getCategoryDescendants,
    createCategory,
    updateCategory,
    deleteCategory,
    hardDeleteCategory,
    restoreCategory,
};