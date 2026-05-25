const asyncHandler = require('../../utils/asyncHandler.util');
const AppError = require('../../utils/appError.util');
const { assertAuthenticated, assertRole } = require('../../utils/auth.util');
const OrderService = require('./order.service');
const { buildAuditMetadata } = require('../../utils/audit.util');

// ===== PUBLIC ENDPOINTS =====

const trackOrder = asyncHandler(async (req, res) => {
    const { order_code } = req.params;

    const trackingData = await OrderService.getOrderByCode(order_code);

    res.status(200).json({
        success: true,
        data: trackingData,
    });
});

// ===== CUSTOMER ENDPOINTS =====

const createOrder = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);

    const orderData = req.body;

    const order = await OrderService.createOrderFromCart(
        user.userId,
        orderData.cart_id,
        orderData,
        buildAuditMetadata(req)
    );

    res.status(201).json({
        success: true,
        data: order,
        message: 'Order created successfully',
    });
});

const getOrders = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);

    const filters = req.query;

    const result = await OrderService.getUserOrders(
        user.userId,
        filters.page,
        filters.limit,
        {
            status: filters.status,
            payment_status: filters.payment_status,
            date_from: filters.date_from,
            date_to: filters.date_to,
        }
    );

    res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
    });
});

const getOrderDetail = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);

    const { order_id } = req.params;

    const order = await OrderService.getOrderById(order_id);

    if (order.user_id !== user.userId) {
        throw new AppError(
            'You do not have permission to view this order',
            403,
            'UNAUTHORIZED'
        );
    }

    res.status(200).json({
        success: true,
        data: order,
    });
});

const cancelOrder = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);

    const { order_id } = req.params;
    const { reason } = req.body;

    const order = await OrderService.getOrderById(order_id);

    if (order.user_id !== user.userId) {
        throw new AppError(
            'You do not have permission to cancel this order',
            403,
            'UNAUTHORIZED'
        );
    }

    const cancelledOrder = await OrderService.cancelCustomerOrder(
        order_id,
        reason,
        user.userId,
        buildAuditMetadata(req)
    );

    res.status(200).json({
        success: true,
        data: cancelledOrder,
        message: 'Order cancelled successfully',
    });
});

const writeReview = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);

    const { order_id } = req.params;
    const { item_id, rating, title, comment } = req.body;

    const order = await OrderService.getOrderById(order_id);

    if (order.user_id !== user.userId) {
        throw new AppError(
            'You do not have permission to review this order',
            403,
            'UNAUTHORIZED'
        );
    }

    const updatedOrder = await OrderService.writeReview(
        order_id,
        item_id,
        rating,
        title,
        comment,
        user.userId,
        buildAuditMetadata(req)
    );

    res.status(200).json({
        success: true,
        data: updatedOrder,
        message: 'Review submitted successfully',
    });
});

// ===== ADMIN ENDPOINTS =====

const updateOrderStatus = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    assertRole(user, ['ADMIN']);

    const { order_id } = req.params;
    const { status, note } = req.body;

    const updatedOrder = await OrderService.updateOrderStatus(
        order_id,
        status,
        user.userId,
        note,
        buildAuditMetadata(req)
    );

    res.status(200).json({
        success: true,
        data: updatedOrder,
        message: 'Order status updated successfully',
    });
});

const adminUpdateOrder = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    assertRole(user, ['ADMIN']);

    const { order_id } = req.params;
    const updateData = req.body;

    const updatedOrder = await OrderService.adminUpdateOrder(
        order_id,
        updateData,
        user.userId,
        buildAuditMetadata(req)
    );

    res.status(200).json({
        success: true,
        data: updatedOrder,
        message: 'Order updated successfully',
    });
});

const fulfillItems = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    assertRole(user, ['ADMIN']);

    const { order_id } = req.params;
    const { item_id, quantity_fulfilled } = req.body;

    const updatedOrder = await OrderService.fulfillItems(
        order_id,
        item_id,
        quantity_fulfilled,
        user.userId,
        buildAuditMetadata(req)
    );

    res.status(200).json({
        success: true,
        data: updatedOrder,
        message: 'Items fulfilled successfully',
    });
});

const recordShipment = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    assertRole(user, ['ADMIN']);

    const { order_id } = req.params;
    const { carrier, tracking_code } = req.body;

    const updatedOrder = await OrderService.recordShipment(
        order_id,
        {
            carrier,
            tracking_code,
        },
        user.userId,
        buildAuditMetadata(req)
    );

    res.status(200).json({
        success: true,
        data: updatedOrder,
        message: 'Shipment recorded successfully',
    });
});

const confirmDelivery = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    assertRole(user, ['ADMIN']);

    const { order_id } = req.params;

    const updatedOrder = await OrderService.confirmDelivery(
        order_id,
        user.userId,
        buildAuditMetadata(req)
    );

    res.status(200).json({
        success: true,
        data: updatedOrder,
        message: 'Order marked as delivered',
    });
});

const getAllOrders = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    assertRole(user, ['ADMIN']);

    const filters = req.query;

    const result = await OrderService.getAllOrders(
        filters.page,
        filters.limit,
        {
            status: filters.status,
            payment_status: filters.payment_status,
            user_id: filters.user_id,
            date_from: filters.date_from,
            date_to: filters.date_to,
        }
    );

    res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
    });
});

const getOrderStats = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    assertRole(user, ['ADMIN']);

    const filters = req.query;

    const stats = await OrderService.getOrderStats({
        status: filters.status?.length > 0 ? filters.status : undefined,
        payment_status: filters.payment_status,
        date_from: filters.date_from,
        date_to: filters.date_to,
    });

    res.status(200).json({
        success: true,
        data: stats,
    });
});

const getAdminOrderDetail = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    assertRole(user, ['ADMIN']);

    const { order_id } = req.params;

    const order = await OrderService.getAdminOrderById(order_id);

    res.status(200).json({
        success: true,
        data: order,
    });
});

module.exports = {
    trackOrder,
    createOrder,
    getOrders,
    getOrderDetail,
    cancelOrder,
    writeReview,
    updateOrderStatus,
    adminUpdateOrder,
    fulfillItems,
    recordShipment,
    confirmDelivery,
    getAllOrders,
    getOrderStats,
    getAdminOrderDetail,
};
