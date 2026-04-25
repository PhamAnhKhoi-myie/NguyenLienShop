/**
 * Shipment DTO Mapper
 * Transform between MongoDB documents and API responses
 * 
 * ✅ Hide: internal fields (_id, __v, is_deleted, deleted_at)
 * ✅ Expose: id, order_id, carrier, tracking_code, status, timeline, failure_info
 * ✅ Nest: shipping_address (snapshot), timeline details, failure tracking
 * ✅ Security: Never expose raw webhook data
 */

class ShipmentMapper {
    /**
     * ✅ Convert Mongoose document → API Response DTO (basic)
     * 
     * Dùng cho: Shipment listing, create/update returns
     * Include: shipment summary + status + tracking
     */
    static toResponseDTO(shipment) {
        if (!shipment) {
            return null;
        }

        const doc = shipment.toObject ? shipment.toObject() : shipment;

        return {
            id: doc._id?.toString(),

            // ✅ References
            order_id: doc.order_id?.toString(),
            user_id: doc.user_id?.toString(),

            // ✅ Carrier info
            carrier: doc.carrier,
            tracking_code: doc.tracking_code,

            // ✅ Tracking URL for customer
            tracking_url: this.buildTrackingUrl(
                doc.carrier,
                doc.tracking_code
            ),

            // ✅ Address snapshot
            shipping_address: {
                recipient_name: doc.shipping_address?.recipient_name,
                phone: doc.shipping_address?.phone,
                address: doc.shipping_address?.address,
                ward: doc.shipping_address?.ward,
                district: doc.shipping_address?.district,
                province: doc.shipping_address?.province,
                postal_code: doc.shipping_address?.postal_code,
                country: doc.shipping_address?.country || 'Vietnam',
            },

            // ✅ Status (state machine)
            status: doc.status,
            status_label: this.getStatusLabel(doc.status),

            // ✅ Timeline (key timestamps)
            timeline: {
                created_at: doc.timeline?.created_at,
                picked_up_at: doc.timeline?.picked_up_at || null,
                in_transit_at: doc.timeline?.in_transit_at || null,
                at_destination_at: doc.timeline?.at_destination_at || null,
                delivered_at: doc.timeline?.delivered_at || null,
                failed_at: doc.timeline?.failed_at || null,
                cancelled_at: doc.timeline?.cancelled_at || null,
                returned_at: doc.timeline?.returned_at || null,
            },

            // ✅ Progress indicator
            progress: this.calculateProgress(doc.status),

            // ✅ Failure info (if applicable)
            failure: doc.status === 'failed'
                ? {
                    reason: doc.failure_reason,
                    notes: doc.failure_notes,
                    retry_count: doc.retry_count || 0,
                    max_retries: doc.max_retries || 3,
                    can_retry: this.canBeRetried(doc),
                    last_retry_at: doc.last_retry_at || null,
                }
                : null,

            // ✅ Timestamps
            created_at: doc.created_at,
            updated_at: doc.updated_at,
        };
    }

    /**
     * ✅ Convert array of documents → array of DTOs
     * 
     * Dùng cho: Shipment listing endpoints
     */
    static toResponseDTOList(shipments) {
        if (!Array.isArray(shipments) || shipments.length === 0) {
            return [];
        }

        return shipments.map((shipment) =>
            this.toResponseDTO(shipment)
        );
    }

    /**
     * ✅ Convert to List Item DTO (lightweight for listing)
     * 
     * Dùng cho: Shipment history listing, order shipments table
     * Include: minimal info for cards/rows
     */
    static toListDTO(shipment) {
        if (!shipment) {
            return null;
        }

        const doc = shipment.toObject ? shipment.toObject() : shipment;

        return {
            id: doc._id?.toString(),
            order_id: doc.order_id?.toString(),

            // ✅ Quick identification
            carrier: doc.carrier,
            tracking_code: doc.tracking_code,

            // ✅ Status for filtering/display
            status: doc.status,
            status_label: this.getStatusLabel(doc.status),
            progress: this.calculateProgress(doc.status),

            // ✅ Recipient info (summary)
            recipient_name: doc.shipping_address?.recipient_name,
            destination: this.formatDestination(
                doc.shipping_address?.district,
                doc.shipping_address?.province
            ),

            // ✅ Key dates for sorting
            created_at: doc.created_at,
            delivered_at: doc.timeline?.delivered_at || null,
        };
    }

