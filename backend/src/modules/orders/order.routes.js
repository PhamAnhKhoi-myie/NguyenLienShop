const express = require('express');
const validate = require('../../../middlewares/validate.middleware');
const authenticate = require('../../../middlewares/auth.middleware');
const OrderController = require('../order.controller');
const {
    createOrderSchema,
    getOrdersSchema,
    updateOrderStatusSchema,
    fulfillItemsSchema,
    recordShipmentSchema,
    cancelOrderSchema,
    getOrderByCodeSchema,
    getOrderByIdSchema,
    adminUpdateOrderSchema,
    writeReviewSchema,
} = require('../order.validator');

const router = express.Router();

/**
 * ============================================
 * ROUTE PARAMETER ORDERING (Critical!)
 * ============================================
 * 
 * ✅ RULE: Specific routes MUST come BEFORE dynamic routes
 * 
 * Order:
 * 1. Public endpoints (no auth)
 * 2. Customer endpoints (with auth)
 * 3. Specific customer actions (cancel, review)
 * 4. Admin endpoints
 * 5. Dynamic route /:order_id (LAST!)
 * 
 * Example of WRONG ordering:
 * ❌ router.get('/:order_id', ...);  // ← Catches /track too!
 * ❌ router.get('/track/:order_code', ...);  // ← Never reached!
 * 
 * Example of CORRECT ordering:
 * ✅ router.get('/track/:order_code', ...);  // ← Specific: first
 * ✅ router.get('/:order_id', ...);  // ← Dynamic: last
 */

// ===== PUBLIC ENDPOINTS (No Authentication) =====

/**
 * GET /api/v1/orders/track/:order_code
 * Public order tracking page (no auth required)
 * 
 * ✅ SPECIFIC ROUTE - MUST come BEFORE /:order_id
 * 
 * Path params:
 * - order_code (required, format: ORD-YYYYMMDD-XXXXX)
 * 
 * Response: Tracking DTO
 * - Minimal info (status, timeline, shipment tracking)
 * - No customer sensitive data
 * - Public tracking link safe to share
 * 
 * Examples:
 * - GET /api/v1/orders/track/ORD-20240415-ABC12
 */
router.get(
    '/track/:order_code',
    validate({ params: getOrderByCodeSchema }),
    OrderController.trackOrder
);

// ===== CUSTOMER ENDPOINTS (Authenticated) =====

/**
 * POST /api/v1/orders
 * Create order from checkout (checkout → order creation)
 * 
 * ✅ Authentication required
 * ✅ CRITICAL: Stock deduction happens here (ATOMIC transaction)
 * ✅ Cart is deleted after successful order creation
 * 
 * Request body:
 * - cart_id (required, ObjectId of user's cart)
 * - address_snapshot (required object)
 *   - street, district, city (required)
 *   - phone (required, Vietnamese format: 10-11 digits)
 *   - recipient_name (required)
 *   - postal_code (optional)
 *   - country (optional, default: Vietnam)
 * - payment_method (required: COD|VNPAY|MOMO|CARD)
 * - customer_notes (optional, max 500 chars)
 * - shipping_fee (optional, default: 0)
 * - currency (optional, default: VND)
 * 
 * Response: Created order DTO
 * {
 *   id,
 *   order_code,
 *   status: "PENDING",
 *   items: [...],
 *   pricing: { subtotal, shipping_fee, discount_amount, total_amount },
 *   payment: { method: "COD", status: "PENDING", ... },
 *   created_at
 * }
 * 
 * Error cases:
 * - 400 INVALID_INPUT: Missing required fields
 * - 404 CART_NOT_FOUND: Cart doesn't exist
 * - 400 EMPTY_CART: Cart has no items
 * - 409 INSUFFICIENT_STOCK: Item out of stock
 * - 409 PRICING_MISMATCH: Cart total doesn't match request
 * 
 * Example:
 * POST /api/v1/orders
 * {
 *   "cart_id": "507f1f77bcf86cd799439011",
 *   "address_snapshot": {
 *     "street": "123 Đường Lê Lợi",
 *     "district": "Quận 1",
 *     "city": "TP. Hồ Chí Minh",
 *     "phone": "0901234567",
 *     "recipient_name": "Nguyễn Văn A"
 *   },
 *   "payment_method": "COD",
 *   "customer_notes": "Giao buổi sáng nếu được"
 * }
 */
