const mongoose = require('mongoose');
const Order = require('./order.model');
const OrderMapper = require('./order.mapper');
const AppError = require('../../utils/appError.util');

// Import dependencies
const Variant = require('../products/variant.model');
const Cart = require('../carts/cart.model');
const EmailJob = require('../emails/email.model');
const User = require('../users/user.model');

/**
 * ============================================
 * ORDER SERVICE
 * ============================================
 * 
 * ✅ Static class pattern (consistent with other services)
 * ✅ Business logic layer: validation, stock checks, pricing
 * ✅ Delegates to model for DB operations
 * ✅ Returns DTOs via mapper (never raw MongoDB docs)
 * ✅ Uses asyncHandler in controller (no try/catch here)
 * 
 * CRITICAL RULES:
 * - Order is immutable snapshot (no price updates after creation)
 * - Stock deduction happens ATOMICALLY at order creation
 * - Payment failure MUST rollback stock (or inventory is lost)
 * - Status transitions are locked (only certain flows allowed)
 */

class OrderService {
    /**
     * ✅ CREATE ORDER: From checkout cart + payment method
     * 
     * CRITICAL: This is where stock deduction happens (ATOMIC)
     * 
     * Flow:
     * 1. Validate user + cart exists
     * 2. Get checkout snapshot from CartService
     * 3. Generate order code
     * 4. Build order items (with snapshots)
     * 5. ✅ ATOMIC: Deduct stock for ALL items (or rollback all)
     * 6. Create order document with status PENDING
     * 7. Delete cart (or mark CHECKED_OUT)
     * 8. Return order DTO
     * 
     * @param {String} userId - From JWT token
     * @param {String} cartId - User's cart
     * @param {Object} shippingData - { address_snapshot, customer_notes }
     * @returns {Object} Created order DTO
     */
    static async createOrderFromCart(userId, cartId, shippingData) {
        if (!userId || !cartId) {
            throw new AppError(
                'User ID and cart ID required',
                400,
                'MISSING_REQUIRED_PARAMS'
            );
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // ✅ 1. Validate user cart + get snapshot
            const cart = await Cart.findOne(
                {
                    _id: cartId,
                    user_id: userId,
                    status: { $in: ['ACTIVE', 'CHECKED_OUT'] },
                },
                null,
                { session }
            );

            if (!cart) {
                throw new AppError(
                    'Cart not found or not ready for checkout',
                    404,
                    'CART_NOT_FOUND'
                );
            }

            if (cart.items.length === 0) {
                throw new AppError(
                    'Cannot create order from empty cart',
                    400,
                    'EMPTY_CART'
                );
            }

            // ✅ 2. Validate address snapshot
            if (!shippingData.address_snapshot) {
                throw new AppError(
                    'Shipping address is required',
                    400,
                    'MISSING_ADDRESS'
                );
            }

            // ✅ 3. Generate order code
            const orderCode = await Order.generateOrderCode();

            // ✅ 4. Build order items with snapshots
            const orderItems = cart.items.map((cartItem) => ({
                _id: new mongoose.Types.ObjectId(),
                product_id: cartItem.product_id,
                variant_id: cartItem.variant_id,
                unit_id: cartItem.unit_id,

                // Snapshots (immutable at order time)
                product_name: cartItem.product_name,
                product_image: cartItem.product_image,
                variant_label: cartItem.variant_label,
                sku: cartItem.sku,
                unit_label: cartItem.display_name,
                pack_size: cartItem.pack_size,

                // Quantity tracking
                quantity_ordered: cartItem.quantity,
                quantity_fulfilled: 0,

                // Pricing snapshots (immutable)
                unit_price: cartItem.price_at_added,
                line_total: cartItem.quantity * cartItem.price_at_added,

                review_status: 'pending',
            }));

            // ✅ 5. Calculate pricing
            const subtotal = orderItems.reduce(
                (sum, item) => sum + item.line_total,
                0
            );

            const discountAmount = Math.min(
                cart.discount?.discount_amount || 0,
                subtotal
            );

            const shippingFee = shippingData.shipping_fee || 0;

            const totalAmount = subtotal - discountAmount + shippingFee;

            // ✅ 6. CRITICAL: Deduct stock ATOMICALLY for all items
            // If ANY item fails, entire transaction rolls back
            for (const item of orderItems) {
                const qtyItems = item.quantity_ordered * item.pack_size;

                const result = await Variant.updateOne(
                    {
                        _id: item.variant_id,
                        'stock.available': { $gte: qtyItems }, // ← MANDATORY condition
                    },
                    {
                        $inc: {
                            'stock.available': -qtyItems,
                            'stock.reserved': +qtyItems,
                        },
                    },
                    { session }
                );

                // If stock update failed, throw error (transaction will rollback)
                if (result.modifiedCount === 0) {
                    throw new AppError(
                        `Insufficient stock for ${item.product_name}`,
                        409,
                        'INSUFFICIENT_STOCK'
                    );
                }
            }

            // ✅ 7. Create order document
            const order = new Order({
                order_code: orderCode,
                user_id: userId,

                address_snapshot: shippingData.address_snapshot,
                items: orderItems,

                pricing: {
                    subtotal,
                    shipping_fee: shippingFee,
                    discount_amount: discountAmount,
                    total_amount: totalAmount,
                },

                currency: shippingData.currency || 'VND',

                discount: cart.discount
                    ? {
                        code: cart.discount.code,
                        type: cart.discount.type,
                        value: cart.discount.value,
                        scope: cart.discount.apply_scope || 'ORDER',
                        applied_amount: discountAmount,
                    }
                    : null,

                payment: {
                    method: shippingData.payment_method || 'COD',
                    status: 'PENDING',
                },

                status: 'PENDING',
                payment_expires_at: new Date(Date.now() + 15 * 60000), // 15 min
                customer_notes: shippingData.customer_notes || null,
            });

            // Add initial status history
            order.status_history.push({
                from: null,
                to: 'PENDING',
                changed_at: new Date(),
                changed_by: null,
                note: 'Order created',
            });

            await order.save({ session });

            const user = await User.findById(userId).session(session);

            if (user && user.email) {
                await EmailJob.create([{
                    to: [user.email],
                    template: 'ORDER_CONFIRMATION',
                    payload: {
                        user_name: user.full_name || 'Khách hàng',
                        order_id: order.order_code,
                        total_amount: order.pricing.total_amount.toLocaleString('vi-VN'),
                        items: order.items.map(item => ({
                            name: item.product_name,
                            qty: item.quantity_ordered,
                            price: item.unit_price.toLocaleString('vi-VN')
                        }))
                    },
                    status: 'pending'
                }], { session });
            }

            // ✅ 8. Delete/mark cart as checked out
            await Cart.deleteOne({ _id: cartId }, { session });

            // Commit transaction (all atomic operations succeeded)
            await session.commitTransaction();

            return OrderMapper.toResponseDTO(order);
        } catch (error) {
            // Automatic rollback on any error
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * ✅ READ: Get order by ID
     * 
     * ⚠️ Customer can only see their own order
     * Admin can see all orders (enforce in controller)
     * 
     * @param {String} orderId - Order MongoDB ID
     * @returns {Object} Order detail DTO
     */
    static async getOrderById(orderId) {
        const order = await Order.findById(orderId);
        if (!order) {
            throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
        }

        return OrderMapper.toDetailDTO(order);
    }

    /**
     * ✅ READ: Get order by code (public tracking)
     * 
     * Format: ORD-YYYYMMDD-XXXXX
     * Used for public tracking page (no auth required)
     * 
     * @param {String} orderCode
     * @returns {Object} Tracking DTO (minimal info)
     */
    static async getOrderByCode(orderCode) {
        const order = await Order.findOne({ order_code: orderCode });
        if (!order) {
            throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
        }

        return OrderMapper.toTrackingDTO(order);
    }

    /**
     * ✅ READ: Get user's order history (paginated)
     * 
     * @param {String} userId
     * @param {Number} page - Default 1
     * @param {Number} limit - Default 20, max 100
     * @param {Object} filters - { status, payment_status, date_from, date_to }
     * @returns {Object} { data: [...], pagination: {...} }
     */
    static async getUserOrders(
        userId,
        page = 1,
        limit = 20,
        filters = {}
    ) {
        const skip = (page - 1) * limit;
        const query = { user_id: userId };

        // Filter by status
        if (filters.status) {
            if (Array.isArray(filters.status)) {
                query.status = { $in: filters.status };
            } else {
                query.status = filters.status;
            }
        }

        // Filter by payment status
        if (filters.payment_status) {
            query['payment.status'] = filters.payment_status;
        }

        // Filter by date range
        if (filters.date_from || filters.date_to) {
            query.created_at = {};
            if (filters.date_from) {
                query.created_at.$gte = new Date(filters.date_from);
            }
            if (filters.date_to) {
                query.created_at.$lte = new Date(filters.date_to);
            }
        }

        // Execute query
        const total = await Order.countDocuments(query);
        const orders = await Order.find(query)
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit);

        return {
            data: orders.map(OrderMapper.toListDTO),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * ✅ UPDATE: Confirm payment (webhook from payment provider)
     * 
     * Flow:
     * 1. Verify order exists + status is PENDING
     * 2. Update payment status → PAID
     * 3. Update order status → PAID
     * 4. Add status history
     * 
     * ⚠️ Called from payment webhook handler
     * Must verify webhook signature before calling
     * 
     * @param {String} orderId
     * @param {Object} paymentData - { paid_at, payment_method, ... }
     * @returns {Object} Updated order DTO
     */
    static async confirmPayment(orderId, paymentData = {}) {
        const order = await Order.findById(orderId);
        if (!order) {
            throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
        }

        if (order.status !== 'PENDING') {
            throw new AppError(
                'Can only confirm payment for PENDING orders',
                409,
                'INVALID_ORDER_STATUS'
            );
        }

        // ✅ Update payment
        order.payment.status = 'PAID';
        order.payment.paid_at = paymentData.paid_at || new Date();

        // ✅ Transition status
        order.addStatusTransition('PAID', null, 'Payment confirmed');

        await order.save();

        return OrderMapper.toResponseDTO(order);
    }

    /**
     * ✅ UPDATE: Payment failed (webhook from payment provider)
     * 
     * CRITICAL: Rollback stock (reverse the checkout deduction)
     * 
     * Flow:
     * 1. Verify order exists + status is PENDING
     * 2. ATOMIC: Restore stock for all items
     * 3. Update payment status → FAILED
     * 4. Update order status → FAILED
     * 5. Add status history
     * 
     * ⚠️ If stock restoration fails, order is in FAILED state
     * Manual intervention required (admin panel)
     * 
     * @param {String} orderId
     * @returns {Object} Updated order DTO
     */
    static async failPayment(orderId) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const order = await Order.findById(orderId).session(session);
            if (!order) {
                throw new AppError(
                    'Order not found',
                    404,
                    'ORDER_NOT_FOUND'
                );
            }

            if (order.status !== 'PENDING') {
                throw new AppError(
                    'Can only fail payment for PENDING orders',
                    409,
                    'INVALID_ORDER_STATUS'
                );
            }

            // ✅ CRITICAL: Restore stock for all items
            for (const item of order.items) {
                const qtyItems = item.quantity_ordered * item.pack_size;

                const result = await Variant.updateOne(
                    {
                        _id: item.variant_id,
                        'stock.reserved': { $gte: qtyItems }, // ← Must have reserved
                    },
                    {
                        $inc: {
                            'stock.available': +qtyItems, // Restore
                            'stock.reserved': -qtyItems, // Release
                        },
                    },
                    { session }
                );

                if (result.modifiedCount === 0) {
                    throw new AppError(
                        `Stock restoration failed for item ${item.product_name}`,
                        500,
                        'STOCK_RESTORATION_FAILED'
                    );
                }
            }

            // ✅ Update payment + status
            order.payment.status = 'FAILED';
            order.addStatusTransition(
                'FAILED',
                null,
                'Payment failed'
            );

            await order.save({ session });
            await session.commitTransaction();

            return OrderMapper.toResponseDTO(order);
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * ✅ UPDATE: Start processing (admin action)
     * 
     * Transition: PAID → PROCESSING
     * Used when order is sent to warehouse for fulfillment
     * 
     * @param {String} orderId
     * @param {String} adminUserId - Admin who triggered this
     * @returns {Object} Updated order DTO
     */
    static async startProcessing(orderId, adminUserId) {
        const order = await Order.findById(orderId);
        if (!order) {
            throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
        }

        if (order.status !== 'PAID') {
            throw new AppError(
                'Only PAID orders can be processed',
                409,
                'INVALID_ORDER_STATUS'
            );
        }

        order.addStatusTransition(
            'PROCESSING',
            adminUserId,
            'Started by admin'
        );

        await order.save();

        return OrderMapper.toResponseDTO(order);
    }

    /**
     * ✅ UPDATE: Fulfill items (warehouse action)
     * 
     * Mark items as fulfilled (quantity_fulfilled tracking)
     * When ALL items fulfilled, can trigger shipment
     * 
     * ATOMIC: Move from reserved → sold
     * 
     * @param {String} orderId
     * @param {String} itemId - Item ID within order
     * @param {Number} quantityFulfilled - Number of packs to mark as fulfilled
     * @returns {Object} Updated order DTO
     */
    static async fulfillItems(
        orderId,
        itemId,
        quantityFulfilled
    ) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const order = await Order.findById(orderId).session(session);
            if (!order) {
                throw new AppError(
                    'Order not found',
                    404,
                    'ORDER_NOT_FOUND'
                );
            }

            if (order.status !== 'PROCESSING') {
                throw new AppError(
                    'Only PROCESSING orders can be fulfilled',
                    409,
                    'INVALID_ORDER_STATUS'
                );
            }

            const item = order.items.id(itemId);
            if (!item) {
                throw new AppError(
                    'Item not found in order',
                    404,
                    'ITEM_NOT_FOUND'
                );
            }

            // ✅ Validate fulfillment amount
            if (
                item.quantity_fulfilled + quantityFulfilled >
                item.quantity_ordered
            ) {
                throw new AppError(
                    'Cannot fulfill more than ordered',
                    409,
                    'FULFILLMENT_EXCEEDED'
                );
            }

            // ✅ ATOMIC: Move inventory from reserved → sold
            const qtyItems = quantityFulfilled * item.pack_size;

            const result = await Variant.updateOne(
                {
                    _id: item.variant_id,
                    'stock.reserved': { $gte: qtyItems }, // ← Must have reserved
                },
                {
                    $inc: {
                        'stock.reserved': -qtyItems,
                        'stock.sold': +qtyItems,
                    },
                },
                { session }
            );

            if (result.modifiedCount === 0) {
                throw new AppError(
                    'Fulfillment failed: reserved stock mismatch',
                    409,
                    'RESERVED_STOCK_MISMATCH'
                );
            }

            // ✅ Update item fulfillment
            item.quantity_fulfilled += quantityFulfilled;

            await order.save({ session });
            await session.commitTransaction();

            return OrderMapper.toDetailDTO(order);
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * ✅ UPDATE: Record shipment (warehouse/fulfillment action)
     * 
     * Transition: PROCESSING → SHIPPED
     * Record carrier + tracking code
     * 
     * @param {String} orderId
     * @param {Object} shipmentData - { carrier, tracking_code }
     * @returns {Object} Updated order DTO
     */
    static async recordShipment(orderId, shipmentData) {
        const order = await Order.findById(orderId);
        if (!order) {
            throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
        }

        if (order.status !== 'PROCESSING') {
            throw new AppError(
                'Only PROCESSING orders can be shipped',
                409,
                'INVALID_ORDER_STATUS'
            );
        }

        const { carrier, tracking_code } = shipmentData;

        if (!carrier || !tracking_code) {
            throw new AppError(
                'Carrier and tracking code required',
                400,
                'MISSING_SHIPMENT_INFO'
            );
        }

        // ✅ Update shipment + status
        order.shipment = {
            carrier,
            tracking_code,
            shipped_at: new Date(),
        };

        order.addStatusTransition(
            'SHIPPED',
            null,
            `Shipped via ${carrier}`
        );

        await order.save();

        return OrderMapper.toResponseDTO(order);
    }

    /**
     * ✅ UPDATE: Confirm delivery (system/tracking action)
     * 
     * Transition: SHIPPED → DELIVERED
     * Usually triggered by tracking system or manual confirmation
     * 
     * @param {String} orderId
     * @returns {Object} Updated order DTO
     */
    static async confirmDelivery(orderId) {
        const order = await Order.findById(orderId);
        if (!order) {
            throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
        }

        if (order.status !== 'SHIPPED') {
            throw new AppError(
                'Only SHIPPED orders can be marked as delivered',
                409,
                'INVALID_ORDER_STATUS'
            );
        }

        // ✅ Update shipment + status
        if (!order.shipment) {
            order.shipment = {};
        }

        order.shipment.delivered_at = new Date();
        order.addStatusTransition('DELIVERED', null, 'Delivery confirmed');

        await order.save();

        return OrderMapper.toDetailDTO(order);
    }

    /**
     * ✅ UPDATE: Cancel order (customer/admin action)
     * 
     * Can cancel before shipment: PENDING → PROCESSING
     * If payment taken: MUST refund (call PaymentService.refund)
     * If stock reserved: MUST restore (ATOMIC)
     * 
     * @param {String} orderId
     * @param {String} reason - Cancellation reason
     * @param {String} cancelledBy - User ID (optional, null = system)
     * @returns {Object} Updated order DTO
     */
    static async cancelOrder(orderId, reason, cancelledBy = null) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const order = await Order.findById(orderId).session(session);
            if (!order) {
                throw new AppError(
                    'Order not found',
                    404,
                    'ORDER_NOT_FOUND'
                );
            }

            // ✅ Check if order can be cancelled
            if (!order.canBeCanceled()) {
                throw new AppError(
                    'Cannot cancel orders already shipped or completed',
                    409,
                    'CANNOT_CANCEL_ORDER'
                );
            }

            // ✅ Restore stock for all items (if status is PENDING or PAID)
            if (order.status === 'PENDING' || order.status === 'PAID') {
                for (const item of order.items) {
                    const qtyItems =
                        item.quantity_ordered * item.pack_size;

                    const result = await Variant.updateOne(
                        {
                            _id: item.variant_id,
                            'stock.reserved': { $gte: qtyItems },
                        },
                        {
                            $inc: {
                                'stock.available': +qtyItems,
                                'stock.reserved': -qtyItems,
                            },
                        },
                        { session }
                    );

                    if (result.modifiedCount === 0) {
                        throw new AppError(
                            'Stock restoration failed',
                            500,
                            'STOCK_RESTORATION_FAILED'
                        );
                    }
                }
            }

            // ✅ Update status
            order.addStatusTransition('CANCELED', cancelledBy, reason);

            await order.save({ session });
            await session.commitTransaction();

            // ✅ If payment taken, refund
            // (This should be called separately in controller)
            // await PaymentService.refund(orderId);

            return OrderMapper.toDetailDTO(order);
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * ✅ UPDATE: Update order status (admin action)
     * 
     * Generic status update with validation
     * Admin can force transitions (with caution)
     * 
     * @param {String} orderId
     * @param {String} toStatus - New status
     * @param {String} adminUserId - Admin who made this change
     * @param {String} note - Reason for change
     * @returns {Object} Updated order DTO
     */
    static async updateOrderStatus(
        orderId,
        toStatus,
        adminUserId,
        note = ''
    ) {
        const order = await Order.findById(orderId);
        if (!order) {
            throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
        }

        // ✅ Validate status enum
        const validStatuses = [
            'PENDING',
            'PAID',
            'PROCESSING',
            'SHIPPED',
            'DELIVERED',
            'FAILED',
            'CANCELED',
        ];

        if (!validStatuses.includes(toStatus)) {
            throw new AppError(
                'Invalid status value',
                400,
                'INVALID_STATUS'
            );
        }

        // ⚠️ Optional: Validate allowed transitions (can be strict or permissive)
        // For now, allow any transition (admin responsibility)

        order.addStatusTransition(toStatus, adminUserId, note);

        await order.save();

        return OrderMapper.toDetailDTO(order);
    }

    /**
     * ✅ UPDATE: Admin notes (admin action)
     * 
     * @param {String} orderId
     * @param {String} notes - Admin notes
     * @returns {Object} Updated order DTO
     */
    static async updateAdminNotes(orderId, notes) {
        const order = await Order.findByIdAndUpdate(
            orderId,
            { admin_notes: notes },
            { new: true }
        );

        if (!order) {
            throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
        }

        return OrderMapper.toDetailDTO(order);
    }

    /**
     * ✅ REVIEW: Write review for order item
     * 
     * @param {String} orderId
     * @param {String} itemId - Item ID within order
     * @param {Number} rating - 1-5 stars
     * @param {String} comment - Optional review comment
     * @returns {Object} Updated order item
     */
    static async writeReview(orderId, itemId, rating, comment = '') {
        const order = await Order.findById(orderId);
        if (!order) {
            throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
        }

        // ✅ Can only review delivered orders
        if (order.status !== 'DELIVERED') {
            throw new AppError(
                'Can only review delivered orders',
                409,
                'ORDER_NOT_DELIVERED'
            );
        }

        const item = order.items.id(itemId);
        if (!item) {
            throw new AppError(
                'Item not found in order',
                404,
                'ITEM_NOT_FOUND'
            );
        }

        // ✅ Mark as reviewed
        item.review_status = 'reviewed';

        await order.save();

        // ✅ TODO: Create Review document + update product rating
        // await ReviewService.createReview({
        //     order_id: orderId,
        //     item_id: itemId,
        //     product_id: item.product_id,
        //     variant_id: item.variant_id,
        //     user_id: order.user_id,
        //     rating,
        //     comment,
        // });

        return OrderMapper.toDetailDTO(order);
    }

    /**
     * ✅ ADMIN: Get all orders (with filters)
     * 
     * @param {Number} page
     * @param {Number} limit
     * @param {Object} filters - { status, payment_status, user_id, date_from, date_to }
     * @returns {Object} { data: [...], pagination: {...} }
     */
    static async getAllOrders(page = 1, limit = 20, filters = {}) {
        const skip = (page - 1) * limit;
        const query = {};

        // Filter by status
        if (filters.status) {
            if (Array.isArray(filters.status)) {
                query.status = { $in: filters.status };
            } else {
                query.status = filters.status;
            }
        }

        // Filter by payment status
        if (filters.payment_status) {
            query['payment.status'] = filters.payment_status;
        }

        // Filter by user
        if (filters.user_id) {
            query.user_id = filters.user_id;
        }

        // Filter by date range
        if (filters.date_from || filters.date_to) {
            query.created_at = {};
            if (filters.date_from) {
                query.created_at.$gte = new Date(filters.date_from);
            }
            if (filters.date_to) {
                query.created_at.$lte = new Date(filters.date_to);
            }
        }

        // Execute query
        const total = await Order.countDocuments(query);
        const orders = await Order.find(query)
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit);

        return {
            data: orders.map(OrderMapper.toAdminDTO),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * ✅ ADMIN: Get order statistics
     * 
     * @returns {Object} Stats (total orders, revenue, status breakdown, etc)
     */
    static async getOrderStats() {
        const stats = await Order.aggregate([
            {
                $facet: {
                    totalOrders: [{ $count: 'count' }],
                    totalRevenue: [
                        {
                            $group: {
                                _id: null,
                                total: { $sum: '$pricing.total_amount' },
                            },
                        },
                    ],
                    statusBreakdown: [
                        { $group: { _id: '$status', count: { $sum: 1 } } },
                    ],
                    paymentBreakdown: [
                        {
                            $group: {
                                _id: '$payment.status',
                                count: { $sum: 1 },
                            },
                        },
                    ],
                },
            },
        ]);

        return stats[0];
    }

    /**
     * ✅ READ: Get the most recent order for a specific user
     * 
     * Used by Chatbot/AI to provide quick status updates
     * Pattern #8: Returns mapped DTO
     * 
     * @param {String} userId 
     * @returns {Object|null} Latest order DTO or null
     */
    static async getLatestOrderByUser(userId) {
        if (!userId) return null;

        const order = await Order.findOne({ user_id: userId })
            .sort({ created_at: -1 });

        if (!order) return null;

        // ✅ Mapping to DTO before returning
        return OrderMapper.toListDTO(order);
    }

}

module.exports = OrderService;