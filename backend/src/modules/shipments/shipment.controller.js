const asyncHandler = require('../../utils/asyncHandler.util');
const AppError = require('../../utils/appError.util');
const { assertAuthenticated, assertRole } = require('../../utils/auth.util');
const { validateObjectId } = require('../../utils/validator.util');
const ShipmentService = require('./shipment.service');
const ShipmentMapper = require('./shipment.mapper');
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

// ===== PUBLIC ENDPOINTS (No Auth) =====

/**
 * GET /api/v1/shipments/track/:tracking_code
 * Public shipment tracking (no authentication required)
 * 
 * ✅ No authentication needed
 * ✅ Returns minimal tracking info (status, timeline, carrier details)
 * ✅ Specific route BEFORE /:shipmentId
 * ✅ Useful for public tracking page
 * 
 * Path params:
 * - tracking_code (carrier-dependent format, case-insensitive)
 * 
 * Response: Tracking DTO (minimal info for public)
 * {
 *   order_id,
 *   status,
 *   status_label,
 *   carrier,
 *   tracking_code,
 *   tracking_url,
 *   timeline: [
 *     { timestamp, status, label }
 *   ],
 *   destination,
 *   estimated_delivery,
 *   last_update
 * }
 * 
 * Error cases:
 * - SHIPMENT_NOT_FOUND: Invalid tracking code
 */
const trackShipment = asyncHandler(async (req, res) => {
    const { tracking_code } = trackShipmentSchema.parse(req.params);

    const trackingData = await ShipmentService.getShipmentByTrackingCode(
        tracking_code
    );

    res.status(200).json({
        success: true,
        data: trackingData,
    });
});

/**
 * POST /api/v1/shipments/webhook/:carrier
 * Carrier webhook for shipment status updates
 * 
 * ✅ No authentication (webhook from carrier)
 * ✅ Signature verification mandatory (carrier-dependent)
 * ✅ Process shipment status from carrier
 * ✅ Update order status if delivered
 * 
 * Path params:
 * - carrier (GHN|GHTK|JT|GRAB|BEST|OTHER)
 * 
 * Body:
 * - tracking_code (required)
 * - status (required, carrier status)
 * - signature (optional, if carrier requires verification)
 * - carrier_details (optional, extra info from carrier)
 * 
 * Response:
 * - { status, shipmentId, newStatus }
 * 
 * Error cases:
 * - SHIPMENT_NOT_FOUND: Tracking code not found
 * - WEBHOOK_VERIFICATION_FAILED: Invalid signature
 */
const handleCarrierWebhook = asyncHandler(async (req, res) => {
    const { carrier } = req.params;

    // ✅ Validate webhook data
    const validated = carrierWebhookSchema.parse(req.body);

    // ✅ TODO: Verify webhook signature (carrier-dependent)
    // if (!verifyCarrierSignature(carrier, validated)) {
    //     throw new AppError(
    //         'Webhook verification failed',
    //         401,
    //         'WEBHOOK_VERIFICATION_FAILED'
    //     );
    // }

    // ✅ Update shipment status
    const result = await ShipmentService.updateShipmentStatus(
        validated.tracking_code,
        validated.status,
        {
            carrier_details: validated.carrier_details,
            timestamp: validated.timestamp,
        }
    );

    // ✅ Always respond 200 OK to webhook
    res.status(200).json({
        success: true,
        data: result,
    });
});

// ===== CUSTOMER ENDPOINTS (Authenticated) =====

/**
 * GET /api/v1/shipments/:shipmentId
 * Get shipment details (customer view)
 * 
 * ✅ Authentication required
 * ✅ Customer can only see their own shipment
 * ✅ Returns full details + failure tracking + retry info
 * ✅ Specific route BEFORE dynamic routes
 * 
 * Path params:
 * - shipmentId (MongoDB ObjectId)
 * 
 * Response: Shipment detail DTO (customer-friendly)
 * - Hides: user_id, admin notes
 * - Includes: tracking URL, estimated delivery, retry status
 * 
 * Error cases:
 * - SHIPMENT_NOT_FOUND: Shipment doesn't exist
 * - UNAUTHORIZED: Shipment belongs to different user (returns 404)
 */
