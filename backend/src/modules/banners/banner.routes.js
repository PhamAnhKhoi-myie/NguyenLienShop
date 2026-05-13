const express = require('express');
const router = express.Router();

const BannerController = require('./banner.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/authorize.middleware');
const validate = require('../../middlewares/validate.middleware');
const {
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

router.get(
    '/:id',
    BannerController.getOne
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

router.post(
    '/',
    authenticate,
    authorize(['ADMIN']),
    validate(createBannerSchema),
    BannerController.create
);

router.put(
    '/:id',
    authenticate,
    authorize(['ADMIN']),
    validate(updateBannerSchema),
    BannerController.update
);

router.delete(
    '/:id',
    authenticate,
    authorize(['ADMIN']),
    BannerController.delete
);

router.post(
    '/:id/restore',
    authenticate,
    authorize(['ADMIN']),
    BannerController.restore
);

module.exports = router;