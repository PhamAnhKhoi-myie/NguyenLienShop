const express = require('express');
const router = express.Router();
const auditLogController = require('./audit_log.controller');
const validate = require('../../middlewares/validate.middleware');
const { authorize } = require('../../middlewares/authorize.middleware');
const { authenticate } = require('../../middlewares/auth.middleware');
const { ROLES } = require('../../constants/roles');

const {
    getAllLogsQuerySchema,
    getLogsByDomainQuerySchema,
    idParamSchema
} = require('./audit_log.validator');

router.use(authenticate);
router.use(authorize([ROLES.ADMIN]));

// Routes (specific -> generic)
router.get(
    '/users',
    validate({ query: getLogsByDomainQuerySchema }),
    auditLogController.getUserLogs
);

router.get(
    '/user-addresses',
    validate({ query: getLogsByDomainQuerySchema }),
    auditLogController.getUserAddressLogs
);

router.get(
    '/categories',
    validate({ query: getLogsByDomainQuerySchema }),
    auditLogController.getCategoryLogs
);

router.get(
    '/auth',
    validate({ query: getLogsByDomainQuerySchema }),
    auditLogController.getAuthLogs
);

router.get(
    '/',
    validate({ query: getAllLogsQuerySchema }),
    auditLogController.getAllLogs
);

router.get(
    '/:id',
    validate({ params: idParamSchema }),
    auditLogController.getLogById
);

module.exports = router;