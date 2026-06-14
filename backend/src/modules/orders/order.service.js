const mongoose = require('mongoose');
const Order = require('./order.model');
const OrderMapper = require('./order.mapper');
const AppError = require('../../utils/appError.util');
const OrderAuditLogService = require('../audit_logs/order_audit_log/order_log.service');
const NotificationEventService = require('../notifications/notification_event.service');
const { AUDIT_ACTIONS } = require('../../constants/audit');
const { assertPaymentProviderEnabled } = require('../payments/payment_provider.util');


const Variant = require('../products/variant.model');
const Product = require('../products/product.model');
const Cart = require('../carts/cart.model');
const EmailService = require('../emails/email.service');
const User = require('../users/user.model');
const DiscountService = require('../discounts/discount.service');
const CartService = require('../carts/cart.service');
const ReviewService = require('../reviews/review.service');
const LocationProvince = require('../locations/location_province.model');
const LocationWard = require('../locations/location_ward.model');
const {
    DEFAULT_CURRENCY,
    getDefaultShippingFee,
} = require('../../config/commerce');







class OrderService {
    static getCheckoutSettings() {
        return {
            shipping_fee: getDefaultShippingFee(),
            currency: DEFAULT_CURRENCY,
        };
    }

    static async createOrderFromCart(userId, cartId, shippingData, metadata = {}) {
        if (!userId || !cartId) {
            throw new AppError(
                'User ID and cart ID required',
                400,
                'MISSING_REQUIRED_PARAMS'
            );
        }

        const paymentMethod = shippingData?.payment_method || 'COD';

        if (paymentMethod === 'VNPAY') {
            assertPaymentProviderEnabled('vnpay');
        }

        if (paymentMethod === 'PAYOS') {
            assertPaymentProviderEnabled('payos');
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            let cart = await Cart.findOne(
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

            const addressSnapshot = await this.buildAddressSnapshot(
                shippingData.address_snapshot,
                session
            );

            cart = await CartService.repriceCart(cart, { session });
            cart = await CartService.refreshAppliedDiscount(cart, userId, {
                throwOnInvalid: true,
                session,
            });

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

                original_unit_price:
                    cartItem.original_price_at_added ||
                    cartItem.price_at_added,
                unit_price: cartItem.price_at_added,
                promotion_discount_amount:
                    cartItem.promotion_discount_amount || 0,
                promotion_discount_percent:
                    cartItem.promotion_discount_percent || 0,
                is_on_sale: Boolean(cartItem.is_on_sale),
                original_line_total:
                    cartItem.quantity *
                    (cartItem.original_price_at_added ||
                        cartItem.price_at_added),
                line_total: cartItem.quantity * cartItem.price_at_added,

                review_status: 'pending',
            }));

            const subtotal = orderItems.reduce(
                (sum, item) => sum + item.line_total,
                0
            );
            const originalSubtotal = orderItems.reduce(
                (sum, item) => sum + item.original_line_total,
                0
            );
            const promotionDiscountAmount = Math.max(
                originalSubtotal - subtotal,
                0
            );

            const discountAmount = Math.min(
                cart.discount?.discount_amount || 0,
                subtotal
            );

            const shippingFee = getDefaultShippingFee();

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

            const paymentExpiresAt = ['VNPAY', 'PAYOS'].includes(paymentMethod)
                ? new Date(Date.now() + 15 * 60000)
                : undefined;