router.post(
    '/',
    authenticate(),
    validate({ body: createOrderSchema }),
    OrderController.createOrder
);

/**
 * GET /api/v1/orders
 * Get current user's orders (order history with pagination)
 * 
 * ✅ Authentication required
 * ✅ Returns customer-friendly view (hides admin data)
 * ✅ Supports filtering and sorting
 * 
 * Query params (all optional):
 * - page (default: 1, min: 1)
 * - limit (default: 20, max: 100, min: 1)
 * - status (optional, comma-separated)
 *   - Example: ?status=DELIVERED,SHIPPED
 *   - Valid values: PENDING|PAID|PROCESSING|SHIPPED|DELIVERED|FAILED|CANCELED
 * - payment_status (optional)
 *   - Valid values: PENDING|PAID|FAILED|REFUNDED
 * - date_from (optional, ISO date format)
 * - date_to (optional, ISO date format)
 * 
 * Response: Paginated order list
 * {
 *   success: true,
 *   data: [
 *     {
 *       id,
 *       order_code,
 *       item_count,
 *       total_items,
 *       total_amount,
 *       status,
 *       payment_status,
 *       created_at,
 *       delivered_at
 *     },
 *     ...
 *   ],
 *   pagination: {
 *     page: 1,
 *     limit: 20,
 *     total: 45,
 *     totalPages: 3
 *   }
 * }
 * 
 * Examples:
 * - GET /api/v1/orders
 * - GET /api/v1/orders?page=2&limit=10
 * - GET /api/v1/orders?status=DELIVERED,SHIPPED
 * - GET /api/v1/orders?status=PENDING&date_from=2024-01-01
 */
router.get(
    '/',
    authenticate(),
    validate({ query: getOrdersSchema }),
    OrderController.getOrders
);

/**
 * ✅ SPECIFIC ROUTE - MUST come BEFORE /:order_id
 * 
 * POST /api/v1/orders/:order_id/cancel
 * Cancel order (customer self-service cancellation)
 * 
 * ✅ Authentication required
 * ✅ Customer can only cancel their own order
 * ✅ Can only cancel PENDING or PAID orders (not shipped)
 * ✅ CRITICAL: Restores stock if reservation exists
 * ✅ If PAID: Admin must process refund separately
 * 
 * Path params:
 * - order_id (required, MongoDB ObjectId)
 * 
 * Request body:
 * - reason (required, 1-500 chars, cancellation reason)
 * 
 * Response: Cancelled order DTO
 * - Status updated to CANCELED
 * - Status history shows cancellation
 * 
 * Error cases:
 * - 404 ORDER_NOT_FOUND: Order doesn't exist
 * - 403 UNAUTHORIZED: Order belongs to different user
 * - 409 CANNOT_CANCEL_ORDER: Order already shipped/delivered
 * 
 * Example:
 * POST /api/v1/orders/507f1f77bcf86cd799439011/cancel
 * {
 *   "reason": "Mình đặt nhầm size, xin hủy đơn"
 * }
 */
router.post(
    '/:order_id/cancel',
    authenticate(),
    validate({
        params: getOrderByIdSchema,
        body: cancelOrderSchema,
    }),
    OrderController.cancelOrder
);

/**
 * ✅ SPECIFIC ROUTE - MUST come BEFORE /:order_id
 * 
 * POST /api/v1/orders/:order_id/review
 * Write review for order item (customer review)
 * 
 * ✅ Authentication required
 * ✅ Can only review DELIVERED orders
 * ✅ Customer can only review their own order items
 * 
 * Path params:
 * - order_id (required, MongoDB ObjectId)
 * 
 * Request body:
 * - item_id (required, MongoDB ObjectId of item in order)
 * - rating (required, integer 1-5)
 * - comment (optional, max 500 chars)
 * 
 * Response: Updated order DTO
 * - Item marked as reviewed
 * 
 * Error cases:
 * - 404 ORDER_NOT_FOUND: Order doesn't exist
 * - 403 UNAUTHORIZED: Order belongs to different user
 * - 409 ORDER_NOT_DELIVERED: Can only review delivered orders
 * - 404 ITEM_NOT_FOUND: Item not in order
 * 
 * Example:
 * POST /api/v1/orders/507f1f77bcf86cd799439011/review
 * {
 *   "item_id": "507f1f77bcf86cd799439012",
 *   "rating": 5,
 *   "comment": "Sản phẩm chất lượng, giao hàng nhanh"
 * }
 */