    /**
     * ✅ Convert to Detail DTO (full information)
     * 
     * Dùng cho: GET /shipments/:id (full shipment detail)
     * Include: everything for customer/admin view
     */
    static toDetailDTO(shipment) {
        if (!shipment) {
            return null;
        }

        // Start with full response
        const responseDTO = this.toResponseDTO(shipment);

        const doc = shipment.toObject ? shipment.toObject() : shipment;

        return {
            ...responseDTO,

            // ✅ Full address for detail view
            shipping_address: {
                recipient_name: doc.shipping_address?.recipient_name,
                phone: doc.shipping_address?.phone,
                address: doc.shipping_address?.address,
                ward: doc.shipping_address?.ward,
                district: doc.shipping_address?.district,
                province: doc.shipping_address?.province,
                postal_code: doc.shipping_address?.postal_code,
                country: doc.shipping_address?.country || 'Vietnam',
                // ✅ Formatted address for display
                formatted_address: this.formatFullAddress(
                    doc.shipping_address
                ),
            },

            // ✅ Full timeline with labels
            timeline: this.transformTimelineDetail(doc.timeline),

            // ✅ Detailed failure info (if failed)
            failure: doc.status === 'failed'
                ? {
                    reason: doc.failure_reason,
                    reason_label: this.getFailureReasonLabel(
                        doc.failure_reason
                    ),
                    notes: doc.failure_notes,
                    retry_count: doc.retry_count || 0,
                    max_retries: doc.max_retries || 3,
                    can_retry: this.canBeRetried(doc),
                    last_retry_at: doc.last_retry_at,
                    next_retry_available_at: this.getNextRetryTime(
                        doc.last_retry_at
                    ),
                }
                : null,

            // ✅ Actions available (for UI)
            actions: {
                can_retry: this.canBeRetried(doc),
                can_cancel: this.canBeCancelled(doc),
                can_view_tracking: !!doc.tracking_code,
            },
        };
    }

    /**
     * ✅ Convert for Customer View (hide sensitive data)
     * 
     * Dùng cho: Shipment tracking for logged-in customer
     * Hide: internal IDs, admin notes
     */
    static toCustomerDTO(shipment) {
        if (!shipment) {
            return null;
        }

        const detailDTO = this.toDetailDTO(shipment);

        return {
            id: detailDTO.id,
            order_id: detailDTO.order_id,

            // ✅ Carrier & tracking
            carrier: detailDTO.carrier,
            tracking_code: detailDTO.tracking_code,
            tracking_url: detailDTO.tracking_url,

            // ✅ Recipient info
            shipping_address: {
                recipient_name: detailDTO.shipping_address.recipient_name,
                phone: detailDTO.shipping_address.phone,
                address: detailDTO.shipping_address.address,
                ward: detailDTO.shipping_address.ward,
                district: detailDTO.shipping_address.district,
                province: detailDTO.shipping_address.province,
            },

            // ✅ Status & progress
            status: detailDTO.status,
            status_label: detailDTO.status_label,
            progress: detailDTO.progress,

            // ✅ Timeline (customer-visible milestones)
            timeline: {
                created_at: detailDTO.timeline.created_at,
                picked_up_at: detailDTO.timeline.picked_up_at,
                in_transit_at: detailDTO.timeline.in_transit_at,
                at_destination_at: detailDTO.timeline.at_destination_at,
                delivered_at: detailDTO.timeline.delivered_at,
                failed_at: detailDTO.timeline.failed_at,
            },

            // ✅ Estimated delivery
            estimated_delivery: this.estimateDeliveryDate(
                detailDTO.timeline.created_at
            ),

            // ✅ Failure info (if applicable)
            failure: detailDTO.failure,

            // ✅ Actions available
            actions: detailDTO.actions,
        };
    }

