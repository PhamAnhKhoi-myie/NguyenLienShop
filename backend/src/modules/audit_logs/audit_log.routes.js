const express = require('express');
const router = express.Router();
const auditLogController = require('./audit_log.controller');
const { authorize } = require('../../middlewares/authorize.middleware');
const { authenticate } = require('../../middlewares/auth.middleware');
const { ROLES } = require('../../constants/roles');

router.use(authenticate);
router.use(authorize([ROLES.ADMIN]));

// Routes
router.route('/')
    .get(auditLogController.getAllLogs);

router.get('/users', auditLogController.getUserLogs);
router.get('/user-addresses', auditLogController.getUserAddressLogs);
router.get('/categories', auditLogController.getCategoryLogs);
router.get('/auth', auditLogController.getAuthLogs);

router.route('/:id')
    .get(auditLogController.getLogById);

module.exports = router;