router.post(
    '/:order_id/review',
    authenticate(),
    validate({
        params: getOrderByIdSchema,
        body: writeReviewSchema,
    }),
    OrderController.writeReview
);

/**
 * ✅ DYNAMIC ROUTE - MUST come BEFORE other :order_id routes BUT AFTER specific ones
 * 
 * GET /api/v1/orders/:order_id
 * Get order detail (customer view)
 * 
 * ✅ Authentication required
 * ✅ Customer can only see their own order
 * ✅ Returns full details with fulfillment status
 * 
 * Path params:
 * - order_id (required, MongoDB ObjectId)
 * 
 * Response: Order detail DTO (customer-friendly)
 * {
 *   id,
 *   order_code,
 *   status,
 *   items: [...full item details...],
 *   pricing: {...},
 *   shipment: { carrier, tracking_code, shipped_at, delivered_at },
 *   fulfillment: { total_ordered, total_fulfilled, pending_items },
 *   created_at,
 *   updated_at
 * }
 * 
 * Hidden fields (not returned to customer):
 * - admin_notes
 * - is_deleted
 * - deleted_at
 * 
 * Error cases:
 * - 404 ORDER_NOT_FOUND: Order doesn't exist
 * - 403 UNAUTHORIZED: Order belongs to different user
 * 
 * Example:
 * GET /api/v1/orders/507f1f77bcf86cd799439011
 */
router.get(
    '/:order_id',
    authenticate(),
    validate({ params: getOrderByIdSchema }),
    OrderController.getOrderDetail
);

// ===== ADMIN ENDPOINTS (Authenticated + Role-Based) =====

/**
 * ✅ ADMIN SPECIFIC ROUTE - MUST come BEFORE /admin/:order_id
 * 
 * GET /api/v1/admin/orders
 * Get all orders (admin dashboard)
 * 
 * ✅ Authentication required
 * ✅ Authorization: ADMIN role only
 * ✅ Full transparency (shows all fields including admin notes)
 * ✅ Supports extensive filtering and pagination
 * 
 * Query params (all optional):
 * - page (default: 1)
 * - limit (default: 20, max: 100)
 * - status (optional, comma-separated)
 * - payment_status (optional)
 * - user_id (optional, filter by customer)
 * - date_from (optional, ISO date)
 * - date_to (optional, ISO date)
 * 
 * Response: Paginated list with admin DTOs
 * {
 *   success: true,
 *   data: [
 *     {
 *       id,
 *       order_code,
 *       user_id,
 *       status,
 *       payment_status,
 *       total_amount,
 *       items: [...],
 *       admin_notes,
 *       created_at
 *     },
 *     ...
 *   ],
 *   pagination: {...}
 * }
 * 
 * Example:
 * GET /api/v1/admin/orders?status=PROCESSING&payment_status=PAID&limit=50
 */
router.get(
    '/admin/orders',
    authenticate(),
    validate({ query: getOrdersSchema }),
    OrderController.getAllOrders
);

/**
 * ✅ ADMIN SPECIFIC ROUTE - MUST come BEFORE /:order_id
 * 
 * GET /api/v1/admin/orders/stats
 * Get order statistics (dashboard analytics)
 * 
 * ✅ Authentication required
 * ✅ Authorization: ADMIN role only
 * 
 * Response: Order statistics
 * {
 *   success: true,
 *   data: {
 *     totalOrders: 1250,
 *     totalRevenue: 125000000,
 *     statusBreakdown: {
 *       PENDING: 12,
 *       PAID: 150,
 *       PROCESSING: 45,
 *       SHIPPED: 120,
 *       DELIVERED: 920,
 *       FAILED: 3
 *     },
 *     paymentBreakdown: {
 *       PENDING: 12,
 *       PAID: 1230,
 *       FAILED: 8
 *     }
 *   }
 * }
 * 
 * Example:
 * GET /api/v1/admin/orders/stats
 */
