const mongoose = require('mongoose');
const Shipment = require('./shipment.model');
const ShipmentMapper = require('./shipment.mapper');
const AppError = require('../../utils/appError.util');

// Import dependencies
const Order = require('../orders/order.model');

// ✅ Logger utility (structured JSON logging)
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

/**
 * ============================================
 * SHIPMENT SERVICE
 * ============================================
 * 
 * ✅ Static class pattern (consistent with Order/Payment services)
 * ✅ Business logic layer: validation, stock management, state transitions
 * ✅ Delegates to model for DB operations
 * ✅ Returns DTOs via mapper (never raw MongoDB docs)
 * ✅ Uses asyncHandler in controller (no try/catch here)
 * 
 * CRITICAL RULES:
 * ✅ user_id on EVERY query (ownership check)
 * ✅ Shipping address snapshot (immutable, from order)
 * ✅ Tracking code unique (prevent duplicates)
 * ✅ Status follows state machine (pending → delivered/failed/cancelled)
 * ✅ Soft delete for audit trail
 * ✅ Detailed timeline for RCA
 * ✅ Retry logic for failed deliveries (max 3 attempts)
 */

class ShipmentService {
    /**
     * ✅ CREATE SHIPMENT: Initialize shipment for confirmed order
     * 
     * Flow:
     * 1. Verify order exists + belongs to user + status is confirmed
     * 2. Validate carrier + tracking code (unique)
     * 3. Copy address snapshot from order (immutable)
     * 4. Initialize timeline with created_at
     * 5. Create Shipment with status pending
     * 6. Update Order status → shipping
     * 7. Log shipment event
     * 8. Return shipment DTO
     * 
     * ⚠️ CRITICAL: Address is snapshot (immutable after shipment creation)
     * ⚠️ CRITICAL: Tracking code must be unique per shipment
     * 
     * @param {String} userId - From JWT token (ownership check)
     * @param {String} orderId - Order MongoDB ID
     * @param {Object} shipmentData - { carrier, tracking_code, shipping_address }
     * @returns {Object} Created shipment DTO
     */
    static async createShipment(userId, orderId, shipmentData) {
        if (!userId || !orderId) {
            throw new AppError(
                'User ID and order ID required',
                400,
                'MISSING_REQUIRED_PARAMS'
            );
        }

        // ✅ 1. Verify order exists + user owns it + status is confirmed
        const order = await Order.findOne({
            _id: orderId,
            user_id: userId,
            status: 'CONFIRMED',
        });

        if (!order) {
            throw new AppError(
                'Order not found or not in confirmed status',
                404,
                'ORDER_NOT_FOUND'
            );
        }

        // ✅ 2. Validate carrier + tracking code
        const { carrier, tracking_code, shipping_address } = shipmentData;

        if (!carrier || !tracking_code) {
            throw new AppError(
                'Carrier and tracking code are required',
                400,
                'MISSING_CARRIER_OR_TRACKING_CODE'
            );
        }

        // ✅ Check tracking code uniqueness
        const existingShipment = await Shipment.findOne({
            tracking_code: tracking_code.toUpperCase(),
            is_deleted: false,
        });

        if (existingShipment) {
            throw new AppError(
                'Tracking code already exists',
                409,
                'TRACKING_CODE_DUPLICATE'
            );
        }

        // ✅ 3. Use provided address or fallback to order address
        const addressSnapshot = shipping_address || {
            recipient_name: order.shipping_address?.recipient_name,
            phone: order.shipping_address?.phone,
            address: order.shipping_address?.address,
            ward: order.shipping_address?.ward,
            district: order.shipping_address?.district,
            province: order.shipping_address?.province,
            postal_code: order.shipping_address?.postal_code,
            country: order.shipping_address?.country || 'Vietnam',
        };

        // ✅ 4. Create shipment with initialized timeline
        const shipment = await Shipment.create({
            order_id: orderId,
            user_id: userId,

            carrier,
            tracking_code: tracking_code.toUpperCase(),

            shipping_address: addressSnapshot,

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
        });

        // ✅ 5. Update order status → shipping
        await Order.updateOne(
            { _id: orderId },
            { status: 'SHIPPING', shipped_at: new Date() }
        );

        // ✅ 6. Log shipment creation
        logger.info({
            event: 'shipment_created',
            shipment_id: shipment._id.toString(),
            order_id: orderId,
            user_id: userId,
            carrier: carrier,
            tracking_code: tracking_code.toUpperCase(),
        });

        // ✅ 7. Return DTO
        return ShipmentMapper.toResponseDTO(shipment);
    }

