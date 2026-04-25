const asyncHandler = require('../../utils/asyncHandler.util');
const AppError = require('../../utils/appError.util');
const { assertAuthenticated, assertRole } = require('../../utils/auth.util');
const { validateObjectId } = require('../../utils/validator.util');
const OrderService = require('./order.service');
const OrderMapper = require('./order.mapper');
const {
    createOrderSchema,
    getOrdersSchema,
    updateOrderStatusSchema,
    fulfillItemsSchema,
    recordShipmentSchema,
    confirmDeliverySchema,
    cancelOrderSchema,
    getOrderByCodeSchema,
    getOrderByIdSchema,
    adminUpdateOrderSchema,
    writeReviewSchema,
} = require('./order.validator');

// ===== PUBLIC ENDPOINTS (No Auth) =====

/**
 * GET /api/v1/orders/track/:order_code
 * Public order tracking (no authentication required)
 * 
 * ✅ No authentication needed
 * ✅ Returns minimal tracking info (status, timeline, shipment)
 * ✅ Specific route BEFORE /:orderId
 * 
 * Path params:
 * - order_code (format: ORD-YYYYMMDD-XXXXX)
 * 
 * Response: Tracking DTO (minimal info for public)
 * {
 *   order_code,
 *   status,
 *   status_label,
 *   timeline: [...],
 *   shipment: { carrier, tracking_code, tracking_url },
 *   estimated_delivery
 * }
 * 
 * Error cases:
 * - ORDER_NOT_FOUND: Invalid order code
 */
const trackOrder = asyncHandler(async (req, res) => {
    const { order_code } = getOrderByCodeSchema.parse({
        order_code: req.params.order_code,
    });

    const trackingData = await OrderService.getOrderByCode(order_code);

    res.status(200).json({
        success: true,
        data: trackingData,
    });
});

// ===== CUSTOMER ENDPOINTS (Authenticated) =====

/**
 * POST /api/v1/orders
 * Create order from cart (checkout)
 * 
 * ✅ Authentication required
 * ✅ CRITICAL: Stock deduction happens here (ATOMIC)
 * ✅ Cart is deleted after order creation
 * 
 * Body:
 * - cart_id (required, ObjectId)
 * - address_snapshot (required)
 *   - street, district, city (required)
 *   - phone (required, Vietnamese format)
 *   - recipient_name (required)
 *   - postal_code (optional)
 * - payment_method (required: COD|VNPAY|MOMO|CARD)
 * - customer_notes (optional, max 500 chars)
 * - shipping_fee (optional, default 0)
 * - currency (optional, default VND)
 * 
 * Response: Created order DTO
 * 
 * Error cases:
 * - CART_NOT_FOUND: Cart doesn't exist or not ACTIVE
 * - EMPTY_CART: Cart has no items
 * - MISSING_ADDRESS: Address snapshot required
 * - INSUFFICIENT_STOCK: Item out of stock
 */
const createOrder = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);

    // req.body already validated by validate middleware
    const orderData = createOrderSchema.parse(req.body);

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

/**
 * GET /api/v1/orders
 * Get current user's orders (paginated + filtered)
 * 
 * ✅ Authentication required
 * ✅ Returns customer-friendly view (hide admin data)
 * 
 * Query params:
 * - page (optional, default 1)
 * - limit (optional, default 20, max 100)
 * - status (optional, comma-separated: PENDING,PAID,SHIPPED,DELIVERED)
 * - payment_status (optional: PENDING|PAID|FAILED|REFUNDED)
 * - date_from (optional, ISO date)
 * - date_to (optional, ISO date)
 * 
 * Response: Paginated order list
 * {
 *   success: true,
 *   data: [...],
 *   pagination: { page, limit, total, totalPages }
 * }
 * 
 * Example: /api/v1/orders?status=DELIVERED,SHIPPED&limit=10
 */
const getOrders = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    const filters = getOrdersSchema.parse(req.query);

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