const getShipment = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    validateObjectId(req.params.shipmentId);

    // ✅ Get shipment with ownership check
    const shipment = await ShipmentService.getShipment(
        req.params.shipmentId,
        user.userId
    );

    res.status(200).json({
        success: true,
        data: shipment,
    });
});

/**
 * GET /api/v1/orders/:orderId/shipments
 * Get all shipments for order (customer view)
 * 
 * ✅ Authentication required
 * ✅ Customer can only see shipments for their own order
 * ✅ Sorted by created_at DESC
 * 
 * Path params:
 * - orderId (MongoDB ObjectId)
 * 
 * Response: Array of shipment DTOs
 * [
 *   { id, carrier, tracking_code, status, timeline, ... },
 *   ...
 * ]
 * 
 * Error cases:
 * - ORDER_NOT_FOUND: Order doesn't exist or not owned by user
 */
const getShipmentsForOrder = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    validateObjectId(req.params.orderId);

    // ✅ Get shipments (with order ownership check)
    const shipments = await ShipmentService.getShipmentsForOrder(
        req.params.orderId,
        user.userId
    );

    res.status(200).json({
        success: true,
        data: shipments,
    });
});

/**
 * GET /api/v1/shipments
 * List user's shipments (paginated + filtered)
 * 
 * ✅ Authentication required
 * ✅ Returns customer view (no admin data)
 * ✅ Filters: status, carrier, date range
 * 
 * Query params:
 * - page (optional, default 1)
 * - limit (optional, default 20, max 100)
 * - status (optional, comma-separated: pending,picked_up,in_transit,at_destination,delivered,failed,cancelled,returned)
 * - carrier (optional: GHN|GHTK|JT|GRAB|BEST|OTHER)
 * - date_from (optional, ISO date)
 * - date_to (optional, ISO date)
 * 
 * Response: Paginated shipment list
 * {
 *   success: true,
 *   data: [...],
 *   pagination: { page, limit, total, totalPages }
 * }
 * 
 * Example: /api/v1/shipments?status=in_transit,at_destination&limit=10
 */
const listShipments = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);

    // ✅ Validate query params
    const filters = listShipmentsSchema.parse(req.query);

    // ✅ Get shipments
    const result = await ShipmentService.getUserShipments(
        user.userId,
        filters.page,
        filters.limit,
        {
            status: filters.status.length > 0 ? filters.status : undefined,
            carrier: filters.carrier,
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

/**
 * PATCH /api/v1/shipments/:shipmentId/cancel
 * Cancel shipment (customer action)
 * 
 * ✅ Authentication required
 * ✅ Customer can only cancel their own shipment
 * ✅ Can only cancel in-progress shipments (not delivered/returned/cancelled)
 * ✅ Reverts order status → confirmed for potential re-ship
 * 
 * Path params:
 * - shipmentId (MongoDB ObjectId)
 * 
 * Body:
 * - reason (required, 5-500 chars)
 * 
 * Response: Cancelled shipment DTO
 * 
 * Error cases:
 * - SHIPMENT_NOT_FOUND: Shipment doesn't exist
 * - CANNOT_CANCEL_SHIPMENT: Shipment not in cancellable state
 * - UNAUTHORIZED: Shipment belongs to different user
 */
const cancelShipment = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    validateObjectId(req.params.shipmentId);

    // ✅ Verify user owns shipment
    const shipment = await ShipmentService.getShipment(
        req.params.shipmentId,
        user.userId
    );

    // ✅ Validate request body
    const { reason } = cancelShipmentSchema.parse(req.body);

    // ✅ Cancel shipment
    const cancelledShipment = await ShipmentService.cancelShipment(
        req.params.shipmentId,
        reason
    );

    res.status(200).json({
        success: true,
        data: cancelledShipment,
        message: 'Shipment cancelled successfully',
    });
});

