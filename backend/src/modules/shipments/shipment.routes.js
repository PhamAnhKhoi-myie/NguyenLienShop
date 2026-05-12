const express = require('express');

const validate = require('../../middlewares/validate.middleware');
const { authenticate } = require('../../middlewares/auth.middleware');

const ShipmentController = require('./shipment.controller');

const {
    shipmentIdParamSchema,
    orderIdParamSchema,
    trackingCodeParamSchema,
    carrierParamSchema,

    createShipmentBodySchema,
    cancelShipmentBodySchema,
    updateShipmentStatusBodySchema,
    recordShipmentFailureBodySchema,
    adminUpdateShipmentBodySchema,
    carrierWebhookBodySchema,

    listShipmentsQuerySchema,
    adminListShipmentsQuerySchema,
} = require('./shipment.validator');

const router = express.Router();

// ===== PUBLIC =====

router.get(
    '/track/:tracking_code',
    validate({ params: trackingCodeParamSchema }),
    ShipmentController.trackShipment
);

router.post(
    '/webhook/:carrier',
    validate({ params: carrierParamSchema, body: carrierWebhookBodySchema }),
    ShipmentController.handleCarrierWebhook
);

// ===== CUSTOMER =====

router.get(
    '/order/:orderId',
    authenticate,
    validate({ params: orderIdParamSchema }),
    ShipmentController.getShipmentsForOrder
);

router.get(
    '/',
    authenticate,
    validate({ query: listShipmentsQuerySchema }),
    ShipmentController.listShipments
);

router.get(
    '/:shipmentId',
    authenticate,
    validate({ params: shipmentIdParamSchema }),
    ShipmentController.getShipment
);

router.post(
    '/:shipmentId/retry',
    authenticate,
    validate({ params: shipmentIdParamSchema }),
    ShipmentController.retryShipment
);

router.patch(
    '/:shipmentId/cancel',
    authenticate,
    validate({ params: shipmentIdParamSchema, body: cancelShipmentBodySchema }),
    ShipmentController.cancelShipment
);

// ===== ADMIN =====

router.get(
    '/admin/stats',
    authenticate,
    ShipmentController.getShipmentStats
);

router.get(
    '/admin',
    authenticate,
    validate({ query: adminListShipmentsQuerySchema }),
    ShipmentController.getAllShipments
);

router.get(
    '/admin/:shipmentId',
    authenticate,
    validate({ params: shipmentIdParamSchema }),
    ShipmentController.getAdminShipmentDetail
);

router.patch(
    '/admin/:shipmentId',
    authenticate,
    validate({ params: shipmentIdParamSchema, body: adminUpdateShipmentBodySchema }),
    ShipmentController.adminUpdateShipment
);

router.delete(
    '/admin/:shipmentId',
    authenticate,
    validate({ params: shipmentIdParamSchema }),
    ShipmentController.deleteShipment
);

router.post(
    '/',
    authenticate,
    validate({ body: createShipmentBodySchema }),
    ShipmentController.createShipment
);

router.patch(
    '/:shipmentId/status',
    authenticate,
    validate({ params: shipmentIdParamSchema, body: updateShipmentStatusBodySchema }),
    ShipmentController.updateShipmentStatus
);

router.patch(
    '/:shipmentId/failure',
    authenticate,
    validate({ params: shipmentIdParamSchema, body: recordShipmentFailureBodySchema }),
    ShipmentController.recordShipmentFailure
);

router.post(
    '/:shipmentId/confirm-delivery',
    authenticate,
    validate({ params: shipmentIdParamSchema }),
    ShipmentController.confirmDelivery
);

module.exports = router;