/**
 * GET /api/v1/orders/:order_id
 * Get order detail (customer view)
 * 
 * ✅ Authentication required
 * ✅ Specific route BEFORE wildcard routes
 * ✅ Customer can only see their own order
 * ✅ Returns full details + fulfillment tracking
 * 
 * Path params:
 * - order_id (MongoDB ObjectId)
 * 
 * Response: Order detail DTO (customer-friendly)
 * - Hides: admin notes, soft delete info, internal IDs
 * - Includes: fulfillment status, shipment tracking
 * 
 * Error cases:
 * - ORDER_NOT_FOUND: Order doesn't exist
 * - UNAUTHORIZED: Order belongs to different user
 */
const getOrderDetail = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    validateObjectId(req.params.order_id);

    const order = await OrderService.getOrderById(req.params.order_id);

    // ✅ Verify user owns this order
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

/**
 * POST /api/v1/orders/:order_id/cancel
 * Cancel order (customer action)
 * 
 * ✅ Authentication required
 * ✅ Can only cancel PENDING or PAID orders
 * ✅ CRITICAL: Restores stock if payment taken
 * ✅ If PAID: Must refund (separate PaymentService call)
 * 
 * Path params:
 * - order_id (MongoDB ObjectId)
 * 
 * Body:
 * - reason (required, 1-500 chars)
 * 
 * Response: Cancelled order DTO
 * 
 * Error cases:
 * - ORDER_NOT_FOUND: Order doesn't exist
 * - CANNOT_CANCEL_ORDER: Order already shipped/delivered
 * - UNAUTHORIZED: Order belongs to different user
 */
const cancelOrder = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    validateObjectId(req.params.order_id);

    const { reason } = cancelOrderSchema.parse(req.body);

    // ✅ Verify user owns this order
    const order = await OrderService.getOrderById(req.params.order_id);
    if (order.user_id !== user.userId) {
        throw new AppError(
            'You do not have permission to cancel this order',
            403,
            'UNAUTHORIZED'
        );
    }

    const cancelledOrder = await OrderService.cancelOrder(
        req.params.order_id,
        reason,
        user.userId
    );

    // ✅ TODO: If payment taken, call PaymentService.refund()
    // This should happen in a separate transaction

    res.status(200).json({
        success: true,
        data: cancelledOrder,
        message: 'Order cancelled successfully',
    });
});

/**
 * POST /api/v1/orders/:order_id/review
 * Write review for order item (customer action)
 * 
 * ✅ Authentication required
 * ✅ Can only review DELIVERED orders
 * ✅ One review per item
 * 
 * Path params:
 * - order_id (MongoDB ObjectId)
 * 
 * Body:
 * - item_id (required, ObjectId of item in order)
 * - rating (required, 1-5 stars)
 * - comment (optional, max 500 chars)
 * 
 * Response: Updated order DTO
 * 
 * Error cases:
 * - ORDER_NOT_FOUND: Order doesn't exist
 * - ORDER_NOT_DELIVERED: Can only review delivered orders
 * - ITEM_NOT_FOUND: Item not in order
 * - UNAUTHORIZED: Order belongs to different user
 */
