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

const validate = require("../../middlewares/validate.middleware");

const { authorize } = require('../../middlewares/authorize.middleware');
const { authenticate } = require('../../middlewares/auth.middleware');

const {
    createCategoryBodySchema,
    updateCategoryBodySchema,
    categoryIdParamSchema,
    slugParamSchema,
    getCategoryTreeQuerySchema,
    getCategoryDescendantsQuerySchema,
    getAllCategoriesQuerySchema
} = require('./category.validator');

const router = express.Router();

// ===== PUBLIC ROUTES (specific -> generic) =====
router.get(
    '/tree',
    validate({ query: getCategoryTreeQuerySchema }),
    getCategoryTree
);

router.get(
    '/all',
    validate({ query: getAllCategoriesQuerySchema }),
    getAllCategories
);

router.get(
    '/slug/:slug',
    validate({ params: slugParamSchema }),
    getCategoryBySlug
);

router.get(
    '/:categoryId/breadcrumb',
    validate({ params: categoryIdParamSchema }),
    getCategoryBreadcrumb
);

router.get(
    '/:categoryId/ancestors',
    validate({ params: categoryIdParamSchema }),
    getCategoryAncestors
);

router.get(
    '/:categoryId/children',
    validate({ params: categoryIdParamSchema }),
    getCategoryChildren
);

router.get(
    '/:categoryId/descendants',
    validate({ params: categoryIdParamSchema, query: getCategoryDescendantsQuerySchema }),
    getCategoryDescendants
);

router.get(
    '/:categoryId',
    validate({ params: categoryIdParamSchema }),
    getCategoryById
);

// ===== ADMIN ROUTES =====
router.post(
    '/',
    authenticate,
    authorize(['ADMIN', 'MANAGER']),
    validate({ body: createCategoryBodySchema }),
    createCategory
);

router.patch(
    '/:categoryId',
    authenticate,
    authorize(['ADMIN', 'MANAGER']),
    validate({ params: categoryIdParamSchema, body: updateCategoryBodySchema }),
    updateCategory
);

// ===== SOFT DELETE =====
router.delete(
    '/:categoryId',
    authenticate,
    authorize(['ADMIN', 'MANAGER']),
    validate({ params: categoryIdParamSchema }),
    deleteCategory
);

// ===== HARD DELETE =====
router.delete(
    '/:categoryId/hard',
    authenticate,
    authorize(['ADMIN']),
    validate({ params: categoryIdParamSchema }),
    hardDeleteCategory
);

// ===== RESTORE =====
router.patch(
    '/:categoryId/restore',
    authenticate,
    authorize(['ADMIN']),
    validate({ params: categoryIdParamSchema }),
    restoreCategory
);

module.exports = router;