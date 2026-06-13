const asyncHandler = require('../../utils/asyncHandler.util');
const { assertAuthenticated } = require('../../utils/auth.util');
const CategoryService = require('./category.service');
const { buildAuditMetadata } = require('../../utils/audit.util');



const getCategoryTree = asyncHandler(async (req, res) => {
    const { include_inactive = false } = req.query;

    const filters = {
        include_inactive,
    };

    const tree = await CategoryService.getCategoryTree(filters);

    res.status(200).json({
        success: true,
        data: tree,
    });
});

const getAllCategories = asyncHandler(async (req, res) => {
    const { status, parent_id } = req.query;

    const filters = {
        status,
        parent_id,
    };

    const categories = await CategoryService.getAllCategories(filters);

    res.status(200).json({
        success: true,
        data: categories,
    });
});

const getCategoryBySlug = asyncHandler(async (req, res) => {
    const { slug } = req.params;

    const category = await CategoryService.getCategoryBySlug(slug);

    res.status(200).json({
        success: true,
        data: category,
    });
});

const getCategoryById = asyncHandler(async (req, res) => {
    const { categoryId } = req.params;

    const category = await CategoryService.getCategoryById(categoryId);

    res.status(200).json({
        success: true,
        data: category,
    });
});

const getCategoryBreadcrumb = asyncHandler(async (req, res) => {
    const { categoryId } = req.params;

    const breadcrumb = await CategoryService.getCategoryBreadcrumb(categoryId);

    res.status(200).json({
        success: true,
        data: breadcrumb,
    });
});

const getCategoryAncestors = asyncHandler(async (req, res) => {
    const { categoryId } = req.params;

    const ancestors = await CategoryService.getCategoryAncestors(categoryId);

    res.status(200).json({
        success: true,
        data: ancestors,
    });
});

const getCategoryChildren = asyncHandler(async (req, res) => {
    const { categoryId } = req.params;

    const children = await CategoryService.getCategoryChildren(categoryId || null);

    res.status(200).json({
        success: true,
        data: children,
    });
});

const getCategoryDescendants = asyncHandler(async (req, res) => {
    const { categoryId } = req.params;
    const { include_inactive = false } = req.query;

    const descendants = await CategoryService.getCategoryDescendants(
        categoryId,
        include_inactive
    );

    res.status(200).json({
        success: true,
        data: descendants,
    });
});



const createCategory = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);

    const metadata = {
        ...buildAuditMetadata(req),
        actorId: user.id,
    };

    const category = await CategoryService.createCategory(
        req.body,
        metadata
    );

    res.status(201).json({
        success: true,
        data: category,
    });
});

const updateCategory = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    const { categoryId } = req.params;

    const metadata = {
        ...buildAuditMetadata(req),
        actorId: user.id,
    };

    const category = await CategoryService.updateCategory(
        categoryId,
        req.body,
        metadata
    );

    res.status(200).json({
        success: true,
        data: category,
    });
});

const deleteCategory = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    const { categoryId } = req.params;

    const metadata = {
        ...buildAuditMetadata(req),
        actorId: user.id,
    };

    const result = await CategoryService.deleteCategory(
        categoryId,
        metadata
    );

    res.status(200).json({
        success: true,
        data: result,
    });
});

const hardDeleteCategory = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    const { categoryId } = req.params;

    const metadata = {
        ...buildAuditMetadata(req),
        actorId: user.id,
    };

    const result = await CategoryService.hardDeleteCategory(
        categoryId,
        metadata
    );

    res.status(200).json({
        success: true,
        data: result,
    });
});

const restoreCategory = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    const { categoryId } = req.params;

    const metadata = {
        ...buildAuditMetadata(req),
        actorId: user.id,
    };

    const category = await CategoryService.restoreCategory(
        categoryId,
        metadata
    );

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