    /**
     * ✅ Convert for Admin Dashboard (full transparency)
     * 
     * Dùng cho: Admin panel, shipment management, analytics
     * Include: all info for operations
     */
    static toAdminDTO(shipment) {
        if (!shipment) {
            return null;
        }

        const detailDTO = this.toDetailDTO(shipment);
        const doc = shipment.toObject ? shipment.toObject() : shipment;

        return {
            ...detailDTO,

            // ✅ User reference
            user_id: doc.user_id?.toString(),

            // ✅ Retry management
            retry_count: doc.retry_count || 0,
            max_retries: doc.max_retries || 3,
            last_retry_at: doc.last_retry_at,

            // ✅ Soft delete info
            is_deleted: doc.is_deleted || false,
            deleted_at: doc.deleted_at || null,

            // ✅ Timestamps
            created_at: doc.created_at,
            updated_at: doc.updated_at,
        };
    }

    /**
     * ✅ Convert for Tracking Page (public, minimal)
     * 
     * Dùng cho: Public order tracking page (no auth required)
     * Include: status + timeline + tracking URL only
     */
    static toTrackingDTO(shipment) {
        if (!shipment) {
            return null;
        }

        const doc = shipment.toObject ? shipment.toObject() : shipment;

        return {
            order_id: doc.order_id?.toString(),

            // ✅ Current status
            status: doc.status,
            status_label: this.getStatusLabel(doc.status),
            progress: this.calculateProgress(doc.status),

            // ✅ Carrier tracking
            carrier: doc.carrier,
            tracking_code: doc.tracking_code,
            tracking_url: this.buildTrackingUrl(
                doc.carrier,
                doc.tracking_code
            ),

            // ✅ Timeline milestones
            timeline: this.buildTrackingTimeline(doc.timeline),

            // ✅ Recipient location (summary only)
            destination: this.formatDestination(
                doc.shipping_address?.district,
                doc.shipping_address?.province
            ),

            // ✅ Estimated delivery
            estimated_delivery: this.estimateDeliveryDate(
                doc.timeline?.created_at
            ),

            // ✅ Last update
            last_update: doc.updated_at,
        };
    }

    /**
     * ✅ Convert for Email Notification (human-readable)
     * 
     * Dùng cho: Order shipped/delivered email template
     * Include: summary + tracking info in friendly format
     */
    static toEmailDTO(shipment) {
        if (!shipment) {
            return null;
        }

        const doc = shipment.toObject ? shipment.toObject() : shipment;

        return {
            order_id: doc.order_id?.toString(),

            // ✅ Shipping notification
            carrier: this.getCarrierLabel(doc.carrier),
            tracking_code: doc.tracking_code,
            tracking_url: this.buildTrackingUrl(
                doc.carrier,
                doc.tracking_code
            ),

            // ✅ Recipient info
            recipient_name: doc.shipping_address?.recipient_name,
            recipient_phone: doc.shipping_address?.phone,
            delivery_address: this.formatFullAddress(
                doc.shipping_address
            ),

            // ✅ Status message
            status: doc.status,
            status_message: this.getEmailStatusMessage(
                doc.status,
                doc.carrier
            ),

            // ✅ Dates
            shipped_date: this.formatDate(doc.timeline?.created_at),
            estimated_delivery: this.estimateDeliveryDateText(
                doc.timeline?.created_at,
                doc.carrier
            ),

            // ✅ Call to action
            cta_text: 'Track Your Package',
            cta_url: this.buildTrackingUrl(
                doc.carrier,
                doc.tracking_code
            ),
        };
    }