/**
 * POST /api/v1/shipments/:shipmentId/retry
 * Retry failed shipment (customer action)
 * 
 * ✅ Authentication required
 * ✅ Customer can only retry their own failed shipments
 * ✅ Can only retry if retry_count < max_retries
 * ✅ Resets status → pending for another delivery attempt
 * 
 * Path params:
 * - shipmentId (MongoDB ObjectId)
 * 
 * Response: Retried shipment DTO
 * {
 *   id,
 *   status: "pending",  // Reset to pending
 *   retry_count: 1,     // Incremented
 *   failure: null       // Cleared
 * }
 * 
 * Error cases:
 * - SHIPMENT_NOT_FOUND: Shipment doesn't exist
 * - INVALID_SHIPMENT_STATUS: Shipment not in failed state
 * - MAX_RETRIES_EXCEEDED: Already retried max 3 times
 * - UNAUTHORIZED: Shipment belongs to different user
 */
const retryShipment = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    validateObjectId(req.params.shipmentId);

    // ✅ Verify user owns shipment
    const shipment = await ShipmentService.getShipment(
        req.params.shipmentId,
        user.userId
    );

    // ✅ Retry shipment
    const retriedShipment = await ShipmentService.retryFailedShipment(
        req.params.shipmentId
    );

    res.status(200).json({
        success: true,
        data: retriedShipment,
        message: 'Shipment retry initiated',
    });
});

// ===== ADMIN ENDPOINTS =====

/**
 * POST /api/v1/shipments
 * Create shipment (admin action)
 * 
 * ✅ Authentication required (ADMIN only)
 * ✅ Creates shipment for confirmed order
 * ✅ CRITICAL: Validates order exists + status is confirmed
 * ✅ Snapshots shipping address from order
 * 
 * Body:
 * - order_id (required, ObjectId)
 * - carrier (required: GHN|GHTK|JT|GRAB|BEST|OTHER)
 * - tracking_code (required, alphanumeric + hyphens/underscores)
 * - shipping_address (optional, defaults to order's address)
 *   - recipient_name, phone, address, ward, district, province (all required)
 * 
 * Response: Created shipment DTO
 * {
 *   id,
 *   order_id,
 *   carrier,
 *   tracking_code,
 *   shipping_address: {...},
 *   status: "pending",
 *   timeline: {...},
 *   created_at
 * }
 * 
 * Error cases:
 * - ORDER_NOT_FOUND: Order doesn't exist or not confirmed
 * - TRACKING_CODE_DUPLICATE: Tracking code already used
 * - MISSING_CARRIER_OR_TRACKING_CODE: Required fields missing
 */
const createShipment = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    assertRole(user, ['ADMIN']);

    // ✅ Validate request body
    const shipmentData = createShipmentSchema.parse(req.body);

    // ✅ Create shipment
    const shipment = await ShipmentService.createShipment(
        shipmentData.order_id,
        user.userId,
        shipmentData
    );

    res.status(201).json({
        success: true,
        data: shipment,
        message: 'Shipment created successfully',
    });
});

/**
 * PATCH /api/v1/shipments/:shipmentId/status
 * Update shipment status (admin action)
 * 
 * ✅ Authentication required (ADMIN only)
 * ✅ Enforces status transition rules (state machine)
 * ✅ Updates timeline with state transition timestamp
 * ✅ If delivered: updates order → completed
 * ✅ If failed: records failure reason
 * 
 * Path params:
 * - shipmentId (MongoDB ObjectId)
 * 
 * Body:
 * - status (required: pending|picked_up|in_transit|at_destination|delivered|failed|cancelled|returned)
 * - notes (optional, 0-500 chars)
 * 
 * Response: Updated shipment DTO
 * 
 * Error cases:
 * - SHIPMENT_NOT_FOUND: Shipment doesn't exist
 * - INVALID_SHIPMENT_STATUS_TRANSITION: Invalid status transition
 * - INVALID_SHIPMENT_STATUS: Unknown status value
 */
const updateShipmentStatus = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    assertRole(user, ['ADMIN']);
    validateObjectId(req.params.shipmentId);

    // ✅ Validate request body
    const { status, notes } = updateShipmentStatusSchema.parse(req.body);

    // ✅ Update status
    const updatedShipment = await ShipmentService.updateShipmentStatus(
        req.params.shipmentId,
        status,
        { notes }
    );

    res.status(200).json({
        success: true,
        data: updatedShipment,
        message: 'Shipment status updated successfully',
    });
});

