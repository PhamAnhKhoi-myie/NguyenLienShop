const express = require('express');
const router = express.Router();
const auditLogController = require('./audit_log.controller');
const validate = require('../../middlewares/validate.middleware');
const { authorize } = require('../../middlewares/authorize.middleware');
const { authenticate } = require('../../middlewares/auth.middleware');
const { ROLES } = require('../../constants/roles');

const {
    getAllLogsQuerySchema,
    getUserLogsQuerySchema,
    getUserAddressLogsQuerySchema,
    getCategoryLogsQuerySchema,
    getAuthLogsQuerySchema,
    getPaymentLogsQuerySchema,
    getOrderLogsQuerySchema,
    getShipmentLogsQuerySchema,
    getProductLogsQuerySchema,
    getDiscountLogsQuerySchema,
    getReviewLogsQuerySchema,
    getShopContentLogsQuerySchema,
    getCartLogsQuerySchema,
    idParamSchema
} = require('./audit_log.validator');

router.use(authenticate);
router.use(authorize([ROLES.ADMIN]));

// Routes (specific -> generic)
router.get(
    '/users',
    validate({ query: getUserLogsQuerySchema }),
    auditLogController.getUserLogs
);

router.get(
    '/user-addresses',
    validate({ query: getUserAddressLogsQuerySchema }),
    auditLogController.getUserAddressLogs
);

router.get(
    '/categories',
    validate({ query: getCategoryLogsQuerySchema }),
    auditLogController.getCategoryLogs
);

router.get(
    '/auth',
    validate({ query: getAuthLogsQuerySchema }),
    auditLogController.getAuthLogs
);

router.get(
    '/payments',
    validate({ query: getPaymentLogsQuerySchema }),
    auditLogController.getPaymentLogs
);

router.get(
    '/orders',
    validate({ query: getOrderLogsQuerySchema }),
    auditLogController.getOrderLogs
);

router.get(
    '/shipments',
    validate({ query: getShipmentLogsQuerySchema }),
    auditLogController.getShipmentLogs
);

router.get(
    '/products',
    validate({ query: getProductLogsQuerySchema }),
    auditLogController.getProductLogs
);

router.get(
    '/discounts',
    validate({ query: getDiscountLogsQuerySchema }),
    auditLogController.getDiscountLogs
);

router.get(
    '/reviews',
    validate({ query: getReviewLogsQuerySchema }),
    auditLogController.getReviewLogs
);

router.get(
    '/shop-content',
    validate({ query: getShopContentLogsQuerySchema }),
    auditLogController.getShopContentLogs
);

router.get(
    '/carts',
    validate({ query: getCartLogsQuerySchema }),
    auditLogController.getCartLogs
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