    /**
     * ✅ READ: Get shipment by ID (with ownership check)
     * 
     * ⚠️ Customer can only see their own shipment
     * Admin can see all shipments (enforce in controller)
     * 
     * @param {String} shipmentId - Shipment MongoDB ID
     * @param {String} userId - From JWT token (null = admin mode)
     * @returns {Object} Shipment detail DTO
     */
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

    /**
     * ✅ READ: Get shipment by tracking code (public tracking)
     * 
     * Used for public tracking page (no auth required)
     * Returns minimal info
     * 
     * @param {String} trackingCode - Carrier tracking code
     * @returns {Object} Tracking DTO (minimal)
     */
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

    /**
     * ✅ READ: Get shipments for order (with ownership check)
     * 
     * Customer can only see shipments for their own order
     * 
     * @param {String} orderId - Order MongoDB ID
     * @param {String} userId - From JWT token (null = admin mode)
     * @returns {Array} Shipments (sorted by created_at DESC)
     */
    static async getShipmentsForOrder(orderId, userId = null) {
        // ✅ Verify order exists
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

        // ✅ Get shipments for order
        const shipments = await Shipment.find({
            order_id: orderId,
            is_deleted: false,
        }).sort({ created_at: -1 });

        return ShipmentMapper.toResponseDTOList(shipments);
    }