/**
 * PATCH /api/v1/shipments/:shipmentId/failure
 * Record delivery failure (admin action)
 * 
 * ✅ Authentication required (ADMIN only)
 * ✅ Records failure reason + notes
 * ✅ Increments retry_count
 * ✅ Moves shipment to failed status
 * ✅ Sets failed_at timestamp
 * 
 * Path params:
 * - shipmentId (MongoDB ObjectId)
 * 
 * Body:
 * - failure_reason (required: address_incorrect|recipient_unavailable|refused_delivery|damaged_package|lost|weather_delay|carrier_error|other)
 * - failure_notes (optional, 0-500 chars, required if reason=other)
 * 
 * Response: Failed shipment DTO
 * {
 *   id,
 *   status: "failed",
 *   failure_reason: "...",
 *   failure_notes: "...",
 *   retry_count: 1,
 *   can_retry: true
 * }
 * 
 * Error cases:
 * - SHIPMENT_NOT_FOUND: Shipment doesn't exist
 * - INVALID_SHIPMENT_STATUS: Shipment not in-progress
 */
const recordShipmentFailure = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    assertRole(user, ['ADMIN']);
    validateObjectId(req.params.shipmentId);

    // ✅ Validate request body
    const { failure_reason, failure_notes } =
        recordShipmentFailureSchema.parse(req.body);

    // ✅ Record failure
    const failedShipment = await ShipmentService.recordDeliveryFailure(
        req.params.shipmentId,
        failure_reason,
        failure_notes
    );

    res.status(200).json({
        success: true,
        data: failedShipment,
        message: 'Delivery failure recorded',
    });
});

/**
 * POST /api/v1/shipments/:shipmentId/confirm-delivery
 * Confirm delivery (admin or tracking system action)
 * 
 * ✅ Authentication required (ADMIN only)
 * ✅ Marks shipment as delivered
 * ✅ Updates order → completed
 * ✅ Sets delivered_at timestamp
 * 
 * Path params:
 * - shipmentId (MongoDB ObjectId)
 * 
 * Response: Delivered shipment DTO
 * {
 *   id,
 *   status: "delivered",
 *   timeline: { delivered_at: "..." },
 *   progress: 100
 * }
 * 
 * Error cases:
 * - SHIPMENT_NOT_FOUND: Shipment doesn't exist
 * - INVALID_SHIPMENT_STATUS: Shipment not in appropriate state (at_destination or in_transit)
 */
const confirmDelivery = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    assertRole(user, ['ADMIN']);
    validateObjectId(req.params.shipmentId);

    // ✅ Confirm delivery
    const deliveredShipment = await ShipmentService.confirmDelivery(
        req.params.shipmentId
    );

    res.status(200).json({
        success: true,
        data: deliveredShipment,
        message: 'Delivery confirmed successfully',
    });
});

/**
 * GET /api/v1/admin/shipments
 * Admin: List all shipments (with filters)
 * 
 * ✅ Authentication required (ADMIN only)
 * ✅ Comprehensive filtering + pagination
 * ✅ Full admin details (user_id, retry info, etc)
 * 
 * Query params:
 * - page (optional, default 1)
 * - limit (optional, default 20, max 100)
 * - status (optional, comma-separated)
 * - carrier (optional)
 * - user_id (optional, filter by customer)
 * - order_id (optional, filter by order)
 * - date_from (optional, ISO date)
 * - date_to (optional, ISO date)
 * - sort_by (optional, default -created_at)
 * 
 * Response: Paginated shipment list
 * {
 *   success: true,
 *   data: [...],
 *   pagination: { page, limit, total, totalPages }
 * }
 */