            const order = new Order({
                order_code: orderCode,
                user_id: userId,

                address_snapshot: addressSnapshot,
                items: orderItems,

                pricing: {
                    original_subtotal: originalSubtotal,
                    promotion_discount_amount:
                        promotionDiscountAmount,
                    subtotal,
                    shipping_fee: shippingFee,
                    discount_amount: discountAmount,
                    total_amount: totalAmount,
                },

                currency: DEFAULT_CURRENCY,

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
                    method: paymentMethod,
                    status: 'PENDING',
                },

                status: 'PENDING',
                payment_expires_at: paymentExpiresAt,
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
                        ipAddress: metadata.ip,
                        metadata: {
                            order_code: order.order_code,
                            cart_id: cart._id,
                        },
                        auditMetadata: metadata,
                    },
                    { session }
                );
            }

            const user = await User.findById(userId).session(session);

            if (user && user.email) {
                await EmailService.enqueueEmail({
                    to: [user.email],
                    template: 'ORDER_CONFIRMATION',
                    payload: {
                        user_name: user.full_name || "Customer",
                        order_id: order.order_code,
                        total_amount: order.pricing.total_amount.toLocaleString('en-US'),
                        items: order.items.map(item => ({
                            name: item.product_name,
                            qty: item.quantity_ordered,
                            price: item.unit_price.toLocaleString('en-US')
                        }))
                    },
                    actorId: userId,
                    userId,
                    orderId: order._id,
                    auditMetadata: metadata
                }, { session });
            }

            await Cart.deleteOne({ _id: cartId }, { session });

            await session.commitTransaction();

            await this._createOrderAuditLog({
                action: AUDIT_ACTIONS.CREATE_ORDER,
                order,
                actorId: userId,
                metadata,
                changes: {
                    status: {
                        from: null,
                        to: order.status,
                    },
                    payment_status: {
                        from: null,
                        to: order.payment.status,
                    },
                    total_amount: {
                        from: null,
                        to: order.pricing.total_amount,
                    },
                    cart_id: {
                        from: null,
                        to: cartId,
                    },
                    stock_reserved: {
                        from: null,
                        to: this._summarizeStockItems(order.items),
                    },
                },
            });

            await NotificationEventService.orderCreated(order);

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
            .populate('user_id', 'email profile.full_name profile.phone_number')
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

        const createdAtRange = this._buildCreatedAtDateRange(filters);
        if (createdAtRange) {
            query.$or = [
                { createdAt: createdAtRange },
                { created_at: createdAtRange },
            ];
        }

        const total = await Order.countDocuments(query);
        const orders = await Order.find(query)
            .sort({ createdAt: -1, created_at: -1 })
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

    static async confirmPayment(orderId, paymentData = {}, options = {}) {
        const query = Order.findById(orderId);

        if (options.session) {
            query.session(options.session);
        }

        const order = await query;
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

        const paidAt = paymentData.paid_at || new Date();

        order.payment.status = 'PAID';
        order.payment.paid_at = paidAt;
        order.payment_expires_at = undefined;

        if (paymentData.payment_id) {
            order.payment_id = paymentData.payment_id;
        }

        order.addStatusTransition(
            'PAID',
            paymentData.changed_by || null,
            paymentData.note || 'Payment confirmed'
        );

        await order.save({ session: options.session });

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

            await NotificationEventService.paymentFailed(order);

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

        this._assertValidManualStatusTransition(order, 'PROCESSING');

        if (order.status === 'PROCESSING') {
            return OrderMapper.toResponseDTO(order);
        }

        if (order.payment?.method === 'COD') {
            order.payment_expires_at = undefined;
        }

        order.addStatusTransition(
            'PROCESSING',
            adminUserId,
            'Started by admin'
        );

        await order.save();

        await NotificationEventService.orderStatusChanged(order, 'PROCESSING');

        return OrderMapper.toResponseDTO(order);
    }

    static async fulfillItems(
        orderId,
        itemId,
        quantityFulfilled,
        actorId = null,
        metadata = {}
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

            const previousQuantityFulfilled = item.quantity_fulfilled;
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

            await Product.updateOne(
                { _id: item.product_id },
                { $inc: { sold_count: quantityFulfilled } },
                { session }
            );

            await order.save({ session });
            await session.commitTransaction();

            await this._createOrderAuditLog({
                action: AUDIT_ACTIONS.FULFILL_ORDER_ITEMS,
                order,
                actorId,
                metadata,
                changes: {
                    item_id: {
                        from: null,
                        to: item._id,
                    },
                    quantity_fulfilled: {
                        from: previousQuantityFulfilled,
                        to: item.quantity_fulfilled,
                    },
                    stock_movement: {
                        from: null,
                        to: {
                            variant_id: item.variant_id,
                            unit_id: item.unit_id,
                            reserved_delta: -qtyItems,
                            sold_delta: qtyItems,
                        },
                    },
                },
            });

            return OrderMapper.toDetailDTO(order);
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    static async recordShipment(orderId, shipmentData, actorId = null, metadata = {}) {
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
        const fromStatus = order.status;
        const previousShipment = this._summarizeShipment(order.shipment);

        if (!carrier || !tracking_code) {
            throw new AppError(
                'Carrier and tracking code required',
                400,
                'MISSING_SHIPMENT_INFO'
            );
        }

        const shippedAt = new Date();

        order.shipment = {
            carrier,
            tracking_code,
            shipped_at: shippedAt,
        };

        order.addStatusTransition(
            'SHIPPED',
            actorId,
            `Shipped via ${carrier}`
        );

        await order.save();

        await this._createOrderAuditLog({
            action: AUDIT_ACTIONS.RECORD_ORDER_SHIPMENT,
            order,
            actorId,
            metadata,
            changes: {
                status: {
                    from: fromStatus,
                    to: order.status,
                },
                shipment: {
                    from: previousShipment,
                    to: {
                        carrier,
                        tracking_code,
                        shipped_at: shippedAt,
                    },
                },
            },
        });

        await NotificationEventService.orderStatusChanged(order, 'SHIPPED');

        return OrderMapper.toResponseDTO(order);
    }

    static async confirmDelivery(orderId, actorId = null, metadata = {}) {
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

        const fromStatus = order.status;
        const fromPaymentStatus = order.payment?.status || null;
        const previousDeliveredAt = order.shipment.delivered_at || null;
        const deliveredAt = new Date();

        order.shipment.delivered_at = deliveredAt;

        if (order.payment?.method === 'COD' && order.payment.status !== 'PAID') {
            order.payment.status = 'PAID';
            order.payment.paid_at = deliveredAt;
            order.payment_expires_at = undefined;
        }

        order.addStatusTransition('DELIVERED', actorId, 'Delivery confirmed');

        await order.save();

        const changes = {
            status: {
                from: fromStatus,
                to: order.status,
            },
            delivered_at: {
                from: previousDeliveredAt,
                to: deliveredAt,
            },
        };

        if (fromPaymentStatus !== (order.payment?.status || null)) {
            changes.payment_status = {
                from: fromPaymentStatus,
                to: order.payment?.status || null,
            };
        }

        await this._createOrderAuditLog({
            action: AUDIT_ACTIONS.CONFIRM_ORDER_DELIVERY,
            order,
            actorId,
            metadata,
            changes,
        });

        await NotificationEventService.orderStatusChanged(order, 'DELIVERED');

        return OrderMapper.toDetailDTO(order);
    }

    static async cancelCustomerOrder(orderId, reason, userId, metadata = {}) {
        return this.cancelOrder(orderId, reason, userId, metadata, {
            allowedStatuses: ['PENDING', 'PAID'],
            invalidStatusMessage: 'Customers can only cancel orders before processing starts',
            invalidStatusCode: 'CUSTOMER_CANCEL_NOT_ALLOWED',
        });
    }

    static async cancelOrder(
        orderId,
        reason,
        cancelledBy = null,
        metadata = {},
        options = {}
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

            if (
                Array.isArray(options.allowedStatuses) &&
                !options.allowedStatuses.includes(order.status)
            ) {
                throw new AppError(
                    options.invalidStatusMessage || 'Cannot cancel order in current status',
                    409,
                    options.invalidStatusCode || 'CANNOT_CANCEL_ORDER_STATUS'
                );
            }

            if (!order.canBeCanceled()) {
                throw new AppError(
                    'Cannot cancel orders already shipped or completed',
                    409,
                    'CANNOT_CANCEL_ORDER'
                );
            }

            const fromStatus = order.status;
            const fromPaymentStatus = order.payment?.status || null;
            const stockRestored = [];

            if (['PENDING', 'PAID', 'PROCESSING'].includes(order.status)) {
                for (const item of order.items) {
                    const quantityOrdered = Number(item.quantity_ordered || 0);
                    const quantityFulfilled = Number(item.quantity_fulfilled || 0);
                    const packSize = Number(item.pack_size || 1);
                    const remainingPacks = Math.max(
                        quantityOrdered - quantityFulfilled,
                        0
                    );
                    const reservedQty = remainingPacks * packSize;
                    const soldQty = quantityFulfilled * packSize;
                    const availableQty = quantityOrdered * packSize;
                    const stockQuery = {
                        _id: item.variant_id,
                    };
                    const stockUpdate = {
                        $inc: {},
                    };

                    if (reservedQty > 0) {
                        stockQuery['stock.reserved'] = { $gte: reservedQty };
                        stockUpdate.$inc['stock.reserved'] = -reservedQty;
                    }

                    if (soldQty > 0) {
                        stockQuery['stock.sold'] = { $gte: soldQty };
                        stockUpdate.$inc['stock.sold'] = -soldQty;
                    }

                    if (availableQty > 0) {
                        stockUpdate.$inc['stock.available'] = availableQty;
                    }

                    const result = await Variant.updateOne(
                        stockQuery,
                        stockUpdate,
                        { session }
                    );

                    if (result.modifiedCount === 0) {
                        throw new AppError(
                            'Stock restoration failed',
                            500,
                            'STOCK_RESTORATION_FAILED'
                        );
                    }

                    if (quantityFulfilled > 0) {
                        await Product.updateOne(
                            { _id: item.product_id },
                            [
                                {
                                    $set: {
                                        sold_count: {
                                            $max: [
                                                0,
                                                {
                                                    $subtract: [
                                                        '$sold_count',
                                                        quantityFulfilled,
                                                    ],
                                                },
                                            ],
                                        },
                                    },
                                },
                            ],
                            { session }
                        );
                    }

                    stockRestored.push({
                        variant_id: item.variant_id,
                        unit_id: item.unit_id,
                        available_delta: availableQty,
                        reserved_delta: -reservedQty,
                        sold_delta: -soldQty,
                    });
                }
            }

            order.addStatusTransition('CANCELED', cancelledBy, reason);

            await order.save({ session });
            await session.commitTransaction();

            await this._createOrderAuditLog({
                action: AUDIT_ACTIONS.CANCEL_ORDER,
                order,
                actorId: cancelledBy,
                metadata,
                changes: {
                    status: {
                        from: fromStatus,
                        to: order.status,
                    },
                    payment_status: {
                        from: fromPaymentStatus,
                        to: order.payment?.status || null,
                    },
                    reason: {
                        from: null,
                        to: reason,
                    },
                    stock_restored: {
                        from: null,
                        to: stockRestored,
                    },
                },
            });

            await NotificationEventService.orderStatusChanged(order, 'CANCELED');

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
        note = '',
        metadata = {},
        auditAction = AUDIT_ACTIONS.ADMIN_UPDATE_ORDER_STATUS
    ) {
        const order = await Order.findById(orderId);
        if (!order) {
            throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
        }

        this._assertValidManualStatusTransition(order, toStatus);

        const fromStatus = order.status;

        if (fromStatus === toStatus) {
            return OrderMapper.toDetailDTO(order);
        }

        if (toStatus === 'CANCELED') {
            return this.cancelOrder(
                orderId,
                note || 'Admin cancelled',
                adminUserId,
                metadata
            );
        }

        order.addStatusTransition(toStatus, adminUserId, note);

        await order.save();

        await this._createOrderAuditLog({
            action: auditAction,
            order,
            actorId: adminUserId,
            metadata,
            changes: {
                status: {
                    from: fromStatus,
                    to: order.status,
                },
                note: {
                    from: null,
                    to: note || null,
                },
            },
        });

        if (fromStatus !== order.status) {
            await NotificationEventService.orderStatusChanged(order, order.status);
        }

        return OrderMapper.toDetailDTO(order);
    }

    static async adminUpdateOrder(orderId, updateData, adminUserId, metadata = {}) {
        const order = await Order.findById(orderId);

        if (!order) {
            throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
        }

        const changes = {};

        if (updateData.status) {
            this._assertValidManualStatusTransition(order, updateData.status);

            const fromStatus = order.status;

            if (fromStatus !== updateData.status && updateData.status === 'CANCELED') {
                return this.cancelOrder(
                    orderId,
                    updateData.admin_notes || 'Admin cancelled',
                    adminUserId,
                    metadata
                );
            }

            if (fromStatus !== updateData.status) {
                order.addStatusTransition(
                    updateData.status,
                    adminUserId,
                    'Admin update'
                );

                changes.status = {
                    from: fromStatus,
                    to: order.status,
                };
            }
        }

        if (Object.prototype.hasOwnProperty.call(updateData, 'admin_notes')) {
            const fromNotes = order.notes || null;
            order.notes = updateData.admin_notes || null;

            changes.admin_notes = {
                from: fromNotes,
                to: order.notes,
            };
        }

        if (Object.keys(changes).length === 0) {
            return OrderMapper.toAdminDTO(order);
        }

        await order.save();

        await this._createOrderAuditLog({
            action: AUDIT_ACTIONS.ADMIN_UPDATE_ORDER,
            order,
            actorId: adminUserId,
            metadata,
            changes,
        });

        if (changes.status && changes.status.from !== changes.status.to) {
            await NotificationEventService.orderStatusChanged(order, order.status);
        }

        return OrderMapper.toAdminDTO(order);
    }

    static async updateAdminNotes(orderId, notes, actorId = null, metadata = {}) {
        const order = await Order.findById(orderId);

        if (!order) {
            throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
        }

        const fromNotes = order.notes || null;
        order.notes = notes || null;

        await order.save();

        await this._createOrderAuditLog({
            action: AUDIT_ACTIONS.ADMIN_UPDATE_ORDER,
            order,
            actorId,
            metadata,
            changes: {
                admin_notes: {
                    from: fromNotes,
                    to: order.notes,
                },
            },
        });

        return OrderMapper.toAdminDTO(order);
    }

    static async writeReview(orderId, itemId, rating, title, comment, userId, metadata = {}) {
        const order = await Order.findOne({
            _id: orderId,
            user_id: userId,
        });
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

        await ReviewService.createReview(
            userId,
            item.product_id.toString(),
            item.variant_id.toString(),
            orderId,
            {
                rating,
                title,
                content: comment
            },
            metadata
        );

        const updatedOrder = await Order.findById(orderId);

        return OrderMapper.toDetailDTO(updatedOrder);
    }

    static async getAllOrders(page = 1, limit = 20, filters = {}) {
        const skip = (page - 1) * limit;
        const query = {};


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


        if (filters.user_id) {
            query.user_id = filters.user_id;
        }

        const createdAtRange = this._buildCreatedAtDateRange(filters);
        if (createdAtRange) {
            query.$or = [
                { createdAt: createdAtRange },
                { created_at: createdAtRange },
            ];
        }


        const total = await Order.countDocuments(query);
        const orders = await Order.find(query)
            .sort({ createdAt: -1, created_at: -1 })
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

    static async getOrderStats(filters = {}) {
        const query = {};

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

        const createdAtRange = this._buildCreatedAtDateRange(filters);
        if (createdAtRange) {
            query.$or = [
                { createdAt: createdAtRange },
                { created_at: createdAtRange },
            ];
        }

        const stats = await Order.aggregate([
            { $match: query },
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
            .sort({ createdAt: -1, created_at: -1 });

        if (!order) return null;

        return OrderMapper.toListDTO(order);
    }

    static async getActiveProvince(provinceCode, session) {
        const query = LocationProvince.findOne({
            code: provinceCode,
            is_active: true,
        }).select('code name');

        if (session) {
            query.session(session);
        }

        const province = await query.lean();

        if (!province) {
            throw new AppError(
                'Province not found',
                400,
                'INVALID_PROVINCE_CODE'
            );
        }

        return province;
    }

    static async getActiveWard(wardCode, provinceCode, session) {
        const query = LocationWard.findOne({
            code: wardCode,
            province_code: provinceCode,
            is_active: true,
        }).select('code name province_code');

        if (session) {
            query.session(session);
        }

        const ward = await query.lean();

        if (!ward) {
            throw new AppError(
                'Ward not found for province',
                400,
                'INVALID_WARD_CODE'
            );
        }

        return ward;
    }

    static buildFullAddress(detail, wardName, provinceName) {
        return [detail, wardName, provinceName].filter(Boolean).join(', ');
    }

    static async buildAddressSnapshot(addressSnapshot, session = null) {
        const province = await this.getActiveProvince(
            addressSnapshot.province_code,
            session
        );
        const ward = await this.getActiveWard(
            addressSnapshot.ward_code,
            addressSnapshot.province_code,
            session
        );
        const detail = addressSnapshot.detail.trim();
        const note = typeof addressSnapshot.note === 'string'
            ? addressSnapshot.note.trim() || null
            : null;

        return {
            receiver_name: addressSnapshot.receiver_name.trim(),
            phone: addressSnapshot.phone.trim(),
            province_code: province.code,
            province_name: province.name,
            ward_code: ward.code,
            ward_name: ward.name,
            detail,
            full_address: this.buildFullAddress(detail, ward.name, province.name),
            note,
        };
    }

    static _assertValidOrderStatus(status) {
        const validStatuses = [
            'PENDING',
            'PAID',
            'PROCESSING',
            'SHIPPED',
            'DELIVERED',
            'FAILED',
            'CANCELED',
        ];

        if (!validStatuses.includes(status)) {
            throw new AppError(
                'Invalid status value',
                400,
                'INVALID_STATUS'
            );
        }
    }

    static _buildCreatedAtDateRange(filters = {}) {
        if (!filters.date_from && !filters.date_to) {
            return null;
        }

        const range = {};

        if (filters.date_from) {
            const from = new Date(filters.date_from);
            from.setHours(0, 0, 0, 0);
            range.$gte = from;
        }

        if (filters.date_to) {
            const to = new Date(filters.date_to);
            to.setHours(23, 59, 59, 999);
            range.$lte = to;
        }

        return range;
    }

    static _assertValidManualStatusTransition(order, toStatus) {
        this._assertValidOrderStatus(toStatus);

        const fromStatus = order.status;

        if (fromStatus === toStatus) {
            return;
        }

        const allowedTransitions = this._getAllowedManualStatusTransitions(order);

        if (!allowedTransitions.includes(toStatus)) {
            throw new AppError(
                this._buildInvalidTransitionMessage(order, toStatus),
                409,
                'INVALID_ORDER_STATUS_TRANSITION'
            );
        }
    }

    static _getAllowedManualStatusTransitions(order) {
        const status = order.status;
        const paymentMethod = order.payment?.method;
        const paymentStatus = order.payment?.status;

        if (status === 'PENDING') {
            const transitions = ['CANCELED'];

            if (paymentMethod === 'COD') {
                transitions.push('PROCESSING');
            }

            if (paymentStatus === 'PAID') {
                transitions.push('PAID');
            }

            return transitions;
        }

        if (status === 'PAID') {
            return ['PROCESSING', 'CANCELED'];
        }

        if (status === 'PROCESSING') {
            return ['CANCELED'];
        }

        return [];
    }

    static _buildInvalidTransitionMessage(order, toStatus) {
        const fromStatus = order.status;

        if (fromStatus === 'PENDING' && toStatus === 'PROCESSING') {
            return 'Only COD PENDING orders can move directly to PROCESSING';
        }

        if (toStatus === 'PAID') {
            return 'Order payment must be PAID before order status can move to PAID';
        }

        if (toStatus === 'SHIPPED') {
            return 'Use shipment creation to move an order to SHIPPED';
        }

        if (toStatus === 'DELIVERED') {
            return 'Use delivery confirmation to move an order to DELIVERED';
        }

        return `Invalid order status transition from ${fromStatus} to ${toStatus}`;
    }

    static _summarizeStockItems(items = []) {
        return items.map((item) => ({
            product_id: item.product_id,
            variant_id: item.variant_id,
            unit_id: item.unit_id,
            quantity_ordered: item.quantity_ordered,
            pack_size: item.pack_size,
            stock_units: item.quantity_ordered * item.pack_size,
        }));
    }

    static _summarizeShipment(shipment) {
        if (!shipment) {
            return null;
        }

        return {
            carrier: shipment.carrier || null,
            tracking_code: shipment.tracking_code || null,
            shipped_at: shipment.shipped_at || null,
            delivered_at: shipment.delivered_at || null,
        };
    }

    static async _createOrderAuditLog({
        action,
        order,
        actorId = null,
        metadata = {},
        changes = {},
    }) {
        await OrderAuditLogService.createLog({
            actor_id: actorId,
            action,
            order_id: order._id,
            user_id: order.user_id || null,
            order_code: order.order_code || null,
            status: order.status || null,
            changes,
            ip_address: metadata.ip || null,
            user_agent: metadata.userAgent || null,
        });
    }

}

module.exports = OrderService;