const writeReview = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    validateObjectId(req.params.order_id);

    const { item_id, rating, comment } = writeReviewSchema.parse(req.body);

    // ✅ Verify user owns this order
    const order = await OrderService.getOrderById(req.params.order_id);
    if (order.user_id !== user.userId) {
        throw new AppError(
            'You do not have permission to review this order',
            403,
            'UNAUTHORIZED'
        );
    }

    const updatedOrder = await OrderService.writeReview(
        req.params.order_id,
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

/**
 * PATCH /api/v1/orders/:order_id/status
 * Update order status (admin action)
 * 
 * ✅ Authentication required (ADMIN only)
 * ✅ Enforces status transition rules
 * ✅ Adds to status history with admin info
 * 
 * Path params:
 * - order_id (MongoDB ObjectId)
 * 
 * Body:
 * - status (required: PENDING|PAID|PROCESSING|SHIPPED|DELIVERED|FAILED|CANCELED)
 * - note (optional, max 500 chars, why the transition)
 * 
 * Response: Updated order DTO
 * 
 * Error cases:
 * - ORDER_NOT_FOUND: Order doesn't exist
 * - INVALID_ORDER_STATUS: Cannot transition to this status
 * - INVALID_STATUS: Unknown status value
 */
const updateOrderStatus = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    assertRole(user, ['ADMIN']);
    validateObjectId(req.params.order_id);

    const { status, note } = updateOrderStatusSchema.parse(req.body);

    const updatedOrder = await OrderService.updateOrderStatus(
        req.params.order_id,
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

/**
 * PATCH /api/v1/orders/:order_id/admin
 * Update order details (admin action)
 * 
 * ✅ Authentication required (ADMIN only)
 * ✅ Can update: status, admin_notes
 * 
 * Path params:
 * - order_id (MongoDB ObjectId)
 * 
 * Body:
 * - status (optional, new status)
 * - admin_notes (optional, internal notes, max 1000 chars)
 * 
 * Response: Updated order DTO
 */
const adminUpdateOrder = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    assertRole(user, ['ADMIN']);
    validateObjectId(req.params.order_id);

    const updateData = adminUpdateOrderSchema.parse(req.body);

    let updatedOrder;

    // ✅ Update status if provided
    if (updateData.status) {
        updatedOrder = await OrderService.updateOrderStatus(
            req.params.order_id,
            updateData.status,
            user.userId,
            'Admin update'
        );
    }

    // ✅ Update admin notes if provided
    if (updateData.admin_notes) {
        updatedOrder = await OrderService.updateAdminNotes(
            req.params.order_id,
            updateData.admin_notes
        );
    }

    // ✅ If nothing updated, fetch current order
    if (!updatedOrder) {
        updatedOrder = await OrderService.getOrderById(req.params.order_id);
    }

    res.status(200).json({
        success: true,
        data: updatedOrder,
        message: 'Order updated successfully',
    });
});

/**
 * POST /api/v1/orders/:order_id/fulfill
 * Fulfill order items (warehouse action)
 * 
 * ✅ Authentication required (ADMIN only)
 * ✅ CRITICAL: Moves stock from reserved → sold (ATOMIC)
 * ✅ Only for PROCESSING orders
 * 
 * Path params:
 * - order_id (MongoDB ObjectId)
 * 
 * Body:
 * - item_id (required, ObjectId of item to fulfill)
 * - quantity_fulfilled (required, number of packs to mark as fulfilled)
 * 
 * Response: Updated order DTO with fulfillment tracking
 * 
 * Error cases:
 * - ORDER_NOT_FOUND: Order doesn't exist
 * - INVALID_ORDER_STATUS: Only PROCESSING orders can be fulfilled
 * - ITEM_NOT_FOUND: Item not in order
 * - FULFILLMENT_EXCEEDED: Cannot fulfill more than ordered
 * - RESERVED_STOCK_MISMATCH: Inventory inconsistency
 */
const fulfillItems = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    assertRole(user, ['ADMIN']);
    validateObjectId(req.params.order_id);

    const { item_id, quantity_fulfilled } = fulfillItemsSchema.parse(
        req.body
    );

    const updatedOrder = await OrderService.fulfillItems(
        req.params.order_id,
        item_id,
        quantity_fulfilled
    );

    res.status(200).json({
        success: true,
        data: updatedOrder,
        message: 'Items fulfilled successfully',
    });
});

/**
 * POST /api/v1/orders/:order_id/shipment
 * Record shipment details (warehouse/fulfillment action)
 * 
 * ✅ Authentication required (ADMIN only)
 * ✅ Transitions: PROCESSING → SHIPPED
 * ✅ Records carrier + tracking code
 * 
 * Path params:
 * - order_id (MongoDB ObjectId)
 * 
 * Body:
 * - carrier (required, e.g., "GHN", "GRAB", "VIETTEL")
 * - tracking_code (required, courier's tracking number)
 * 
 * Response: Updated order DTO with shipment info
 * 
 * Error cases:
 * - ORDER_NOT_FOUND: Order doesn't exist
 * - INVALID_ORDER_STATUS: Only PROCESSING orders can be shipped
 * - MISSING_SHIPMENT_INFO: Carrier or tracking code missing
 */
