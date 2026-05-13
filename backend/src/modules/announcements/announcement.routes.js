const express = require('express');
const router = express.Router();
const AnnouncementController = require('./announcement.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/authorize.middleware');
const validate = require('../../middlewares/validate.middleware');
const {
    createAnnouncementSchema,
    updateAnnouncementSchema
} = require('./announcement.validator');

/**
 * ============================================
 * PUBLIC ROUTES (no auth required)
 * ============================================
 */
router.get('/', AnnouncementController.getActive);

router.get('/:id', AnnouncementController.getOne);

/**
 * ============================================
 * ADMIN ROUTES (require authentication + admin role)
 * ============================================
 */

router.get(
    '/admin/all',
    authenticate,
    authorize(['ADMIN']),
    AnnouncementController.getAll
);

router.get(
    '/admin/scheduled',
    authenticate,
    authorize(['ADMIN']),
    AnnouncementController.getScheduled
);

router.get(
    '/admin/expired',
    authenticate,
    authorize(['ADMIN']),
    AnnouncementController.getExpired
);

router.get(
    '/admin/deleted',
    authenticate,
    authorize(['ADMIN']),
    AnnouncementController.getDeleted
);

router.post(
    '/',
    authenticate,
    authorize(['ADMIN']),
    validate(createAnnouncementSchema),
    AnnouncementController.create
);

router.put(
    '/:id',
    authenticate,
    authorize(['ADMIN']),
    validate(updateAnnouncementSchema),
    AnnouncementController.update
);

router.delete(
    '/:id',
    authenticate,
    authorize(['ADMIN']),
    AnnouncementController.delete
);

router.post(
    '/:id/restore',
    authenticate,
    authorize(['ADMIN']),
    AnnouncementController.restore
);

module.exports = router;