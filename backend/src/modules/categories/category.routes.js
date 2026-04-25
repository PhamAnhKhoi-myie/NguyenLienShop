const express = require('express');
const {
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
} = require('./category.controller');
const { createCategorySchema, updateCategorySchema } = require('./category.validator');
const { authorize } = require('../../middlewares/authorize.middleware');
const validate = require("../../middlewares/validate.middleware")
const { authenticate } = require('../../middlewares/auth.middleware');

const router = express.Router();

// ===== PUBLIC ROUTES =====
router.get('/tree', getCategoryTree);
router.get('/all', getAllCategories);
router.get('/slug/:slug', getCategoryBySlug);
router.get('/:categoryId/breadcrumb', getCategoryBreadcrumb);
router.get('/:categoryId/ancestors', getCategoryAncestors);
router.get('/:categoryId/children', getCategoryChildren);
router.get('/:categoryId/descendants', getCategoryDescendants);
router.get('/:categoryId', getCategoryById);

// ===== ADMIN ROUTES (CREATE/UPDATE/DELETE) =====
router.post(
    '/',
    authenticate,
    authorize(['ADMIN']),
    validate(createCategorySchema),
    createCategory
);

router.patch(
    '/:categoryId',
    authenticate,
    authorize(['ADMIN']),
    validate(updateCategorySchema),
    updateCategory
);

// ===== SOFT DELETE =====
router.delete(
    '/:categoryId',
    authenticate,
    authorize(['ADMIN']),
    deleteCategory
);

// ===== HARD DELETE =====
router.delete(
    '/:categoryId/hard',
    authenticate,
    authorize(['ADMIN']),
    hardDeleteCategory
);

// ===== RESTORE =====
router.patch(
    '/:categoryId/restore',
    authenticate,
    authorize(['ADMIN']),
    restoreCategory
);

module.exports = router;