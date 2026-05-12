const asyncHandler = require('../../utils/asyncHandler.util');
const AppError = require('../../utils/appError.util');
const { assertAuthenticated, assertRole } = require('../../utils/auth.util');
const OrderService = require('./order.service');
const OrderMapper = require('./order.mapper');

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
        orderData
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

    const cancelledOrder = await OrderService.cancelOrder(
        order_id,
        reason,
        user.userId
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
    const { item_id, rating, comment } = req.body;

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
        comment
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
        note
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

    let updatedOrder;

    if (updateData.status) {
        updatedOrder = await OrderService.updateOrderStatus(
            order_id,
            updateData.status,
            user.userId,
            'Admin update'
        );
    }

    if (updateData.admin_notes) {
        updatedOrder = await OrderService.updateAdminNotes(
            order_id,
            updateData.admin_notes
        );
    }

    if (!updatedOrder) {
        updatedOrder = await OrderService.getOrderById(order_id);
    }

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
        quantity_fulfilled
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
        }
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

    const updatedOrder = await OrderService.confirmDelivery(order_id);

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

    const stats = await OrderService.getOrderStats();

    res.status(200).json({
        success: true,
        data: stats,
    });
});

const getAdminOrderDetail = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    assertRole(user, ['ADMIN']);

    const { order_id } = req.params;

    const order = await OrderService.getOrderById(order_id);

    const adminDTO = OrderMapper.toAdminDTO(order);

    res.status(200).json({
        success: true,
        data: adminDTO,
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