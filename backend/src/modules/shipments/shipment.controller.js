const asyncHandler = require('../../utils/asyncHandler.util');
const AppError = require('../../utils/appError.util');
const { assertAuthenticated, assertRole } = require('../../utils/auth.util');
const ShipmentService = require('./shipment.service');
const { buildAuditMetadata } = require('../../utils/audit.util');

// ===== PUBLIC ENDPOINTS (No Auth) =====

const trackShipment = asyncHandler(async (req, res) => {
    const { tracking_code } = req.params;

    const trackingData = await ShipmentService.getShipmentByTrackingCode(
        tracking_code
    );

    res.status(200).json({
        success: true,
        data: trackingData,
    });
});

const handleCarrierWebhook = asyncHandler(async (req, res) => {
    const { carrier } = req.params;
    const auditMetadata = buildAuditMetadata(req);

    const {
        tracking_code,
        status,
        carrier_details,
        signature,
        timestamp,
    } = req.body;

    if (!signature) {
        const error = new AppError(
            'Missing shipment webhook signature',
            400,
            'MISSING_WEBHOOK_SIGNATURE'
        );

        await ShipmentService.auditShipmentWebhookRejected(
            carrier,
            { tracking_code, status },
            error,
            auditMetadata
        );

        throw error;
    }

    let result;

    try {
        result = await ShipmentService.updateShipmentStatusFromWebhook(
            carrier,
            tracking_code,
            status,
            {
                carrier_details,
                signature,
                timestamp,
                audit_metadata: auditMetadata,
            }
        );
    } catch (error) {
        await ShipmentService.auditShipmentWebhookRejected(
            carrier,
            { tracking_code, status },
            error,
            auditMetadata
        );
        throw error;
    }

    res.status(200).json({
        success: true,
        data: result,
    });
});

// ===== CUSTOMER ENDPOINTS =====

const getShipment = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    const { shipmentId } = req.params;

    const shipment = await ShipmentService.getShipment(
        shipmentId,
        user.userId
    );

    res.status(200).json({
        success: true,
        data: shipment,
    });
});

const getShipmentsForOrder = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    const { orderId } = req.params;

    const shipments = await ShipmentService.getShipmentsForOrder(
        orderId,
        user.userId
    );

    res.status(200).json({
        success: true,
        data: shipments,
    });
});

const listShipments = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);

    const {
        page = 1,
        limit = 20,
        status,
        carrier,
        date_from,
        date_to,
    } = req.query;

    const result = await ShipmentService.getUserShipments(
        user.userId,
        page,
        limit,
        {
            status: status && status.length > 0 ? status : undefined,
            carrier,
            date_from,
            date_to,
        }
    );

    res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
    });
});

const cancelShipment = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    const { shipmentId } = req.params;
    const { reason } = req.body;

    await ShipmentService.getShipment(
        shipmentId,
        user.userId
    );

    const cancelledShipment = await ShipmentService.cancelShipment(
        shipmentId,
        reason,
        user.userId,
        buildAuditMetadata(req)
    );

    res.status(200).json({
        success: true,
        data: cancelledShipment,
        message: 'Shipment cancelled successfully',
    });
});

const retryShipment = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    const { shipmentId } = req.params;

    await ShipmentService.getShipment(
        shipmentId,
        user.userId
    );

    const retriedShipment = await ShipmentService.retryFailedShipment(
        shipmentId,
        user.userId,
        buildAuditMetadata(req)
    );

    res.status(200).json({
        success: true,
        data: retriedShipment,
        message: 'Shipment retry initiated',
    });
});

// ===== ADMIN ENDPOINTS =====

const createShipment = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    assertRole(user, ['ADMIN']);

    const shipmentData = req.body;

    const shipment = await ShipmentService.createShipment(
        shipmentData.order_id,
        user.userId,
        shipmentData,
        buildAuditMetadata(req)
    );

    res.status(201).json({
        success: true,
        data: shipment,
        message: 'Shipment created successfully',
    });
});

const updateShipmentStatus = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    assertRole(user, ['ADMIN']);

    const { shipmentId } = req.params;
    const { status, notes } = req.body;

    const updatedShipment = await ShipmentService.updateShipmentStatus(
        shipmentId,
        status,
        {
            notes,
            changed_by: user.userId,
            audit_metadata: buildAuditMetadata(req),
        }
    );

    res.status(200).json({
        success: true,
        data: updatedShipment,
        message: 'Shipment status updated successfully',
    });
});

const recordShipmentFailure = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    assertRole(user, ['ADMIN']);

    const { shipmentId } = req.params;
    const { failure_reason, failure_notes } = req.body;

    const failedShipment = await ShipmentService.recordDeliveryFailure(
        shipmentId,
        failure_reason,
        failure_notes,
        user.userId,
        buildAuditMetadata(req)
    );

    res.status(200).json({
        success: true,
        data: failedShipment,
        message: 'Delivery failure recorded',
    });
});

const confirmDelivery = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    assertRole(user, ['ADMIN']);

    const { shipmentId } = req.params;

    const deliveredShipment = await ShipmentService.confirmDelivery(
        shipmentId,
        user.userId,
        buildAuditMetadata(req)
    );

    res.status(200).json({
        success: true,
        data: deliveredShipment,
        message: 'Delivery confirmed successfully',
    });
});

const getAllShipments = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    assertRole(user, ['ADMIN']);

    const {
        page = 1,
        limit = 20,
        status,
        carrier,
        user_id,
        order_id,
        date_from,
        date_to,
    } = req.query;

    const result = await ShipmentService.getAllShipments(
        page,
        limit,
        {
            status: status && status.length > 0 ? status : undefined,
            carrier,
            user_id,
            order_id,
            date_from,
            date_to,
        }
    );

    res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
    });
});

const getAdminShipmentDetail = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    assertRole(user, ['ADMIN']);

    const { shipmentId } = req.params;

    const shipment = await ShipmentService.getAdminShipment(shipmentId);

    res.status(200).json({
        success: true,
        data: shipment,
    });
});

const adminUpdateShipment = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    assertRole(user, ['ADMIN']);

    const { shipmentId } = req.params;

    const updatedShipment = await ShipmentService.adminUpdateShipment(
        shipmentId,
        req.body,
        user.userId,
        buildAuditMetadata(req)
    );

    res.status(200).json({
        success: true,
        data: updatedShipment,
        message: 'Shipment updated successfully',
    });
});

const getShipmentStats = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    assertRole(user, ['ADMIN']);

    const stats = await ShipmentService.getShipmentStats();

    res.status(200).json({
        success: true,
        data: stats,
    });
});

const deleteShipment = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    assertRole(user, ['ADMIN']);

    const { shipmentId } = req.params;

    const deletedShipment = await ShipmentService.softDeleteShipment(
        shipmentId,
        user.userId,
        buildAuditMetadata(req)
    );

    res.status(200).json({
        success: true,
        data: deletedShipment,
        message: 'Shipment deleted successfully',
    });
});

module.exports = {
    trackShipment,
    handleCarrierWebhook,

    getShipment,
    getShipmentsForOrder,
    listShipments,
    cancelShipment,
    retryShipment,

    createShipment,
    updateShipmentStatus,
    recordShipmentFailure,
    confirmDelivery,
    getAllShipments,
    getAdminShipmentDetail,
    adminUpdateShipment,
    getShipmentStats,
    deleteShipment,
};