    /**
     * ✅ READ: Get user shipment history (paginated)
     * 
     * @param {String} userId - User MongoDB ID
     * @param {Number} page - Default 1
     * @param {Number} limit - Default 20, max 100
     * @param {Object} filters - { status, carrier, date_from, date_to }
     * @returns {Object} { data: [...], pagination: {...} }
     */
    static async getUserShipments(
        userId,
        page = 1,
        limit = 20,
        filters = {}
    ) {
        const skip = (page - 1) * limit;
        const query = { user_id: userId, is_deleted: false };

        // Filter by status
        if (filters.status) {
            if (Array.isArray(filters.status)) {
                query.status = { $in: filters.status };
            } else {
                query.status = filters.status;
            }
        }

        // Filter by carrier
        if (filters.carrier) {
            query.carrier = filters.carrier;
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

    /**
     * ✅ UPDATE: Record shipment status update (from carrier)
     * 
     * Flow:
     * 1. Verify shipment exists + not deleted
     * 2. Validate status transition (state machine)
     * 3. Add timestamp to timeline
     * 4. Update status
     * 5. If delivered: update order → completed
     * 6. Log status update
     * 7. Return updated shipment DTO
     * 
     * ⚠️ CRITICAL: Status follows state machine
     * pending → picked_up → in_transit → at_destination → delivered
     * Any status can → failed (on delivery failure)
     * Any status can → cancelled (admin action)
     * 
     * @param {String} shipmentId - Shipment MongoDB ID
     * @param {String} newStatus - New status
     * @param {Object} metadata - { notes, carrier_details }
     * @returns {Object} Updated shipment DTO
     */
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

        // ✅ Validate status transition
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

        // ✅ Add timestamp to timeline
        const timelineField = this._getStatusTimestampField(newStatus);
        const update = {
            $set: {
                status: newStatus,
                updated_at: new Date(),
            },
        };

        if (timelineField) {
            update.$set[`timeline.${timelineField}`] = new Date();
        }

        const updatedShipment = await Shipment.findByIdAndUpdate(
            shipmentId,
            update,
            { new: true }
        );

        // ✅ If delivered: update order → completed
        if (newStatus === 'delivered') {
            await Order.updateOne(
                { _id: updatedShipment.order_id },
                { status: 'COMPLETED', completed_at: new Date() }
            );
        }

        // ✅ Log status update
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

    /**
     * ✅ UPDATE: Record delivery failure
     * 
     * Flow:
     * 1. Verify shipment exists + in progress
     * 2. Store failure reason + notes
     * 3. Update status → failed
     * 4. Add failed_at timestamp
     * 5. Increment retry_count
     * 6. Log failure event
     * 7. If max_retries exceeded: mark as permanently failed
     * 8. Return updated shipment DTO
     * 
     * @param {String} shipmentId - Shipment MongoDB ID
     * @param {String} reason - Failure reason
     * @param {String} notes - Additional notes
     * @returns {Object} Updated shipment DTO
     */
    static async recordDeliveryFailure(shipmentId, reason, notes = '') {
        const shipment = await Shipment.findById(shipmentId);

        if (!shipment) {
            throw new AppError(
                'Shipment not found',
                404,
                'SHIPMENT_NOT_FOUND'
            );
        }

        // ✅ Can only fail in-progress shipments
        if (!shipment.isInProgress()) {
            throw new AppError(
                'Cannot fail shipment that is not in progress',
                409,
                'INVALID_SHIPMENT_STATUS'
            );
        }

        // ✅ Update failure info + status
        shipment.status = 'failed';
        shipment.failure_reason = reason;
        shipment.failure_notes = notes;
        shipment.retry_count = (shipment.retry_count || 0) + 1;
        shipment.timeline.failed_at = new Date();
        shipment.updated_at = new Date();

        await shipment.save();

        // ✅ Log failure
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

    /**
     * ✅ UPDATE: Retry failed shipment
     * 
     * Flow:
     * 1. Verify shipment exists + status is failed
     * 2. Verify retry_count < max_retries
     * 3. Reset status → pending
     * 4. Clear failure info
     * 5. Update last_retry_at
     * 6. Notify carrier (optional)
     * 7. Log retry event
     * 8. Return updated shipment DTO
     * 
     * @param {String} shipmentId - Shipment MongoDB ID
     * @returns {Object} Updated shipment DTO
     */
    static async retryFailedShipment(shipmentId) {
        const shipment = await Shipment.findById(shipmentId);

        if (!shipment) {
            throw new AppError(
                'Shipment not found',
                404,
                'SHIPMENT_NOT_FOUND'
            );
        }

        // ✅ Verify status is failed
        if (shipment.status !== 'failed') {
            throw new AppError(
                'Can only retry failed shipments',
                409,
                'INVALID_SHIPMENT_STATUS'
            );
        }

        // ✅ Verify retry limit not exceeded
        if (shipment.retry_count >= shipment.max_retries) {
            throw new AppError(
                `Max retries (${shipment.max_retries}) exceeded`,
                409,
                'MAX_RETRIES_EXCEEDED'
            );
        }

        // ✅ Reset to pending + clear failure info
        shipment.status = 'pending';
        shipment.failure_reason = null;
        shipment.failure_notes = null;
        shipment.last_retry_at = new Date();
        shipment.timeline.failed_at = null;
        shipment.updated_at = new Date();

        await shipment.save();

        // ✅ Log retry
        logger.info({
            event: 'shipment_retry',
            shipment_id: shipmentId,
            order_id: shipment.order_id.toString(),
            retry_count: shipment.retry_count,
            carrier: shipment.carrier,
        });

        return ShipmentMapper.toDetailDTO(shipment);
    }

    /**
     * ✅ UPDATE: Cancel shipment (before delivery)
     * 
     * Flow:
     * 1. Verify shipment exists + cancellable
     * 2. Validate cancellation reason
     * 3. Update status → cancelled
     * 4. Add cancelled_at timestamp
     * 5. Revert order status → confirmed (for potential re-ship)
     * 6. Log cancellation event
     * 7. Return updated shipment DTO
     * 
     * ⚠️ Can only cancel in-progress shipments
     * Terminal states (delivered, cancelled, returned) cannot be cancelled
     * 
     * @param {String} shipmentId - Shipment MongoDB ID
     * @param {String} reason - Cancellation reason
     * @returns {Object} Updated shipment DTO
     */
    static async cancelShipment(shipmentId, reason) {
        const shipment = await Shipment.findById(shipmentId);

        if (!shipment) {
            throw new AppError(
                'Shipment not found',
                404,
                'SHIPMENT_NOT_FOUND'
            );
        }

        // ✅ Verify shipment is cancellable
        if (!shipment.canBeCancelled()) {
            throw new AppError(
                'Cannot cancel shipment in current status',
                409,
                'CANNOT_CANCEL_SHIPMENT'
            );
        }

        // ✅ Cancel shipment
        shipment.status = 'cancelled';
        shipment.failure_notes = reason;
        shipment.timeline.cancelled_at = new Date();
        shipment.updated_at = new Date();

        await shipment.save();

        // ✅ Revert order status → confirmed (can re-ship)
        await Order.updateOne(
            { _id: shipment.order_id },
            { status: 'CONFIRMED' }
        );

        // ✅ Log cancellation
        logger.info({
            event: 'shipment_cancelled',
            shipment_id: shipmentId,
            order_id: shipment.order_id.toString(),
            cancellation_reason: reason,
        });

        return ShipmentMapper.toDetailDTO(shipment);
    }

    /**
     * ✅ UPDATE: Confirm delivery (manual or system)
     * 
     * Flow:
     * 1. Verify shipment exists + status is at_destination
     * 2. Update status → delivered
     * 3. Add delivered_at timestamp
     * 4. Update order → completed
     * 5. Log delivery confirmation
     * 6. Return updated shipment DTO
     * 
     * @param {String} shipmentId - Shipment MongoDB ID
     * @returns {Object} Updated shipment DTO
     */
    static async confirmDelivery(shipmentId) {
        const shipment = await Shipment.findById(shipmentId);

        if (!shipment) {
            throw new AppError(
                'Shipment not found',
                404,
                'SHIPMENT_NOT_FOUND'
            );
        }

        // ✅ Can deliver from at_destination or in_transit (carrier edge case)
        if (
            !['in_transit', 'at_destination'].includes(shipment.status)
        ) {
            throw new AppError(
                'Cannot confirm delivery for shipment not in transit',
                409,
                'INVALID_SHIPMENT_STATUS'
            );
        }

        // ✅ Update shipment
        shipment.status = 'delivered';
        shipment.timeline.delivered_at = new Date();
        shipment.updated_at = new Date();

        await shipment.save();

        // ✅ Update order → completed
        await Order.updateOne(
            { _id: shipment.order_id },
            { status: 'COMPLETED', completed_at: new Date() }
        );

        // ✅ Log delivery
        logger.info({
            event: 'shipment_delivered',
            shipment_id: shipmentId,
            order_id: shipment.order_id.toString(),
            carrier: shipment.carrier,
        });

        return ShipmentMapper.toDetailDTO(shipment);
    }

    /**
     * ✅ UPDATE: Mark shipment as returned (refund scenario)
     * 
     * Flow:
     * 1. Verify shipment exists + status is at_destination or failed
     * 2. Update status → returned
     * 3. Add returned_at timestamp
     * 4. Log return event
     * 5. Return updated shipment DTO
     * 
     * @param {String} shipmentId - Shipment MongoDB ID
     * @returns {Object} Updated shipment DTO
     */
    static async markAsReturned(shipmentId) {
        const shipment = await Shipment.findById(shipmentId);

        if (!shipment) {
            throw new AppError(
                'Shipment not found',
                404,
                'SHIPMENT_NOT_FOUND'
            );
        }

        // ✅ Can mark as returned from failed or at_destination
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

        // ✅ Update shipment
        shipment.status = 'returned';
        shipment.timeline.returned_at = new Date();
        shipment.updated_at = new Date();

        await shipment.save();

        // ✅ Log return
        logger.info({
            event: 'shipment_returned',
            shipment_id: shipmentId,
            order_id: shipment.order_id.toString(),
        });

        return ShipmentMapper.toDetailDTO(shipment);
    }

    /**
     * ✅ ADMIN: Get all shipments (with filters)
     * 
     * @param {Number} page
     * @param {Number} limit
     * @param {Object} filters - { status, carrier, user_id, order_id, date_from, date_to }
     * @returns {Object} { data: [...], pagination: {...} }
     */
    static async getAllShipments(page = 1, limit = 20, filters = {}) {
        const skip = (page - 1) * limit;
        const query = { is_deleted: false };

        // Filter by status
        if (filters.status) {
            if (Array.isArray(filters.status)) {
                query.status = { $in: filters.status };
            } else {
                query.status = filters.status;
            }
        }

        // Filter by carrier
        if (filters.carrier) {
            query.carrier = filters.carrier;
        }

        // Filter by user
        if (filters.user_id) {
            query.user_id = filters.user_id;
        }

        // Filter by order
        if (filters.order_id) {
            query.order_id = filters.order_id;
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

    /**
     * ✅ ADMIN: Get shipment statistics
     * 
     * @returns {Object} Stats (delivery rates, avg time, status breakdown)
     */
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

    /**
     * ✅ ADMIN: Get pending shipments (for retry batch processing)
     * 
     * @returns {Array} Shipments ready for retry
     */
    static async getPendingRetryShipments() {
        return Shipment.find({
            status: 'failed',
            retry_count: { $lt: 3 },
            is_deleted: false,
        })
            .sort({ last_retry_at: 1 })
            .lean();
    }

    /**
     * ✅ SOFT DELETE: Soft-delete shipment (admin action)
     * 
     * @param {String} shipmentId
     * @returns {Object} Deleted shipment DTO
     */
    static async softDeleteShipment(shipmentId) {
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

        return ShipmentMapper.toAdminDTO(shipment);
    }

    // ===== INTERNAL HELPERS =====

    /**
     * ✅ INTERNAL: Map carrier status to system status
     * 
     * @private
     * @param {String} carrierStatus - Status from carrier API
     * @returns {String} System status (or 'pending' if unknown)
     */
    static _mapCarrierStatus(carrierStatus) {
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

        return mapping[carrierStatus] || 'pending';
    }

    /**
     * ✅ INTERNAL: Get timeline field name for status
     * 
     * @private
     * @param {String} status - Shipment status
     * @returns {String|null} Timeline field name
     */
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

    /**
     * ✅ INTERNAL: Build tracking URL
     * 
     * @private
     * @param {String} carrier
     * @param {String} trackingCode
     * @returns {String|null} Tracking URL
     */
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

    /**
     * ✅ INTERNAL: Calculate next retry time (48 hours)
     * 
     * @private
     * @param {Date} lastRetryAt
     * @returns {Date} Next retry available time
     */
    static _getNextRetryTime(lastRetryAt) {
        if (!lastRetryAt) return new Date(); // Can retry immediately

        const nextRetryTime = new Date(lastRetryAt);
        nextRetryTime.setHours(nextRetryTime.getHours() + 48);

        return nextRetryTime;
    }
}

module.exports = ShipmentService;