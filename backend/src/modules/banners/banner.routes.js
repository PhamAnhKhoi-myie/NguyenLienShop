const express = require('express');
const router = express.Router();

const BannerController = require('./banner.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/authorize.middleware');
const validate = require('../../middlewares/validate.middleware');
const {
    bannerIdParamSchema,
    createBannerSchema,
    updateBannerSchema
} = require('./banner.validator');

/**
 * ============================================
 * PUBLIC ROUTES (no auth required)
 * ============================================
 */

router.get(
    '/location/:location',
    BannerController.getByLocation
);

/**
 * ============================================
 * ADMIN ROUTES (require authentication + admin role)
 * ============================================
 */

router.get(
    '/deleted',
    authenticate,
    authorize(['ADMIN']),
    BannerController.getDeleted
);

router.get(
    '/',
    authenticate,
    authorize(['ADMIN']),
    BannerController.getAll
);

router.get(
    '/:id',
    validate({ params: bannerIdParamSchema }),
    BannerController.getOne
);

router.post(
    '/',
    authenticate,
    authorize(['ADMIN']),
    validate({ body: createBannerSchema }),
    BannerController.create
);

router.put(
    '/:id',
    authenticate,
    authorize(['ADMIN']),
    validate({
        params: bannerIdParamSchema,
        body: updateBannerSchema
    }),
    BannerController.update
);

router.delete(
    '/:id',
    authenticate,
    authorize(['ADMIN']),
    validate({ params: bannerIdParamSchema }),
    BannerController.delete
);

router.post(
    '/:id/restore',
    authenticate,
    authorize(['ADMIN']),
    validate({ params: bannerIdParamSchema }),
    BannerController.restore
);

module.exports = router;
