const express = require('express');

const validate = require('../../middlewares/validate.middleware');
const { authenticate } = require('../../middlewares/auth.middleware');

const OrderController = require('./order.controller');

const {

    IdParamSchema,
    OrderCodeParamSchema,


    createOrderBodySchema,
    cancelOrderBodySchema,
    writeReviewBodySchema,
    updateOrderStatusBodySchema,
    fulfillItemsBodySchema,
    recordShipmentBodySchema,
    adminUpdateOrderBodySchema,
    completeRefundBodySchema,


    getOrdersQuerySchema,
} = require('./order.validator');

const router = express.Router();



router.get(
    '/track/:order_code',
    validate({ params: OrderCodeParamSchema }),
    OrderController.trackOrder
);



router.post(
    '/',
    authenticate,
    validate({ body: createOrderBodySchema }),
    OrderController.createOrder
);

router.get(
    '/checkout-settings',
    authenticate,
    OrderController.getCheckoutSettings
);

router.get(
    '/',
    authenticate,
    validate({ query: getOrdersQuerySchema }),
    OrderController.getOrders
);

router.post(
    '/:order_id/cancel',
    authenticate,
    validate({
        params: IdParamSchema,
        body: cancelOrderBodySchema,
    }),
    OrderController.cancelOrder
);

router.post(
    '/:order_id/review',
    authenticate,
    validate({
        params: IdParamSchema,
        body: writeReviewBodySchema,
    }),
    OrderController.writeReview
);



router.get(
    '/admin/orders/stats',
    authenticate,
    validate({ query: getOrdersQuerySchema }),
    OrderController.getOrderStats
);

router.get(
    '/admin/orders',
    authenticate,
    validate({ query: getOrdersQuerySchema }),
    OrderController.getAllOrders
);

router.patch(
    '/admin/orders/:order_id/status',
    authenticate,
    validate({
        params: IdParamSchema,
        body: updateOrderStatusBodySchema,
    }),
    OrderController.updateOrderStatus
);

router.patch(
    '/admin/orders/:order_id',
    authenticate,
    validate({
        params: IdParamSchema,
        body: adminUpdateOrderBodySchema,
    }),
    OrderController.adminUpdateOrder
);

router.post(
    '/admin/orders/:order_id/refund',
    authenticate,
    validate({
        params: IdParamSchema,
        body: completeRefundBodySchema,
    }),
    OrderController.completeManualRefund
);

router.post(
    '/admin/orders/:order_id/fulfill',
    authenticate,
    validate({
        params: IdParamSchema,
        body: fulfillItemsBodySchema,
    }),
    OrderController.fulfillItems
);

router.post(
    '/admin/orders/:order_id/shipment',
    authenticate,
    validate({
        params: IdParamSchema,
        body: recordShipmentBodySchema,
    }),
    OrderController.recordShipment
);

router.post(
    '/admin/orders/:order_id/deliver',
    authenticate,
    validate({
        params: IdParamSchema,
    }),
    OrderController.confirmDelivery
);

router.get(
    '/admin/orders/:order_id',
    authenticate,
    validate({ params: IdParamSchema }),
    OrderController.getAdminOrderDetail
);



router.get(
    '/:order_id',
    authenticate,
    validate({ params: IdParamSchema }),
    OrderController.getOrderDetail
);

module.exports = router;