router.get(
    '/admin/orders/stats',
    authenticate(),
    OrderController.getOrderStats
);

/**
 * ✅ ADMIN SPECIFIC ROUTE - MUST come BEFORE /:order_id
 * 
 * PATCH /api/v1/admin/orders/:order_id/status
 * Update order status (admin action)
 * 
 * ✅ Authentication required
 * ✅ Authorization: ADMIN role only
 * ✅ Enforces status transition rules
 * ✅ Adds to status history with admin details
 * 
 * Path params:
 * - order_id (required, MongoDB ObjectId)
 * 
 * Request body:
 * - status (required)
 *   - Valid values: PENDING|PAID|PROCESSING|SHIPPED|DELIVERED|FAILED|CANCELED
 * - note (optional, max 500 chars, reason for transition)
 * 
 * Response: Updated order DTO
 * 
 * Error cases:
 * - 404 ORDER_NOT_FOUND: Order doesn't exist
 * - 400 INVALID_STATUS: Unknown status value
 * - 409 INVALID_ORDER_STATUS: Invalid transition
 * 
 * Example:
 * PATCH /api/v1/admin/orders/507f1f77bcf86cd799439011/status
 * {
 *   "status": "PROCESSING",
 *   "note": "Sent to warehouse for fulfillment"
 * }
 */
router.patch(
    '/admin/orders/:order_id/status',
    authenticate(),
    validate({
        params: getOrderByIdSchema,
        body: updateOrderStatusSchema,
    }),
    OrderController.updateOrderStatus
);

/**
 * ✅ ADMIN SPECIFIC ROUTE - MUST come BEFORE /:order_id
 * 
 * PATCH /api/v1/admin/orders/:order_id
 * Update order details (admin action)
 * 
 * ✅ Authentication required
 * ✅ Authorization: ADMIN role only
 * ✅ Can update: status, admin_notes
 * 
 * Path params:
 * - order_id (required, MongoDB ObjectId)
 * 
 * Request body:
 * - status (optional, new status)
 * - admin_notes (optional, max 1000 chars, internal notes)
 * 
 * Response: Updated order DTO
 * 
 * Example:
 * PATCH /api/v1/admin/orders/507f1f77bcf86cd799439011
 * {
 *   "admin_notes": "Customer requested priority shipping"
 * }
 */
router.patch(
    '/admin/orders/:order_id',
    authenticate(),
    validate({
        params: getOrderByIdSchema,
        body: adminUpdateOrderSchema,
    }),
    OrderController.adminUpdateOrder
);

/**
 * ✅ ADMIN SPECIFIC ROUTE - MUST come BEFORE /:order_id
 * 
 * POST /api/v1/admin/orders/:order_id/fulfill
 * Fulfill order items (warehouse action)
 * 
 * ✅ Authentication required
 * ✅ Authorization: ADMIN role only
 * ✅ CRITICAL: Moves stock from reserved → sold (ATOMIC)
 * ✅ Only for PROCESSING orders
 * 
 * Path params:
 * - order_id (required, MongoDB ObjectId)
 * 
 * Request body:
 * - item_id (required, ObjectId of item to fulfill)
 * - quantity_fulfilled (required, positive integer, number of packs)
 * 
 * Response: Updated order DTO with fulfillment tracking
 * 
 * Error cases:
 * - 404 ORDER_NOT_FOUND: Order doesn't exist
 * - 409 INVALID_ORDER_STATUS: Only PROCESSING orders
 * - 404 ITEM_NOT_FOUND: Item not in order
 * - 409 FULFILLMENT_EXCEEDED: Cannot fulfill more than ordered
 * - 409 RESERVED_STOCK_MISMATCH: Inventory inconsistency
 * 
 * Example:
 * POST /api/v1/admin/orders/507f1f77bcf86cd799439011/fulfill
 * {
 *   "item_id": "507f1f77bcf86cd799439012",
 *   "quantity_fulfilled": 10
 * }
 */
