const express = require('express');
const validateMiddleware = require('../../middlewares/validate.middleware');
const { authenticate } = require('../../middlewares/auth.middleware');
const ShipmentController = require('./shipment.controller');
const {
    createShipmentSchema,
    getShipmentSchema,
    getShipmentsForOrderSchema,
    listShipmentsSchema,
    updateShipmentStatusSchema,
    recordShipmentFailureSchema,
    retryShipmentSchema,
    cancelShipmentSchema,
    confirmDeliverySchema,
    trackShipmentSchema,
    carrierWebhookSchema,
    adminUpdateShipmentSchema,
    adminListShipmentsSchema,
} = require('./shipment.validator');

const router = express.Router();

// ✅ Create validate middleware factory
const validate = (schema) => validateMiddleware(schema);

// ===== PUBLIC ENDPOINTS (No Auth) =====

router.get(
    '/track/:tracking_code',
    validate(trackShipmentSchema),
    ShipmentController.trackShipment
);

router.post(
    '/webhook/:carrier',
    ShipmentController.handleCarrierWebhook
);

// ===== CUSTOMER ENDPOINTS (Authenticated) =====

router.post(
    '/:shipmentId/retry',
    authenticate,
    validate(getShipmentSchema),
    ShipmentController.retryShipment
);

router.patch(
    '/:shipmentId/cancel',
    authenticate,
    validate(cancelShipmentSchema),
    ShipmentController.cancelShipment
);

router.get(
    '/order/:orderId',
    authenticate,
    validate(getShipmentsForOrderSchema),
    ShipmentController.getShipmentsForOrder
);

router.get(
    '/:shipmentId',
    authenticate,
    validate(getShipmentSchema),
    ShipmentController.getShipment
);

router.get(
    '/',
    authenticate,
    validate(listShipmentsSchema),
    ShipmentController.listShipments
);

// ===== ADMIN ENDPOINTS =====

router.post(
    '/',
    authenticate,
    validate(createShipmentSchema),
    ShipmentController.createShipment
);

router.patch(
    '/:shipmentId/status',
    authenticate,
    validate(updateShipmentStatusSchema),
    ShipmentController.updateShipmentStatus
);

router.patch(
    '/:shipmentId/failure',
    authenticate,
    validate(recordShipmentFailureSchema),
    ShipmentController.recordShipmentFailure
);

router.post(
    '/:shipmentId/confirm-delivery',
    authenticate,
    validate(confirmDeliverySchema),
    ShipmentController.confirmDelivery
);

router.get(
    '/admin/stats',
    authenticate,
    ShipmentController.getShipmentStats
);

router.get(
    '/admin/:shipmentId',
    authenticate,
    validate(getShipmentSchema),
    ShipmentController.getAdminShipmentDetail
);

router.patch(
    '/admin/:shipmentId',
    authenticate,
    validate(adminUpdateShipmentSchema),
    ShipmentController.adminUpdateShipment
);

router.get(
    '/admin',
    authenticate,
    validate(adminListShipmentsSchema),
    ShipmentController.getAllShipments
);

router.delete(
    '/admin/:shipmentId',
    authenticate,
    validate(getShipmentSchema),
    ShipmentController.deleteShipment
);

module.exports = router;