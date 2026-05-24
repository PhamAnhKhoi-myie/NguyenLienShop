const mongoose = require('mongoose');
const crypto = require('crypto');
const Shipment = require('./shipment.model');
const ShipmentMapper = require('./shipment.mapper');
const AppError = require('../../utils/appError.util');
const ShipmentAuditLogService = require('../audit_logs/shipment_audit_log/shipment_log.service');
const { AUDIT_ACTIONS } = require('../../constants/audit');

// Import dependencies
const Order = require('../orders/order.model');
const NotificationEventService = require('../notifications/notification_event.service');

const logger = {
    info: (data) => console.log(JSON.stringify({
        level: 'info',
        timestamp: new Date().toISOString(),
        ...data
    })),

    warn: (data) => console.warn(JSON.stringify({
        level: 'warn',
        timestamp: new Date().toISOString(),
        ...data
    })),

    error: (data) => console.error(JSON.stringify({
        level: 'error',
        timestamp: new Date().toISOString(),
        ...data
    }))
};

class ShipmentService {
    static async createShipment(orderId, adminUserId, shipmentData, metadata = {}) {
        if (!orderId || !adminUserId) {
            throw new AppError(
                'Order ID and admin user ID required',
                400,
                'MISSING_REQUIRED_PARAMS'
            );
        }

        const { carrier, tracking_code, shipping_address } = shipmentData;

        if (!carrier || !tracking_code) {
            throw new AppError(
                'Carrier and tracking code are required',
                400,
                'MISSING_CARRIER_OR_TRACKING_CODE'
            );
        }

        if (!shipping_address) {
            throw new AppError(
                'Shipping address is required',
                400,
                'MISSING_SHIPPING_ADDRESS'
            );
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const order = await Order.findOne({
                _id: orderId,
                status: 'PROCESSING',
            }).session(session);

            if (!order) {
                throw new AppError(
                    'Order not found or not in processing status',
                    404,
                    'ORDER_NOT_FOUND'
                );
            }

            const existingShipment = await Shipment.findOne({
                tracking_code: tracking_code.toUpperCase(),
                is_deleted: false,
            }).session(session);

            if (existingShipment) {
                throw new AppError(
                    'Tracking code already exists',
                    409,
                    'TRACKING_CODE_DUPLICATE'
                );
            }

            const [shipment] = await Shipment.create([{
                order_id: orderId,
                user_id: order.user_id,

                carrier,
                tracking_code: tracking_code.toUpperCase(),

                shipping_address,

                status: 'pending',
                timeline: {
                    created_at: new Date(),
                    picked_up_at: null,
                    in_transit_at: null,
                    at_destination_at: null,
                    delivered_at: null,
                    failed_at: null,
                    cancelled_at: null,
                    returned_at: null,
                },

                retry_count: 0,
                max_retries: 3,
            }], { session });

            const updatedOrder = await this._markOrderShipped(
                orderId,
                shipment,
                adminUserId,
                { session }
            );

            await session.commitTransaction();

            await this._createShipmentAuditLog({
                action: AUDIT_ACTIONS.CREATE_SHIPMENT,
                shipment,
                actorId: adminUserId,
                metadata,
                changes: {
                    status: {
                        from: null,
                        to: shipment.status,
                    },
                    order_status: {
                        from: 'PROCESSING',
                        to: updatedOrder.status,
                    },
                    carrier: {
                        from: null,
                        to: shipment.carrier,
                    },
                    tracking_code: {
                        from: null,
                        to: shipment.tracking_code,
                    },
                },
            });

            await NotificationEventService.orderStatusChanged(updatedOrder, 'SHIPPED');

            logger.info({
                event: 'shipment_created',
                shipment_id: shipment._id.toString(),
                order_id: orderId,
                user_id: order.user_id.toString(),
                admin_user_id: adminUserId,
                carrier: carrier,
                tracking_code: tracking_code.toUpperCase(),
            });

            return ShipmentMapper.toResponseDTO(shipment);
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    static async getShipment(shipmentId, userId = null) {
        const query = { _id: shipmentId, is_deleted: false };

        // ✅ Ownership check (unless admin)
        if (userId) {
            query.user_id = userId;
        }

        const shipment = await Shipment.findOne(query);

        if (!shipment) {
            throw new AppError(
                'Shipment not found',
                404,
                'SHIPMENT_NOT_FOUND'
            );
        }

        return ShipmentMapper.toDetailDTO(shipment);
    }

    static async getShipmentByTrackingCode(trackingCode) {
        const shipment = await Shipment.findByTrackingCode(
            trackingCode.toUpperCase()
        );

        if (!shipment) {
            throw new AppError(
                'Shipment not found',
                404,
                'SHIPMENT_NOT_FOUND'
            );
        }

        return ShipmentMapper.toTrackingDTO(shipment);
    }

    static async getShipmentsForOrder(orderId, userId = null) {
        const order = await Order.findOne({
            _id: orderId,
            ...(userId && { user_id: userId }), // Ownership check if not admin
        });

        if (!order) {
            throw new AppError(
                'Order not found',
                404,
                'ORDER_NOT_FOUND'
            );
        }

        const shipments = await Shipment.find({
            order_id: orderId,
            is_deleted: false,
        }).sort({ created_at: -1 });

        return ShipmentMapper.toResponseDTOList(shipments);
    }

    static async getUserShipments(
        userId,
        page = 1,
        limit = 20,
        filters = {}
    ) {
        const skip = (page - 1) * limit;
        const query = { user_id: userId, is_deleted: false };

        if (filters.status) {
            if (Array.isArray(filters.status)) {
                query.status = { $in: filters.status };
            } else {
                query.status = filters.status;
            }
        }

        if (filters.carrier) {
            query.carrier = filters.carrier;
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

        const total = await Shipment.countDocuments(query);
        const shipments = await Shipment.find(query)
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit);

        return {
            data: shipments.map(ShipmentMapper.toListDTO),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    static async updateShipmentStatus(shipmentId, newStatus, metadata = {}) {
        const shipment = await Shipment.findById(shipmentId);

        if (!shipment) {
            throw new AppError(
                'Shipment not found',
                404,
                'SHIPMENT_NOT_FOUND'
            );
        }

        if (shipment.is_deleted) {
            throw new AppError(
                'Cannot update deleted shipment',
                410,
                'SHIPMENT_DELETED'
            );
        }

        const validTransitions = {
            pending: ['picked_up', 'failed', 'cancelled'],
            picked_up: ['in_transit', 'failed', 'cancelled'],
            in_transit: ['at_destination', 'failed', 'cancelled'],
            at_destination: ['delivered', 'failed', 'cancelled'],
            delivered: [], // Terminal state
            failed: ['pending'], // Can retry
            cancelled: [], // Terminal state
            returned: [], // Terminal state
        };

        if (!validTransitions[shipment.status]?.includes(newStatus)) {
            throw new AppError(
                `Invalid transition: ${shipment.status} → ${newStatus}`,
                409,
                'INVALID_SHIPMENT_STATUS_TRANSITION'
            );
        }

        if (newStatus === 'failed') {
            throw new AppError(
                'Use failure endpoint to record failure reason and notes',
                400,
                'SHIPMENT_FAILURE_DETAILS_REQUIRED'
            );
        }

        const oldStatus = shipment.status;
        const timelineField = this._getStatusTimestampField(newStatus);
        const statusChangedAt = new Date();
        const update = {
            $set: {
                status: newStatus,
                updated_at: statusChangedAt,
            },
        };

        if (timelineField) {
            update.$set[`timeline.${timelineField}`] = statusChangedAt;
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        let updatedShipment;
        let updatedOrder = null;

        try {
            updatedShipment = await Shipment.findByIdAndUpdate(
                shipmentId,
                update,
                { new: true, runValidators: true, session }
            );

            if (newStatus === 'delivered') {
                updatedOrder = await this._markOrderDelivered(
                    updatedShipment.order_id,
                    metadata.changed_by || null,
                    { session }
                );
            }

            await session.commitTransaction();
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }

        await this._createShipmentAuditLog({
            action: metadata.audit_action || AUDIT_ACTIONS.UPDATE_SHIPMENT_STATUS,
            shipment: updatedShipment,
            actorId: metadata.changed_by || null,
            metadata: metadata.audit_metadata || metadata,
            changes: {
                status: {
                    from: oldStatus,
                    to: newStatus,
                },
                timeline_field: {
                    from: null,
                    to: timelineField || null,
                },
                changed_at: {
                    from: null,
                    to: statusChangedAt,
                },
                notes: {
                    from: null,
                    to: metadata.notes || null,
                },
                carrier_details: {
                    from: null,
                    to: metadata.carrier_details || null,
                },
                webhook_status: {
                    from: null,
                    to: metadata.webhook_status || null,
                },
            },
        });

        if (newStatus === 'delivered') {
            await NotificationEventService.orderStatusChanged(updatedOrder, 'DELIVERED');
        }

        logger.info({
            event: 'shipment_status_updated',
            shipment_id: shipmentId,
            order_id: updatedShipment.order_id.toString(),
            old_status: shipment.status,
            new_status: newStatus,
            notes: metadata.notes || '',
        });

        return ShipmentMapper.toResponseDTO(updatedShipment);
    }

    static async updateShipmentStatusFromWebhook(
        carrier,
        trackingCode,
        carrierStatus,
        metadata = {}
    ) {
        const { signature, timestamp, carrier_details } = metadata;

        if (
            !this._verifyCarrierWebhookSignature(
                carrier,
                {
                    tracking_code: trackingCode,
                    status: carrierStatus,
                    carrier_details,
                    timestamp,
                },
                signature
            )
        ) {
            throw new AppError(
                'Shipment webhook signature verification failed',
                401,
                'WEBHOOK_VERIFICATION_FAILED'
            );
        }

        const mappedStatus = this._mapCarrierStatus(carrierStatus);

        if (!mappedStatus) {
            throw new AppError(
                'Unsupported carrier shipment status',
                400,
                'UNSUPPORTED_CARRIER_STATUS'
            );
        }

        const shipment = await Shipment.findOne({
            tracking_code: trackingCode.toUpperCase(),
            carrier,
            is_deleted: false,
        });

        if (!shipment) {
            throw new AppError(
                'Shipment not found',
                404,
                'SHIPMENT_NOT_FOUND'
            );
        }

        if (shipment.status === mappedStatus) {
            return ShipmentMapper.toResponseDTO(shipment);
        }

        if (mappedStatus === 'failed') {
            return this.recordDeliveryFailure(
                shipment._id,
                'carrier_error',
                `Carrier webhook reported failed status: ${carrierStatus}`,
                null,
                metadata.audit_metadata || {},
                AUDIT_ACTIONS.SHIPMENT_WEBHOOK_STATUS,
                {
                    carrier_status: carrierStatus,
                    carrier_details: carrier_details || null,
                    timestamp: timestamp || null,
                }
            );
        }

        return this.updateShipmentStatus(
            shipment._id,
            mappedStatus,
            {
                carrier_details,
                notes: `Carrier webhook: ${carrierStatus}`,
                timestamp,
                webhook_status: carrierStatus,
                audit_metadata: metadata.audit_metadata || {},
                audit_action: AUDIT_ACTIONS.SHIPMENT_WEBHOOK_STATUS,
            }
        );
    }

    static async recordDeliveryFailure(
        shipmentId,
        reason,
        notes = '',
        actorId = null,
        metadata = {},
        auditAction = AUDIT_ACTIONS.RECORD_SHIPMENT_FAILURE,
        extraChanges = {}
    ) {
        const shipment = await Shipment.findById(shipmentId);

        if (!shipment) {
            throw new AppError(
                'Shipment not found',
                404,
                'SHIPMENT_NOT_FOUND'
            );
        }

        if (!shipment.isInProgress()) {
            throw new AppError(
                'Cannot fail shipment that is not in progress',
                409,
                'INVALID_SHIPMENT_STATUS'
            );
        }

        const failureNotes =
            typeof notes === 'string' ? notes.trim() : '';

        if (!failureNotes) {
            throw new AppError(
                'Failure notes are required',
                400,
                'MISSING_FAILURE_NOTES'
            );
        }

        const oldStatus = shipment.status;
        const oldRetryCount = shipment.retry_count || 0;
        const failedAt = new Date();

        shipment.status = 'failed';
        shipment.failure_reason = reason;
        shipment.failure_notes = failureNotes;
        shipment.retry_count = oldRetryCount + 1;
        shipment.timeline.failed_at = failedAt;
        shipment.updated_at = failedAt;

        await shipment.save();

        await this._createShipmentAuditLog({
            action: auditAction,
            shipment,
            actorId,
            metadata,
            changes: {
                status: {
                    from: oldStatus,
                    to: shipment.status,
                },
                failure_reason: {
                    from: null,
                    to: reason,
                },
                failure_notes: {
                    from: null,
                    to: failureNotes,
                },
                retry_count: {
                    from: oldRetryCount,
                    to: shipment.retry_count,
                },
                failed_at: {
                    from: null,
                    to: failedAt,
                },
                ...extraChanges,
            },
        });

        logger.warn({
            event: 'shipment_delivery_failed',
            shipment_id: shipmentId,
            order_id: shipment.order_id.toString(),
            failure_reason: reason,
            retry_count: shipment.retry_count,
            max_retries: shipment.max_retries,
        });

        return ShipmentMapper.toDetailDTO(shipment);
    }

    static async retryFailedShipment(shipmentId, actorId = null, metadata = {}) {
        const shipment = await Shipment.findById(shipmentId);

        if (!shipment) {
            throw new AppError(
                'Shipment not found',
                404,
                'SHIPMENT_NOT_FOUND'
            );
        }

        if (shipment.status !== 'failed') {
            throw new AppError(
                'Can only retry failed shipments',
                409,
                'INVALID_SHIPMENT_STATUS'
            );
        }

        if (shipment.retry_count >= shipment.max_retries) {
            throw new AppError(
                `Max retries (${shipment.max_retries}) exceeded`,
                409,
                'MAX_RETRIES_EXCEEDED'
            );
        }

        const oldStatus = shipment.status;
        const oldFailureReason = shipment.failure_reason || null;
        const oldFailureNotes = shipment.failure_notes || null;
        const oldFailedAt = shipment.timeline.failed_at || null;
        const lastRetryAt = new Date();

        shipment.status = 'pending';
        shipment.failure_reason = null;
        shipment.failure_notes = null;
        shipment.last_retry_at = lastRetryAt;
        shipment.timeline.failed_at = null;
        shipment.updated_at = lastRetryAt;

        await shipment.save();

        await this._createShipmentAuditLog({
            action: AUDIT_ACTIONS.RETRY_SHIPMENT,
            shipment,
            actorId,
            metadata,
            changes: {
                status: {
                    from: oldStatus,
                    to: shipment.status,
                },
                failure_reason: {
                    from: oldFailureReason,
                    to: null,
                },
                failure_notes: {
                    from: oldFailureNotes,
                    to: null,
                },
                failed_at: {
                    from: oldFailedAt,
                    to: null,
                },
                last_retry_at: {
                    from: null,
                    to: lastRetryAt,
                },
                retry_count: {
                    from: shipment.retry_count,
                    to: shipment.retry_count,
                },
            },
        });

        logger.info({
            event: 'shipment_retry',
            shipment_id: shipmentId,
            order_id: shipment.order_id.toString(),
            retry_count: shipment.retry_count,
            carrier: shipment.carrier,
        });

        return ShipmentMapper.toDetailDTO(shipment);
    }

    static async cancelShipment(shipmentId, reason, actorId = null, metadata = {}) {
        const shipment = await Shipment.findById(shipmentId);

        if (!shipment) {
            throw new AppError(
                'Shipment not found',
                404,
                'SHIPMENT_NOT_FOUND'
            );
        }

        if (!shipment.canBeCancelled()) {
            throw new AppError(
                'Cannot cancel shipment in current status',
                409,
                'CANNOT_CANCEL_SHIPMENT'
            );
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        const oldStatus = shipment.status;
        const oldFailureNotes = shipment.failure_notes || null;
        const cancelledAt = new Date();
        let updatedOrder = null;

        try {
            shipment.$session(session);
            shipment.status = 'cancelled';
            shipment.failure_notes = reason;
            shipment.timeline.cancelled_at = cancelledAt;
            shipment.updated_at = cancelledAt;

            await shipment.save({ session });

            updatedOrder = await this._returnOrderToProcessing(
                shipment.order_id,
                actorId,
                reason,
                { session }
            );

            await session.commitTransaction();
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }

        await this._createShipmentAuditLog({
            action: AUDIT_ACTIONS.CANCEL_SHIPMENT,
            shipment,
            actorId,
            metadata,
            changes: {
                status: {
                    from: oldStatus,
                    to: shipment.status,
                },
                failure_notes: {
                    from: oldFailureNotes,
                    to: reason,
                },
                cancelled_at: {
                    from: null,
                    to: cancelledAt,
                },
                order_status: {
                    from: 'SHIPPED',
                    to: updatedOrder?.status || null,
                },
            },
        });

        logger.info({
            event: 'shipment_cancelled',
            shipment_id: shipmentId,
            order_id: shipment.order_id.toString(),
            cancellation_reason: reason,
        });

        return ShipmentMapper.toDetailDTO(shipment);
    }

    static async confirmDelivery(shipmentId, actorId = null, metadata = {}) {
        const shipment = await Shipment.findById(shipmentId);

        if (!shipment) {
            throw new AppError(
                'Shipment not found',
                404,
                'SHIPMENT_NOT_FOUND'
            );
        }

        if (
            !['in_transit', 'at_destination'].includes(shipment.status)
        ) {
            throw new AppError(
                'Cannot confirm delivery for shipment not in transit',
                409,
                'INVALID_SHIPMENT_STATUS'
            );
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        const oldStatus = shipment.status;
        const deliveredAt = new Date();
        let updatedOrder = null;

        try {
            shipment.$session(session);
            shipment.status = 'delivered';
            shipment.timeline.delivered_at = deliveredAt;
            shipment.updated_at = deliveredAt;

            await shipment.save({ session });

            updatedOrder = await this._markOrderDelivered(
                shipment.order_id,
                actorId,
                { session }
            );

            await session.commitTransaction();
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }

        await this._createShipmentAuditLog({
            action: AUDIT_ACTIONS.CONFIRM_SHIPMENT_DELIVERY,
            shipment,
            actorId,
            metadata,
            changes: {
                status: {
                    from: oldStatus,
                    to: shipment.status,
                },
                delivered_at: {
                    from: null,
                    to: deliveredAt,
                },
                order_status: {
                    from: 'SHIPPED',
                    to: updatedOrder?.status || null,
                },
            },
        });

        await NotificationEventService.orderStatusChanged(updatedOrder, 'DELIVERED');

        logger.info({
            event: 'shipment_delivered',
            shipment_id: shipmentId,
            order_id: shipment.order_id.toString(),
            carrier: shipment.carrier,
        });

        return ShipmentMapper.toDetailDTO(shipment);
    }

    static async markAsReturned(shipmentId) {
        const shipment = await Shipment.findById(shipmentId);

        if (!shipment) {
            throw new AppError(
                'Shipment not found',
                404,
                'SHIPMENT_NOT_FOUND'
            );
        }

        if (
            !['failed', 'at_destination', 'in_transit'].includes(
                shipment.status
            )
        ) {
            throw new AppError(
                'Cannot return shipment in current status',
                409,
                'INVALID_SHIPMENT_STATUS'
            );
        }

        shipment.status = 'returned';
        shipment.timeline.returned_at = new Date();
        shipment.updated_at = new Date();

        await shipment.save();

        logger.info({
            event: 'shipment_returned',
            shipment_id: shipmentId,
            order_id: shipment.order_id.toString(),
        });

        return ShipmentMapper.toDetailDTO(shipment);
    }

    static async getAllShipments(page = 1, limit = 20, filters = {}) {
        const skip = (page - 1) * limit;
        const query = { is_deleted: false };

        if (filters.status) {
            if (Array.isArray(filters.status)) {
                query.status = { $in: filters.status };
            } else {
                query.status = filters.status;
            }
        }

        if (filters.carrier) {
            query.carrier = filters.carrier;
        }

        if (filters.user_id) {
            query.user_id = filters.user_id;
        }

        if (filters.order_id) {
            query.order_id = filters.order_id;
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

        const total = await Shipment.countDocuments(query);
        const shipments = await Shipment.find(query)
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit);

        return {
            data: shipments.map(ShipmentMapper.toAdminDTO),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    static async getShipmentStats() {
        const stats = await Shipment.aggregate([
            { $match: { is_deleted: false } },
            {
                $facet: {
                    totalShipments: [{ $count: 'count' }],

                    statusBreakdown: [
                        {
                            $group: {
                                _id: '$status',
                                count: { $sum: 1 },
                            },
                        },
                    ],

                    carrierBreakdown: [
                        {
                            $group: {
                                _id: '$carrier',
                                count: { $sum: 1 },
                                avgDeliveryDays: {
                                    $avg: {
                                        $cond: [
                                            { $ne: ['$timeline.delivered_at', null] },
                                            {
                                                $divide: [
                                                    {
                                                        $subtract: [
                                                            '$timeline.delivered_at',
                                                            '$timeline.created_at',
                                                        ],
                                                    },
                                                    1000 * 60 * 60 * 24,
                                                ],
                                            },
                                            null,
                                        ],
                                    },
                                },
                            },
                        },
                    ],

                    deliveryRate: [
                        {
                            $group: {
                                _id: null,
                                total: { $sum: 1 },
                                delivered: {
                                    $sum: {
                                        $cond: [
                                            { $eq: ['$status', 'delivered'] },
                                            1,
                                            0,
                                        ],
                                    },
                                },
                                failed: {
                                    $sum: {
                                        $cond: [
                                            { $eq: ['$status', 'failed'] },
                                            1,
                                            0,
                                        ],
                                    },
                                },
                            },
                        },
                        {
                            $project: {
                                deliveryRate: {
                                    $multiply: [
                                        { $divide: ['$delivered', '$total'] },
                                        100,
                                    ],
                                },
                                failureRate: {
                                    $multiply: [
                                        { $divide: ['$failed', '$total'] },
                                        100,
                                    ],
                                },
                            },
                        },
                    ],

                    failedShipments: [
                        {
                            $match: { status: 'failed' },
                        },
                        {
                            $group: {
                                _id: '$failure_reason',
                                count: { $sum: 1 },
                            },
                        },
                    ],
                },
            },
        ]);

        return stats[0];
    }

    static async getPendingRetryShipments() {
        return Shipment.find({
            status: 'failed',
            retry_count: { $lt: 3 },
            is_deleted: false,
        })
            .sort({ last_retry_at: 1 })
            .lean();
    }

    static async softDeleteShipment(shipmentId, actorId = null, metadata = {}) {
        const shipment = await Shipment.findByIdAndUpdate(
            shipmentId,
            {
                is_deleted: true,
                deleted_at: new Date(),
            },
            { new: true }
        );

        if (!shipment) {
            throw new AppError(
                'Shipment not found',
                404,
                'SHIPMENT_NOT_FOUND'
            );
        }

        await this._createShipmentAuditLog({
            action: AUDIT_ACTIONS.DELETE_SHIPMENT_SOFT,
            shipment,
            actorId,
            metadata,
            changes: {
                is_deleted: {
                    from: false,
                    to: true,
                },
                deleted_at: {
                    from: null,
                    to: shipment.deleted_at,
                },
            },
        });

        return ShipmentMapper.toAdminDTO(shipment);
    }

    static async getAdminShipment(shipmentId) {
        const shipment = await Shipment.findById(shipmentId);

        if (!shipment) {
            throw new AppError(
                'Shipment not found',
                404,
                'SHIPMENT_NOT_FOUND'
            );
        }

        return ShipmentMapper.toAdminDTO(shipment);
    }

    static async adminUpdateShipment(
        shipmentId,
        updateData = {},
        adminUserId = null,
        metadata = {}
    ) {
        const shipment = await Shipment.findById(shipmentId);

        if (!shipment) {
            throw new AppError(
                'Shipment not found',
                404,
                'SHIPMENT_NOT_FOUND'
            );
        }

        const nextTrackingCode = updateData.tracking_code
            ? updateData.tracking_code.toUpperCase()
            : null;
        const oldTrackingCode = shipment.tracking_code;
        const oldCarrier = shipment.carrier;
        const oldAdminNotes = shipment.admin_notes || null;

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            shipment.$session(session);

            if (
                nextTrackingCode &&
                nextTrackingCode !== shipment.tracking_code
            ) {
                const existingShipment = await Shipment.findOne({
                    _id: { $ne: shipment._id },
                    tracking_code: nextTrackingCode,
                    is_deleted: false,
                }).session(session);

                if (existingShipment) {
                    throw new AppError(
                        'Tracking code already exists',
                        409,
                        'TRACKING_CODE_DUPLICATE'
                    );
                }

                shipment.tracking_code = nextTrackingCode;
            }

            if (updateData.carrier) {
                shipment.carrier = updateData.carrier;
            }

            if (Object.prototype.hasOwnProperty.call(updateData, 'admin_notes')) {
                shipment.admin_notes = updateData.admin_notes;
            }

            shipment.updated_at = new Date();

            await shipment.save({ session });

            if (
                shipment.tracking_code !== oldTrackingCode ||
                shipment.carrier !== oldCarrier
            ) {
                await this._syncOrderShipmentSnapshot(
                    shipment,
                    oldTrackingCode,
                    adminUserId,
                    { session }
                );
            }

            await session.commitTransaction();
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }

        const changes = {};

        if (shipment.tracking_code !== oldTrackingCode) {
            changes.tracking_code = {
                from: oldTrackingCode,
                to: shipment.tracking_code,
            };
        }

        if (shipment.carrier !== oldCarrier) {
            changes.carrier = {
                from: oldCarrier,
                to: shipment.carrier,
            };
        }

        if (Object.prototype.hasOwnProperty.call(updateData, 'admin_notes')) {
            changes.admin_notes = {
                from: oldAdminNotes,
                to: shipment.admin_notes || null,
            };
        }

        changes.order_shipment_synced = {
            from: false,
            to: shipment.tracking_code !== oldTrackingCode ||
                shipment.carrier !== oldCarrier,
        };

        await this._createShipmentAuditLog({
            action: AUDIT_ACTIONS.ADMIN_UPDATE_SHIPMENT,
            shipment,
            actorId: adminUserId,
            metadata,
            changes,
        });

        logger.info({
            event: 'shipment_admin_updated',
            shipment_id: shipmentId,
            order_id: shipment.order_id.toString(),
            admin_user_id: adminUserId,
            carrier: shipment.carrier,
            tracking_code: shipment.tracking_code,
        });

        return ShipmentMapper.toAdminDTO(shipment);
    }

    static async _markOrderShipped(
        orderId,
        shipment,
        changedBy = null,
        options = {}
    ) {
        const query = Order.findById(orderId);

        if (options.session) {
            query.session(options.session);
        }

        const order = await query;

        if (!order) {
            throw new AppError(
                'Order not found',
                404,
                'ORDER_NOT_FOUND'
            );
        }

        if (order.status !== 'PROCESSING') {
            throw new AppError(
                'Only PROCESSING orders can be shipped',
                409,
                'INVALID_ORDER_STATUS'
            );
        }

        const shippedAt = new Date();

        order.shipment = {
            carrier: shipment.carrier,
            tracking_code: shipment.tracking_code,
            shipped_at: shippedAt,
        };
        order.shipment_id = shipment._id;

        order.addStatusTransition(
            'SHIPPED',
            changedBy,
            `Shipped via ${shipment.carrier}`
        );

        await order.save({ session: options.session });

        return order;
    }

    static async _syncOrderShipmentSnapshot(
        shipment,
        oldTrackingCode,
        changedBy = null,
        options = {}
    ) {
        const query = Order.findById(shipment.order_id);

        if (options.session) {
            query.session(options.session);
        }

        const order = await query;

        if (!order) {
            return null;
        }

        const matchesShipmentId =
            order.shipment_id &&
            order.shipment_id.toString() === shipment._id.toString();
        const matchesTrackingCode =
            order.shipment?.tracking_code &&
            order.shipment.tracking_code === oldTrackingCode;

        if (!matchesShipmentId && !matchesTrackingCode) {
            return order;
        }

        order.shipment = {
            ...(order.shipment?.toObject
                ? order.shipment.toObject()
                : order.shipment || {}),
            carrier: shipment.carrier,
            tracking_code: shipment.tracking_code,
        };
        order.shipment_id = shipment._id;

        if (changedBy) {
            order.status_history.push({
                from: order.status,
                to: order.status,
                changed_at: new Date(),
                changed_by: changedBy,
                note: 'Shipment tracking details updated',
            });
        }

        await order.save({ session: options.session });

        return order;
    }

    static async _markOrderDelivered(
        orderId,
        changedBy = null,
        options = {}
    ) {
        const query = Order.findById(orderId);

        if (options.session) {
            query.session(options.session);
        }

        const order = await query;

        if (!order) {
            throw new AppError(
                'Order not found',
                404,
                'ORDER_NOT_FOUND'
            );
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
        order.addStatusTransition(
            'DELIVERED',
            changedBy,
            'Delivery confirmed'
        );

        await order.save({ session: options.session });

        return order;
    }

    static async _returnOrderToProcessing(
        orderId,
        changedBy = null,
        reason = '',
        options = {}
    ) {
        const query = Order.findById(orderId);

        if (options.session) {
            query.session(options.session);
        }

        const order = await query;

        if (!order) {
            throw new AppError(
                'Order not found',
                404,
                'ORDER_NOT_FOUND'
            );
        }

        if (order.status === 'PROCESSING') {
            return order;
        }

        if (order.status !== 'SHIPPED') {
            throw new AppError(
                'Only SHIPPED orders can return to processing',
                409,
                'INVALID_ORDER_STATUS'
            );
        }

        order.addStatusTransition(
            'PROCESSING',
            changedBy,
            reason || 'Shipment cancelled'
        );

        await order.save({ session: options.session });

        return order;
    }

    // ===== INTERNAL HELPERS =====

    static async auditShipmentWebhookRejected(
        carrier,
        payload = {},
        error,
        metadata = {}
    ) {
        await ShipmentAuditLogService.createLog({
            actor_id: null,
            action: AUDIT_ACTIONS.SHIPMENT_WEBHOOK_REJECTED,
            shipment_id: null,
            order_id: null,
            user_id: null,
            carrier: carrier || null,
            tracking_code: payload.tracking_code || null,
            status: null,
            changes: {
                webhook_status: {
                    from: null,
                    to: payload.status || null,
                },
                error_code: {
                    from: null,
                    to: error?.code || error?.errorCode || 'WEBHOOK_REJECTED',
                },
                message: {
                    from: null,
                    to: error?.message || 'Shipment webhook rejected',
                },
            },
            ip_address: metadata.ip || null,
            user_agent: metadata.userAgent || null,
        });
    }

    static async _createShipmentAuditLog({
        action,
        shipment,
        actorId = null,
        metadata = {},
        changes = {},
    }) {
        await ShipmentAuditLogService.createLog({
            actor_id: actorId,
            action,
            shipment_id: shipment?._id || null,
            order_id: shipment?.order_id || null,
            user_id: shipment?.user_id || null,
            carrier: shipment?.carrier || null,
            tracking_code: shipment?.tracking_code || null,
            status: shipment?.status || null,
            changes,
            ip_address: metadata.ip || null,
            user_agent: metadata.userAgent || null,
        });
    }

    static _mapCarrierStatus(carrierStatus) {
        const normalizedStatus = String(carrierStatus || '').toLowerCase();
        const mapping = {
            'ready_to_pick': 'pending',
            'picked': 'picked_up',
            'in_transit': 'in_transit',
            'at_hub': 'at_destination',
            'at_destination': 'at_destination',
            'delivered': 'delivered',
            'failed': 'failed',
            'returned': 'returned',
        };

        return mapping[normalizedStatus] || null;
    }

    static _verifyCarrierWebhookSignature(carrier, payload, signature) {
        if (!signature) {
            return false;
        }

        const secret =
            process.env[`SHIPMENT_WEBHOOK_SECRET_${carrier}`] ||
            process.env.SHIPMENT_WEBHOOK_SECRET;

        if (!secret) {
            return false;
        }

        const timestamp = Number(payload.timestamp);

        if (
            !Number.isFinite(timestamp) ||
            Math.abs(Math.floor(Date.now() / 1000) - timestamp) > 600
        ) {
            return false;
        }

        const signData = this._buildCarrierWebhookSignData(carrier, payload);
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(signData)
            .digest('hex');

        const receivedBuffer = Buffer.from(String(signature).toLowerCase(), 'utf8');
        const expectedBuffer = Buffer.from(expectedSignature.toLowerCase(), 'utf8');

        if (receivedBuffer.length !== expectedBuffer.length) {
            return false;
        }

        return crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
    }

    static _buildCarrierWebhookSignData(carrier, payload) {
        return [
            carrier,
            String(payload.tracking_code || '').toUpperCase(),
            String(payload.status || ''),
            String(payload.timestamp || ''),
            this._stableStringify(payload.carrier_details || {}),
        ].join('.');
    }

    static _stableStringify(value) {
        if (value === null || typeof value !== 'object') {
            return JSON.stringify(value);
        }

        if (Array.isArray(value)) {
            return `[${value.map((item) => this._stableStringify(item)).join(',')}]`;
        }

        return `{${Object.keys(value)
            .sort()
            .map((key) => `${JSON.stringify(key)}:${this._stableStringify(value[key])}`)
            .join(',')}}`;
    }

    static _getStatusTimestampField(status) {
        const mapping = {
            'picked_up': 'picked_up_at',
            'in_transit': 'in_transit_at',
            'at_destination': 'at_destination_at',
            'delivered': 'delivered_at',
            'failed': 'failed_at',
            'cancelled': 'cancelled_at',
            'returned': 'returned_at',
        };

        return mapping[status] || null;
    }

    static _buildTrackingUrl(carrier, trackingCode) {
        if (!trackingCode) return null;

        const urls = {
            GHN: `https://khachhang.ghn.vn/tracking?order_code=${trackingCode}`,
            GHTK: `https://tracking.ghtk.vn/?order_code=${trackingCode}`,
            JT: `https://www.jtexpress.vn/tracking?no=${trackingCode}`,
            GRAB: `https://grab.com/vn/en/tracking/`,
            BEST: `https://tracking.best.vn/?number=${trackingCode}`,
        };

        return urls[carrier] || null;
    }

    static _getNextRetryTime(lastRetryAt) {
        if (!lastRetryAt) return new Date(); // Can retry immediately

        const nextRetryTime = new Date(lastRetryAt);
        nextRetryTime.setHours(nextRetryTime.getHours() + 48);

        return nextRetryTime;
    }
}

module.exports = ShipmentService;