    /**
     * ✅ Convert for Analytics/Report
     * 
     * Dùng cho: Export, reports, analytics dashboards
     * Include: flattened structure for tabular format
     */
    static toAnalyticsDTO(shipment) {
        if (!shipment) {
            return null;
        }

        const doc = shipment.toObject ? shipment.toObject() : shipment;

        const timeline = doc.timeline || {};
        const deliveryDuration = timeline.delivered_at
            ? Math.floor(
                (new Date(timeline.delivered_at) -
                    new Date(timeline.created_at)) /
                (1000 * 60 * 60 * 24)
            )
            : null;

        return {
            shipment_id: doc._id?.toString(),
            order_id: doc.order_id?.toString(),
            user_id: doc.user_id?.toString(),

            carrier: doc.carrier,
            tracking_code: doc.tracking_code,

            status: doc.status,
            is_successful: doc.status === 'delivered',
            is_failed: doc.status === 'failed',

            delivery_duration_days: deliveryDuration,

            created_date: this.formatDateISO(timeline.created_at),
            delivered_date: this.formatDateISO(timeline.delivered_at),
            failed_date: this.formatDateISO(timeline.failed_at),

            failure_reason: doc.failure_reason || '',
            retry_count: doc.retry_count || 0,

            destination_province: doc.shipping_address?.province,
            destination_district: doc.shipping_address?.district,
        };
    }

    // =========== TIMELINE HELPERS ===========

    /**
     * ✅ Transform timeline for detail view (with labels)
     */
    static transformTimelineDetail(timeline) {
        if (!timeline) {
            return null;
        }

        return {
            created_at: {
                timestamp: timeline.created_at,
                label: 'Order Confirmed',
                label_vi: 'Đơn hàng được xác nhận',
                completed: true,
            },
            picked_up_at: timeline.picked_up_at
                ? {
                    timestamp: timeline.picked_up_at,
                    label: 'Package Picked Up',
                    label_vi: 'Đã lấy hàng',
                    completed: true,
                }
                : null,
            in_transit_at: timeline.in_transit_at
                ? {
                    timestamp: timeline.in_transit_at,
                    label: 'In Transit',
                    label_vi: 'Đang vận chuyển',
                    completed: true,
                }
                : null,
            at_destination_at: timeline.at_destination_at
                ? {
                    timestamp: timeline.at_destination_at,
                    label: 'At Delivery Hub',
                    label_vi: 'Đã tới kho giao hàng',
                    completed: true,
                }
                : null,
            delivered_at: timeline.delivered_at
                ? {
                    timestamp: timeline.delivered_at,
                    label: 'Delivered',
                    label_vi: 'Đã giao',
                    completed: true,
                }
                : null,
            failed_at: timeline.failed_at
                ? {
                    timestamp: timeline.failed_at,
                    label: 'Delivery Failed',
                    label_vi: 'Giao hàng thất bại',
                    completed: true,
                }
                : null,
            cancelled_at: timeline.cancelled_at
                ? {
                    timestamp: timeline.cancelled_at,
                    label: 'Cancelled',
                    label_vi: 'Đã hủy',
                    completed: true,
                }
                : null,
            returned_at: timeline.returned_at
                ? {
                    timestamp: timeline.returned_at,
                    label: 'Returned',
                    label_vi: 'Đã trả lại',
                    completed: true,
                }
                : null,
        };
    }

    /**
     * ✅ Build tracking timeline (for public tracking page)
     */
    static buildTrackingTimeline(timeline) {
        if (!timeline) {
            return [];
        }

        const events = [
            {
                timestamp: timeline.created_at,
                status: 'created',
                label: 'Order Confirmed',
            },
            {
                timestamp: timeline.picked_up_at,
                status: 'picked_up',
                label: 'Package Picked Up',
            },
            {
                timestamp: timeline.in_transit_at,
                status: 'in_transit',
                label: 'In Transit',
            },
            {
                timestamp: timeline.at_destination_at,
                status: 'at_destination',
                label: 'At Delivery Hub',
            },
            {
                timestamp: timeline.delivered_at,
                status: 'delivered',
                label: 'Delivered',
            },
            {
                timestamp: timeline.failed_at,
                status: 'failed',
                label: 'Delivery Failed',
            },
        ];

        return events
            .filter((e) => e.timestamp)
            .map((e) => ({
                timestamp: e.timestamp,
                timestamp_formatted: this.formatDate(e.timestamp),
                status: e.status,
                label: e.label,
            }));
    }

    // =========== STATUS HELPERS ===========

    /**
     * ✅ Get status label (human-readable)
     */
    static getStatusLabel(status) {
        const labels = {
            pending: 'Pending',
            picked_up: 'Picked Up',
            in_transit: 'In Transit',
            at_destination: 'At Delivery Hub',
            delivered: 'Delivered',
            failed: 'Delivery Failed',
            cancelled: 'Cancelled',
            returned: 'Returned',
        };

        return labels[status] || status;
    }