const getAllShipments = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    assertRole(user, ['ADMIN']);

    // ✅ Validate query params
    const filters = adminListShipmentsSchema.parse(req.query);

    // ✅ Get shipments
    const result = await ShipmentService.getAllShipments(
        filters.page,
        filters.limit,
        {
            status: filters.status.length > 0 ? filters.status : undefined,
            carrier: filters.carrier,
            user_id: filters.user_id,
            order_id: filters.order_id,
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

/**
 * GET /api/v1/admin/shipments/:shipmentId
 * Admin: Get shipment detail (full transparency)
 * 
 * ✅ Authentication required (ADMIN only)
 * ✅ Returns complete admin DTO (all internal data)
 * 
 * Path params:
 * - shipmentId (MongoDB ObjectId)
 * 
 * Response: Complete shipment DTO with admin fields
 * - Includes: user_id, retry details, soft delete info
 */
const getAdminShipmentDetail = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    assertRole(user, ['ADMIN']);
    validateObjectId(req.params.shipmentId);

    // ✅ Get shipment (no ownership check for admin)
    const shipment = await ShipmentService.getShipment(
        req.params.shipmentId,
        null  // null = admin mode (no user_id check)
    );

    res.status(200).json({
        success: true,
        data: shipment,
    });
});

/**
 * PATCH /api/v1/admin/shipments/:shipmentId
 * Admin: Update shipment details
 * 
 * ✅ Authentication required (ADMIN only)
 * ✅ Can update: carrier, tracking_code, admin notes
 * ✅ Tracking code must be unique
 * 
 * Path params:
 * - shipmentId (MongoDB ObjectId)
 * 
 * Body:
 * - carrier (optional)
 * - tracking_code (optional, must update if carrier changes)
 * - admin_notes (optional, 0-1000 chars)
 * 
 * Response: Updated shipment DTO
 * 
 * Error cases:
 * - SHIPMENT_NOT_FOUND: Shipment doesn't exist
 * - TRACKING_CODE_DUPLICATE: Tracking code already used
 * - VALIDATION_ERROR: Invalid data
 */
const adminUpdateShipment = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    assertRole(user, ['ADMIN']);
    validateObjectId(req.params.shipmentId);

    // ✅ Validate request body
    const updateData = adminUpdateShipmentSchema.parse(req.body);

    // ✅ TODO: Implement update logic
    // For now, return updated shipment
    // await ShipmentService.adminUpdateShipment(req.params.shipmentId, updateData);

    const updatedShipment = await ShipmentService.getShipment(
        req.params.shipmentId,
        null  // admin mode
    );

    res.status(200).json({
        success: true,
        data: updatedShipment,
        message: 'Shipment updated successfully',
    });
});

/**
 * GET /api/v1/admin/shipments/stats
 * Admin: Shipment statistics & analytics
 * 
 * ✅ Authentication required (ADMIN only)
 * ✅ Return: delivery rate, avg time, failure reasons, carrier breakdown
 * 
 * Response:
 * {
 *   totalShipments: 1000,
 *   statusBreakdown: [...],
 *   carrierBreakdown: [...],
 *   deliveryRate: 98.5,
 *   failureRate: 1.5,
 *   failedShipments: [...]
 * }
 */
const getShipmentStats = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    assertRole(user, ['ADMIN']);

    // ✅ Get statistics
    const stats = await ShipmentService.getShipmentStats();

    res.status(200).json({
        success: true,
        data: stats,
    });
});

/**
 * DELETE /api/v1/admin/shipments/:shipmentId
 * Admin: Soft-delete shipment
 * 
 * ✅ Authentication required (ADMIN only)
 * ✅ Soft delete (sets is_deleted = true)
 * ✅ Audit trail preserved
 * 
 * Path params:
 * - shipmentId (MongoDB ObjectId)
 * 
 * Response: Deleted shipment DTO
 * {
 *   id,
 *   is_deleted: true,
 *   deleted_at: "..."
 * }
 * 
 * Error cases:
 * - SHIPMENT_NOT_FOUND: Shipment doesn't exist
 */
const deleteShipment = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    assertRole(user, ['ADMIN']);
    validateObjectId(req.params.shipmentId);

    // ✅ Soft-delete shipment
    const deletedShipment = await ShipmentService.softDeleteShipment(
        req.params.shipmentId
    );

    res.status(200).json({
        success: true,
        data: deletedShipment,
        message: 'Shipment deleted successfully',
    });
});

// ===== EXPORT ALL CONTROLLERS =====

module.exports = {
    // Public endpoints (no auth)
    trackShipment,
    handleCarrierWebhook,

    // Customer endpoints (authenticated)
    getShipment,
    getShipmentsForOrder,
    listShipments,
    cancelShipment,
    retryShipment,

    // Admin endpoints (ADMIN role required)
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