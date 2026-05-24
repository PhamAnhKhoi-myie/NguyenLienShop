const express = require('express');
const validate = require('../../middlewares/validate.middleware');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/authorize.middleware');
const { ROLES } = require('../../constants/roles');
const BlogController = require('./blog.controller');
const {
    adminBlogQuerySchema,
    categoryParamSchema,
    createBlogBodySchema,
    idParamSchema,
    publicBlogQuerySchema,
    slugParamSchema,
    updateBlogBodySchema,
} = require('./blog.validator');

const router = express.Router();
const contentRoles = [ROLES.ADMIN, ROLES.MANAGER];

router.get(
    '/admin/all',
    authenticate,
    authorize(contentRoles),
    validate({ query: adminBlogQuerySchema }),
    BlogController.getAdminBlogs
);

router.get(
    '/admin/:id',
    authenticate,
    authorize(contentRoles),
    validate({ params: idParamSchema }),
    BlogController.getAdminBlogById
);

router.post(
    '/',
    authenticate,
    authorize(contentRoles),
    validate({ body: createBlogBodySchema }),
    BlogController.createBlog
);

router.patch(
    '/:id/publish',
    authenticate,
    authorize(contentRoles),
    validate({ params: idParamSchema }),
    BlogController.publishBlog
);

router.patch(
    '/:id/archive',
    authenticate,
    authorize(contentRoles),
    validate({ params: idParamSchema }),
    BlogController.archiveBlog
);

router.patch(
    '/:id',
    authenticate,
    authorize(contentRoles),
    validate({
        params: idParamSchema,
        body: updateBlogBodySchema,
    }),
    BlogController.updateBlog
);

router.delete(
    '/:id',
    authenticate,
    authorize(contentRoles),
    validate({ params: idParamSchema }),
    BlogController.archiveBlog
);

router.get(
    '/',
    validate({ query: publicBlogQuerySchema }),
    BlogController.getPublishedBlogs
);

router.get(
    '/categories/:category',
    validate({
        params: categoryParamSchema,
        query: publicBlogQuerySchema,
    }),
    BlogController.getPublishedBlogsByCategory
);

router.get(
    '/:slug',
    validate({ params: slugParamSchema }),
    BlogController.getPublishedBlogBySlug
);

module.exports = router;