    /**
     * ✅ Get status label in Vietnamese
     */
    static getStatusLabelVi(status) {
        const labels = {
            pending: 'Đang chờ',
            picked_up: 'Đã lấy hàng',
            in_transit: 'Đang vận chuyển',
            at_destination: 'Đã tới kho giao',
            delivered: 'Đã giao',
            failed: 'Giao thất bại',
            cancelled: 'Đã hủy',
            returned: 'Đã trả lại',
        };

        return labels[status] || status;
    }

    /**
     * ✅ Get failure reason label
     */
    static getFailureReasonLabel(reason) {
        const labels = {
            address_incorrect: 'Address Incorrect/Invalid',
            recipient_unavailable: 'Recipient Unavailable',
            refused_delivery: 'Customer Refused',
            damaged_package: 'Package Damaged',
            lost: 'Package Lost',
            weather_delay: 'Weather Delay',
            carrier_error: 'Carrier Error',
            other: 'Other Reason',
        };

        return labels[reason] || reason;
    }

    /**
     * ✅ Get failure reason label in Vietnamese
     */
    static getFailureReasonLabelVi(reason) {
        const labels = {
            address_incorrect: 'Địa chỉ sai/không tồn tại',
            recipient_unavailable: 'Người nhận không có mặt',
            refused_delivery: 'Khách hàng từ chối',
            damaged_package: 'Hàng hóa bị hư hỏng',
            lost: 'Gói hàng bị mất',
            weather_delay: 'Trì hoãn do thời tiết',
            carrier_error: 'Lỗi của đơn vị vận chuyển',
            other: 'Lý do khác',
        };

        return labels[reason] || reason;
    }

    /**
     * ✅ Calculate progress (0-100%) based on status
     */
    static calculateProgress(status) {
        const progressMap = {
            pending: 10,
            picked_up: 25,
            in_transit: 50,
            at_destination: 75,
            delivered: 100,
            failed: 0,
            cancelled: 0,
            returned: 50,
        };

        return progressMap[status] || 0;
    }

    /**
     * ✅ Get email status message
     */
    static getEmailStatusMessage(status, carrier) {
        const carrierName = this.getCarrierLabel(carrier);

        const messages = {
            pending: `Your order has been confirmed and is being prepared for shipment by ${carrierName}.`,
            picked_up: `Your package has been picked up by ${carrierName} and is on its way.`,
            in_transit: `Your package is in transit with ${carrierName}. Track your delivery below.`,
            at_destination: `Your package has arrived at the local delivery hub and will be delivered soon.`,
            delivered: `Your package has been delivered successfully! Thank you for your purchase.`,
            failed: `Delivery attempt failed. Please contact support or check the tracking details.`,
            cancelled: 'Your shipment has been cancelled.',
            returned: 'Your package has been returned to the sender.',
        };

        return messages[status] || 'Your package is on the way.';
    }

    // =========== CARRIER HELPERS ===========

    /**
     * ✅ Get carrier label
     */
    static getCarrierLabel(carrier) {
        const labels = {
            GHN: 'Giao Hàng Nhanh',
            GHTK: 'Giao Hàng Tiết Kiệm',
            JT: 'J&T Express',
            GRAB: 'Grab Express',
            BEST: 'BEST Express',
            OTHER: 'Other Carrier',
        };

        return labels[carrier] || carrier;
    }

    /**
     * ✅ Build tracking URL based on carrier
     */
    static buildTrackingUrl(carrier, trackingCode) {
        if (!trackingCode) {
            return null;
        }

        const trackers = {
            GHN: `https://khachhang.ghn.vn/tracking?order_code=${trackingCode}`,
            GHTK: `https://tracking.ghtk.vn/?order_code=${trackingCode}`,
            JT: `https://www.jtexpress.vn/tracking?no=${trackingCode}`,
            GRAB: `https://grab.com/vn/en/tracking/`,
            BEST: `https://tracking.best.vn/?number=${trackingCode}`,
        };

        return trackers[carrier] || null;
    }