router.post(
    '/admin/orders/:order_id/fulfill',
    authenticate(),
    validate({
        params: getOrderByIdSchema,
        body: fulfillItemsSchema,
    }),
    OrderController.fulfillItems
);

/**
 * ✅ ADMIN SPECIFIC ROUTE - MUST come BEFORE /:order_id
 * 
 * POST /api/v1/admin/orders/:order_id/shipment
 * Record shipment details (warehouse/fulfillment action)
 * 
 * ✅ Authentication required
 * ✅ Authorization: ADMIN role only
 * ✅ Transitions: PROCESSING → SHIPPED
 * ✅ Records carrier + tracking code for customer
 * 
 * Path params:
 * - order_id (required, MongoDB ObjectId)
 * 
 * Request body:
 * - carrier (required, max 50 chars)
 *   - Examples: GHN, GRAB, VIETTEL, DHL, FedEx
 * - tracking_code (required, max 100 chars, courier's tracking number)
 * 
 * Response: Updated order DTO with shipment info
 * {
 *   shipment: {
 *     carrier: "GHN",
 *     tracking_code: "1234567890",
 *     shipped_at: "2024-04-15T10:30:00Z"
 *   },
 *   status: "SHIPPED"
 * }
 * 
 * Error cases:
 * - 404 ORDER_NOT_FOUND: Order doesn't exist
 * - 409 INVALID_ORDER_STATUS: Only PROCESSING orders can be shipped
 * - 400 MISSING_SHIPMENT_INFO: Carrier or tracking code missing
 * 
 * Example:
 * POST /api/v1/admin/orders/507f1f77bcf86cd799439011/shipment
 * {
 *   "carrier": "GHN",
 *   "tracking_code": "100123456789"
 * }
 */
router.post(
    '/admin/orders/:order_id/shipment',
    authenticate(),
    validate({
        params: getOrderByIdSchema,
        body: recordShipmentSchema,
    }),
    OrderController.recordShipment
);

/**
 * ✅ ADMIN SPECIFIC ROUTE - MUST come BEFORE /:order_id
 * 
 * POST /api/v1/admin/orders/:order_id/deliver
 * Confirm delivery (system/tracking action)
 * 
 * ✅ Authentication required
 * ✅ Authorization: ADMIN role only
 * ✅ Transitions: SHIPPED → DELIVERED
 * ✅ Usually triggered by tracking system or manual confirmation
 * 
 * Path params:
 * - order_id (required, MongoDB ObjectId)
 * 
 * Response: Updated order DTO
 * 
 * Error cases:
 * - 404 ORDER_NOT_FOUND: Order doesn't exist
 * - 409 INVALID_ORDER_STATUS: Only SHIPPED orders can be marked delivered
 * 
 * Example:
 * POST /api/v1/admin/orders/507f1f77bcf86cd799439011/deliver
 */
router.post(
    '/admin/orders/:order_id/deliver',
    authenticate(),
    validate({ params: getOrderByIdSchema }),
    OrderController.confirmDelivery
);

/**
 * ✅ ADMIN SPECIFIC ROUTE - MUST come BEFORE /:order_id
 * 
 * GET /api/v1/admin/orders/:order_id
 * Get order detail (admin view)
 * 
 * ✅ Authentication required
 * ✅ Authorization: ADMIN role only
 * ✅ Full transparency (shows all internal data)
 * 
 * Path params:
 * - order_id (required, MongoDB ObjectId)
 * 
 * Response: Complete order DTO (admin view)
 * - Shows: admin notes, soft delete status, internal IDs
 * - Shows: full status history with admin details
 * 
 * Example:
 * GET /api/v1/admin/orders/507f1f77bcf86cd799439011
 */
router.get(
    '/admin/orders/:order_id',
    authenticate(),
    validate({ params: getOrderByIdSchema }),
    OrderController.getAdminOrderDetail
);

module.exports = router;