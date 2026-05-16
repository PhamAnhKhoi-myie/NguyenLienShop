const mongoose = require('mongoose');
const Order = require('./order.model');
const OrderMapper = require('./order.mapper');
const AppError = require('../../utils/appError.util');

// Import dependencies
const Variant = require('../products/variant.model');
const Cart = require('../carts/cart.model');
const EmailJob = require('../emails/email.model');
const User = require('../users/user.model');
const DiscountService = require('../discounts/discount.service');

/**
 * ============================================
 * ORDER SERVICE
 * ============================================
 */

class OrderService {
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

            if (!shippingData.address_snapshot) {
                throw new AppError(
                    'Shipping address is required',
                    400,
                    'MISSING_ADDRESS'
                );
            }

            const orderCode = await Order.generateOrderCode();

            const orderItems = cart.items.map((cartItem) => ({
                _id: new mongoose.Types.ObjectId(),
                product_id: cartItem.product_id,
                variant_id: cartItem.variant_id,
                unit_id: cartItem.unit_id,

                product_name: cartItem.product_name,
                product_image: cartItem.product_image,
                variant_label: cartItem.variant_label,
                sku: cartItem.sku,
                unit_label: cartItem.display_name,
                pack_size: cartItem.pack_size,

                quantity_ordered: cartItem.quantity,
                quantity_fulfilled: 0,

                unit_price: cartItem.price_at_added,
                line_total: cartItem.quantity * cartItem.price_at_added,

                review_status: 'pending',
            }));

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

            for (const item of orderItems) {
                const qtyItems = item.quantity_ordered * item.pack_size;

                const result = await Variant.updateOne(
                    {
                        _id: item.variant_id,
                        'stock.available': { $gte: qtyItems },
                    },
                    {
                        $inc: {
                            'stock.available': -qtyItems,
                            'stock.reserved': +qtyItems,
                        },
                    },
                    { session }
                );

                if (result.modifiedCount === 0) {
                    throw new AppError(
                        `Insufficient stock for ${item.product_name}`,
                        409,
                        'INSUFFICIENT_STOCK'
                    );
                }
            }

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
                        type: cart.discount.type === 'PERCENT' ? 'percentage' : 'fixed',
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
                payment_expires_at: new Date(Date.now() + 15 * 60000),
                customer_notes: shippingData.customer_notes || null,
            });

            order.status_history.push({
                from: null,
                to: 'PENDING',
                changed_at: new Date(),
                changed_by: null,
                note: 'Order created',
            });

            await order.save({ session });

            if (cart.discount && discountAmount > 0) {
                await DiscountService.redeemForOrder(
                    cart.discount,
                    {
                        userId,
                        orderId: order._id,
                        discountAmount,
                        orderTotal: totalAmount,
                        sessionKey: cart.session_key,
                        metadata: {
                            order_code: order.order_code,
                            cart_id: cart._id,
                        },
                    },
                    { session }
                );
            }

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

            await Cart.deleteOne({ _id: cartId }, { session });

            await session.commitTransaction();

            return OrderMapper.toResponseDTO(order);
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    static async getOrderById(orderId) {
        const order = await Order.findById(orderId);
        if (!order) {
            throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
        }

        return OrderMapper.toDetailDTO(order);
    }

    static async getAdminOrderById(orderId) {
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            throw new AppError('Invalid order ID', 400, 'INVALID_ORDER_ID');
        }

        const order = await Order.findById(orderId)
            .populate('user_id', 'full_name email phone')
            .populate('discount.discount_id', 'code name type value')
            .lean();

        if (!order) {
            throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
        }

        return OrderMapper.toAdminDTO(order);
    }

    static async getOrderByCode(orderCode) {
        const order = await Order.findOne({ order_code: orderCode });
        if (!order) {
            throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
        }

        return OrderMapper.toTrackingDTO(order);
    }

    static async getUserOrders(
        userId,
        page = 1,
        limit = 20,
        filters = {}
    ) {
        const skip = (page - 1) * limit;
        const query = { user_id: userId };

        if (filters.status) {
            if (Array.isArray(filters.status)) {
                query.status = { $in: filters.status };
            } else {
                query.status = filters.status;
            }
        }

        if (filters.payment_status) {
            query['payment.status'] = filters.payment_status;
        }

        if (filters.date_from || filters.date_to) {
            query.created_at = {};
            if (filters.date_from) {
                query.created_at.$gte = new Date(filters.date_from);
            }
            if (filters.date_to) {
                query.created_at.$lte = new Date(filters.date_to);
            }
        }

        const total = await Order.countDocuments(query);
        const orders = await Order.find(query)
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit);

        return {
            data: orders.map((order) => OrderMapper.toListDTO(order)),
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }

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

        order.payment.status = 'PAID';
        order.payment.paid_at = paymentData.paid_at || new Date();

        order.addStatusTransition('PAID', null, 'Payment confirmed');

        await order.save();

        return OrderMapper.toResponseDTO(order);
    }

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

            for (const item of order.items) {
                const qtyItems = item.quantity_ordered * item.pack_size;

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
                        `Stock restoration failed for item ${item.product_name}`,
                        500,
                        'STOCK_RESTORATION_FAILED'
                    );
                }
            }

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

            const qtyItems = quantityFulfilled * item.pack_size;

            const result = await Variant.updateOne(
                {
                    _id: item.variant_id,
                    'stock.reserved': { $gte: qtyItems },
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

        if (!order.shipment) {
            order.shipment = {};
        }

        order.shipment.delivered_at = new Date();
        order.addStatusTransition('DELIVERED', null, 'Delivery confirmed');

        await order.save();

        return OrderMapper.toDetailDTO(order);
    }

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

            if (!order.canBeCanceled()) {
                throw new AppError(
                    'Cannot cancel orders already shipped or completed',
                    409,
                    'CANNOT_CANCEL_ORDER'
                );
            }

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

            order.addStatusTransition('CANCELED', cancelledBy, reason);

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

        order.addStatusTransition(toStatus, adminUserId, note);

        await order.save();

        return OrderMapper.toDetailDTO(order);
    }

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

    static async writeReview(orderId, itemId, rating, comment = '') {
        const order = await Order.findById(orderId);
        if (!order) {
            throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
        }

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

        item.review_status = 'reviewed';

        await order.save();

        return OrderMapper.toDetailDTO(order);
    }

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
            data: orders.map((order) => OrderMapper.toAdminDTO(order)),
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }

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

    static async getLatestOrderByUser(userId) {
        if (!userId) return null;

        const order = await Order.findOne({ user_id: userId })
            .sort({ created_at: -1 });

        if (!order) return null;

        return OrderMapper.toListDTO(order);
    }

}

module.exports = OrderService;