    /**
     * ✅ Get estimated delivery days by carrier
     */
    static getEstimatedDeliveryDays(carrier) {
        const days = {
            GHN: 3,
            GHTK: 3,
            JT: 3,
            GRAB: 1, // Same-day or next-day
            BEST: 5,
            OTHER: 7,
        };

        return days[carrier] || 5;
    }

    // =========== ADDRESS HELPERS ===========

    /**
     * ✅ Format address for display (one-liner)
     */
    static formatDestination(district, province) {
        const parts = [district, province].filter(Boolean);
        return parts.join(', ');
    }

    /**
     * ✅ Format full address for display
     */
    static formatFullAddress(address) {
        if (!address) {
            return '';
        }

        const parts = [
            address.address,
            address.ward,
            address.district,
            address.province,
            address.postal_code,
        ].filter(Boolean);

        return parts.join(', ');
    }

    // =========== DATE HELPERS ===========

    /**
     * ✅ Format date for display
     */
    static formatDate(date) {
        if (!date) {
            return null;
        }

        return new Date(date).toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    /**
     * ✅ Format date to ISO string
     */
    static formatDateISO(date) {
        if (!date) {
            return null;
        }

        return new Date(date).toISOString();
    }

    /**
     * ✅ Estimate delivery date
     */
    static estimateDeliveryDate(createdDate) {
        if (!createdDate) {
            return null;
        }

        const date = new Date(createdDate);
        date.setDate(date.getDate() + 3); // 3 days from now

        return date.toLocaleDateString('vi-VN');
    }

    /**
     * ✅ Estimate delivery date (text with range)
     */
    static estimateDeliveryDateText(createdDate, carrier = null) {
        if (!createdDate) {
            return 'Soon';
        }

        const days = carrier
            ? this.getEstimatedDeliveryDays(carrier)
            : 3;

        const date = new Date(createdDate);
        date.setDate(date.getDate() + days);

        return `Around ${date.toLocaleDateString('vi-VN', {
            month: 'short',
            day: 'numeric',
        })}`;
    }

    // =========== RETRY HELPERS ===========

    /**
     * ✅ Check if shipment can be retried
     */
    static canBeRetried(shipment) {
        return (
            shipment.status === 'failed' &&
            (shipment.retry_count || 0) < (shipment.max_retries || 3)
        );
    }

    /**
     * ✅ Check if shipment can be cancelled
     */
    static canBeCancelled(shipment) {
        return [
            'pending',
            'picked_up',
            'in_transit',
            'at_destination',
        ].includes(shipment.status);
    }

    /**
     * ✅ Get next retry time (48 hours after last retry)
     */
    static getNextRetryTime(lastRetryAt) {
        if (!lastRetryAt) {
            return new Date(); // Can retry immediately
        }

        const nextRetryTime = new Date(lastRetryAt);
        nextRetryTime.setHours(nextRetryTime.getHours() + 48);

        return nextRetryTime;
    }

    /**
     * ✅ Get time remaining for next retry (human-readable)
     */
    static getTimeUntilNextRetry(lastRetryAt) {
        if (!lastRetryAt) {
            return 'Available now';
        }

        const nextRetryTime = this.getNextRetryTime(lastRetryAt);
        const now = new Date();

        if (now >= nextRetryTime) {
            return 'Available now';
        }

        const diffHours = Math.ceil(
            (nextRetryTime - now) / (1000 * 60 * 60)
        );
        return `Available in ${diffHours} hours`;
    }

    // =========== VALIDATION HELPERS ===========

    /**
     * ✅ Validate shipment DTO before response
     */
    static validateDTO(shipment) {
        const errors = [];

        if (!shipment.id) errors.push('Shipment ID is required');
        if (!shipment.order_id) errors.push('Order ID is required');
        if (!shipment.carrier) errors.push('Carrier is required');
        if (!shipment.tracking_code) errors.push('Tracking code is required');
        if (!shipment.status) errors.push('Status is required');

        return {
            isValid: errors.length === 0,
            errors,
        };
    }
}

module.exports = ShipmentMapper;