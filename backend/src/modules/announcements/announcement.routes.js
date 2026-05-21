const express = require('express');
const router = express.Router();
const AnnouncementController = require('./announcement.controller');
const {
    authenticate,
    optionalAuthenticate
} = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/authorize.middleware');
const validate = require('../../middlewares/validate.middleware');
const {
    announcementIdParamSchema,
    createAnnouncementSchema,
    updateAnnouncementSchema
} = require('./announcement.validator');

/**
 * ============================================
 * PUBLIC ROUTES (no auth required)
 * ============================================
 */
router.get('/', optionalAuthenticate, AnnouncementController.getActive);

/**
 * ============================================
 * ADMIN ROUTES (require authentication + admin role)
 * ============================================
 */

router.get(
    '/admin/all',
    authenticate,
    authorize(['ADMIN', 'MANAGER']),
    AnnouncementController.getAll
);

router.get(
    '/admin/scheduled',
    authenticate,
    authorize(['ADMIN', 'MANAGER']),
    AnnouncementController.getScheduled
);

router.get(
    '/admin/expired',
    authenticate,
    authorize(['ADMIN', 'MANAGER']),
    AnnouncementController.getExpired
);

router.get(
    '/admin/deleted',
    authenticate,
    authorize(['ADMIN', 'MANAGER']),
    AnnouncementController.getDeleted
);

router.get(
    '/:id',
    validate({ params: announcementIdParamSchema }),
    optionalAuthenticate,
    AnnouncementController.getOne
);

router.post(
    '/',
    authenticate,
    authorize(['ADMIN', 'MANAGER']),
    validate({ body: createAnnouncementSchema }),
    AnnouncementController.create
);

router.put(
    '/:id',
    authenticate,
    authorize(['ADMIN', 'MANAGER']),
    validate({
        params: announcementIdParamSchema,
        body: updateAnnouncementSchema
    }),
    AnnouncementController.update
);

router.delete(
    '/:id',
    authenticate,
    authorize(['ADMIN', 'MANAGER']),
    validate({ params: announcementIdParamSchema }),
    AnnouncementController.delete
);

router.post(
    '/:id/restore',
    authenticate,
    authorize(['ADMIN', 'MANAGER']),
    validate({ params: announcementIdParamSchema }),
    AnnouncementController.restore
);

module.exports = router;