const recordShipment = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    assertRole(user, ['ADMIN']);
    validateObjectId(req.params.order_id);

    const { carrier, tracking_code } = recordShipmentSchema.parse(req.body);

    const updatedOrder = await OrderService.recordShipment(
        req.params.order_id,
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

/**
 * POST /api/v1/orders/:order_id/deliver
 * Confirm delivery (system/tracking action)
 * 
 * ✅ Authentication required (ADMIN only)
 * ✅ Transitions: SHIPPED → DELIVERED
 * ✅ Usually triggered by tracking system or manual confirmation
 * 
 * Path params:
 * - order_id (MongoDB ObjectId)
 * 
 * Response: Updated order DTO
 * 
 * Error cases:
 * - ORDER_NOT_FOUND: Order doesn't exist
 * - INVALID_ORDER_STATUS: Only SHIPPED orders can be marked as delivered
 */
const confirmDelivery = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    assertRole(user, ['ADMIN']);
    validateObjectId(req.params.order_id);

    const updatedOrder = await OrderService.confirmDelivery(
        req.params.order_id
    );

    res.status(200).json({
        success: true,
        data: updatedOrder,
        message: 'Order marked as delivered',
    });
});

/**
 * GET /api/v1/admin/orders
 * Get all orders (admin dashboard)
 * 
 * ✅ Authentication required (ADMIN only)
 * ✅ Full transparency (shows admin notes, soft deletes, etc)
 * ✅ Can filter by multiple criteria
 * 
 * Query params:
 * - page (optional, default 1)
 * - limit (optional, default 20, max 100)
 * - status (optional, comma-separated)
 * - payment_status (optional)
 * - user_id (optional, filter by customer)
 * - date_from (optional, ISO date)
 * - date_to (optional, ISO date)
 * - sortBy (optional: created_at|status|total_amount, default created_at)
 * 
 * Response: Paginated order list with admin DTOs
 */
const getAllOrders = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    assertRole(user, ['ADMIN']);

    const filters = getOrdersSchema.parse(req.query);

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

/**
 * GET /api/v1/admin/orders/stats
 * Get order statistics (dashboard analytics)
 * 
 * ✅ Authentication required (ADMIN only)
 * 
 * Response: Order stats
 * {
 *   totalOrders: number,
 *   totalRevenue: number,
 *   statusBreakdown: { PENDING: 5, PAID: 10, DELIVERED: 45, ... },
 *   paymentBreakdown: { PENDING: 5, PAID: 50, FAILED: 2, ... }
 * }
 */
const getOrderStats = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    assertRole(user, ['ADMIN']);

    const stats = await OrderService.getOrderStats();

    res.status(200).json({
        success: true,
        data: stats,
    });
});

/**
 * GET /api/v1/admin/orders/:order_id
 * Get order detail (admin view)
 * 
 * ✅ Authentication required (ADMIN only)
 * ✅ Full transparency (shows all internal data)
 * 
 * Path params:
 * - order_id (MongoDB ObjectId)
 * 
 * Response: Complete order DTO (admin view)
 */
const getAdminOrderDetail = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    assertRole(user, ['ADMIN']);
    validateObjectId(req.params.order_id);

    const order = await OrderService.getOrderById(req.params.order_id);

    // ✅ Return admin DTO (full transparency)
    const adminDTO = OrderMapper.toAdminDTO(order);

    res.status(200).json({
        success: true,
        data: adminDTO,
    });
});

module.exports = {
    // Public endpoints
    trackOrder,

    // Customer endpoints
    createOrder,
    getOrders,
    getOrderDetail,
    cancelOrder,
    writeReview,

    // Admin endpoints
    updateOrderStatus,
    adminUpdateOrder,
    fulfillItems,
    recordShipment,
    confirmDelivery,
    getAllOrders,
    getOrderStats,
    getAdminOrderDetail,
};