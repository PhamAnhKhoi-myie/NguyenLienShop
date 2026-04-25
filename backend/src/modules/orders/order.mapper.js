/**
 * Order DTO Mapper
 * Transform between MongoDB documents and API responses
 * 
 * ✅ Hide: internal fields (_id, __v, is_deleted, deleted_at)
 * ✅ Expose: id, order_code, status, pricing, items with snapshots
 * ✅ Nest: items, payment, shipment details
 */

class OrderMapper {
    /**
     * ✅ Convert Mongoose document → API Response DTO (basic)
     * 
     * Dùng cho: Order listing, create/update returns
     * Include: order summary + items + pricing
     */
    static toResponseDTO(order) {
        if (!order) {
            return null;
        }

        const doc = order.toObject ? order.toObject() : order;

        return {
            id: doc._id?.toString(),
            order_code: doc.order_code,
            user_id: doc.user_id?.toString(),

            // ✅ Address snapshot
            address_snapshot: {
                street: doc.address_snapshot?.street,
                district: doc.address_snapshot?.district,
                city: doc.address_snapshot?.city,
                postal_code: doc.address_snapshot?.postal_code,
                country: doc.address_snapshot?.country,
                phone: doc.address_snapshot?.phone,
                recipient_name: doc.address_snapshot?.recipient_name,
            },

            // ✅ Order items (with snapshots)
            items: this.transformItems(doc.items || []),

            // ✅ Pricing breakdown
            pricing: {
                subtotal: doc.pricing?.subtotal || 0,
                shipping_fee: doc.pricing?.shipping_fee || 0,
                discount_amount: doc.pricing?.discount_amount || 0,
                total_amount: doc.pricing?.total_amount || 0,
                currency: doc.currency || 'VND',
            },

            // ✅ Discount snapshot
            discount: doc.discount
                ? {
                    code: doc.discount.code,
                    type: doc.discount.type,
                    value: doc.discount.value,
                    scope: doc.discount.scope || 'ORDER',
                    applied_amount: doc.discount.applied_amount,
                }
                : null,

            // ✅ Payment snapshot
            payment: {
                method: doc.payment?.method,
                status: doc.payment?.status,
                paid_at: doc.payment?.paid_at,
            },

            // ✅ Shipment snapshot
            shipment: doc.shipment
                ? {
                    carrier: doc.shipment.carrier,
                    tracking_code: doc.shipment.tracking_code,
                    shipped_at: doc.shipment.shipped_at,
                    delivered_at: doc.shipment.delivered_at,
                }
                : null,

            // ✅ Status & lifecycle
            status: doc.status,
            status_history: this.transformStatusHistory(doc.status_history || []),

            // ✅ Timestamps
            created_at: doc.created_at,
            updated_at: doc.updated_at,
        };
    }

    /**
     * ✅ Convert array of documents → array of DTOs
     * 
     * Dùng cho: Order listing endpoints
     */
    static toResponseDTOList(orders) {
        if (!Array.isArray(orders)) {
            return [];
        }
        return orders.map((order) => this.toResponseDTO(order));
    }

    /**
     * ✅ Convert to List Item DTO (lightweight for listing)
     * 
     * Dùng cho: Order history listing, dashboard
     * Include: minimal info for cards
     * Hide: full items, status_history
     */
    static toListDTO(order) {
        if (!order) {
            return null;
        }

        const doc = order.toObject ? order.toObject() : order;

        return {
            id: doc._id?.toString(),
            order_code: doc.order_code,

            // ✅ Summary info
            item_count: doc.items?.length || 0,
            total_items: this.calculateTotalItems(doc.items || []),
            total_amount: doc.pricing?.total_amount || 0,

            // ✅ Status for filtering
            status: doc.status,

            // ✅ Payment status
            payment_status: doc.payment?.status,

            // ✅ Key dates
            created_at: doc.created_at,
            delivered_at: doc.shipment?.delivered_at || null,
        };
    }

    /**
     * ✅ Convert to Detail DTO (full information)
     * 
     * Dùng cho: GET /orders/:id (full order detail)
     * Include: everything for customer/admin view
     */
    static toDetailDTO(order) {
        if (!order) {
            return null;
        }

        // Start with full response
        const responseDTO = this.toResponseDTO(order);

        const doc = order.toObject ? order.toObject() : order;

        return {
            ...responseDTO,

            // ✅ Additional detail info
            customer_notes: doc.customer_notes || null,

            // ✅ Full status history for detail view
            status_history: this.transformStatusHistoryDetail(
                doc.status_history || []
            ),

            // ✅ Fulfillment tracking
            fulfillment: {
                total_ordered: this.calculateTotalItems(doc.items || []),
                total_fulfilled: this.calculateTotalItemsFulfilled(doc.items || []),
                pending_items: this.calculatePendingItems(doc.items || []),
            },

            // ✅ External IDs for reference
            payment_id: doc.payment_id?.toString() || null,
            shipment_id: doc.shipment_id?.toString() || null,

            // ✅ Expiry info
            payment_expires_at: doc.payment_expires_at || null,
        };
    }

    /**
     * ✅ Convert for Customer View (hide sensitive data)
     * 
     * Dùng cho: Order history for logged-in customer
     * Hide: admin notes, internal IDs
     */
    static toCustomerDTO(order) {
        if (!order) {
            return null;
        }

        const detailDTO = this.toDetailDTO(order);

        return {
            id: detailDTO.id,
            order_code: detailDTO.order_code,

            // ✅ Keep customer-facing info
            address_snapshot: detailDTO.address_snapshot,
            items: detailDTO.items,
            pricing: detailDTO.pricing,
            discount: detailDTO.discount,

            // ✅ Payment & shipment (customer-visible)
            payment: {
                method: detailDTO.payment.method,
                status: detailDTO.payment.status,
            },
            shipment: detailDTO.shipment,

            // ✅ Status & tracking
            status: detailDTO.status,
            fulfillment: detailDTO.fulfillment,

            created_at: detailDTO.created_at,
            delivered_at: detailDTO.shipment?.delivered_at || null,
        };
    }

    /**
     * ✅ Convert for Admin Dashboard (full transparency)
     * 
     * Dùng cho: Admin panel, analytics
     * Include: all info including internal tracking
     */
    static toAdminDTO(order) {
        if (!order) {
            return null;
        }

        const detailDTO = this.toDetailDTO(order);

        return {
            ...detailDTO,

            // ✅ Admin-only fields
            customer_notes: order.notes || null,
            admin_notes: order.admin_notes || null,

            // ✅ Full external references
            payment_id: detailDTO.payment_id,
            shipment_id: detailDTO.shipment_id,

            // ✅ Detailed payment info
            payment: {
                method: order.payment?.method,
                status: order.payment?.status,
                paid_at: order.payment?.paid_at,
                refunded_at: order.payment?.refunded_at,
            },

            // ✅ Full expiry tracking
            payment_expires_at: detailDTO.payment_expires_at,

            // ✅ Soft delete info
            is_deleted: order.is_deleted || false,
            deleted_at: order.deleted_at || null,
        };
    }

    /**
     * ✅ Convert to Confirmation Email DTO
     * 
     * Dùng cho: Order confirmation email template
     * Include: summary + customer-friendly formatting
     */
    static toEmailDTO(order) {
        if (!order) {
            return null;
        }

        const doc = order.toObject ? order.toObject() : order;

        return {
            order_code: doc.order_code,
            order_date: this.formatDate(doc.created_at),

            // ✅ Customer info
            recipient_name: doc.address_snapshot?.recipient_name,
            phone: doc.address_snapshot?.phone,
            address: this.formatAddress(doc.address_snapshot),

            // ✅ Items for email
            items: this.transformItemsForEmail(doc.items || []),

            // ✅ Pricing summary
            pricing: {
                subtotal: this.formatPrice(doc.pricing?.subtotal || 0),
                shipping_fee: this.formatPrice(doc.pricing?.shipping_fee || 0),
                discount_amount: this.formatPrice(
                    doc.pricing?.discount_amount || 0
                ),
                total_amount: this.formatPrice(
                    doc.pricing?.total_amount || 0
                ),
            },

            // ✅ Payment info
            payment_method: doc.payment?.method,

            // ✅ Expected delivery
            expected_delivery: this.calculateExpectedDelivery(doc.created_at),
        };
    }

    /**
     * ✅ Convert to Tracking DTO (minimal for tracking page)
     * 
     * Dùng cho: Public order tracking page
     */
    static toTrackingDTO(order) {
        if (!order) {
            return null;
        }

        const doc = order.toObject ? order.toObject() : order;

        return {
            order_code: doc.order_code,

            // ✅ Current status
            status: doc.status,
            status_label: this.getStatusLabel(doc.status),

            // ✅ Timeline
            timeline: this.buildStatusTimeline(doc.status_history || []),

            // ✅ Shipment tracking
            shipment: doc.shipment
                ? {
                    carrier: doc.shipment.carrier,
                    tracking_code: doc.shipment.tracking_code,
                    tracking_url: this.buildTrackingUrl(
                        doc.shipment.carrier,
                        doc.shipment.tracking_code
                    ),
                }
                : null,

            // ✅ Estimated delivery
            estimated_delivery: this.estimateDeliveryDate(
                doc.shipment?.shipped_at
            ),
        };
    }

    // =========== HELPERS ===========

    /**
     * ✅ Transform order items array
     */
    static transformItems(items) {
        if (!Array.isArray(items) || items.length === 0) {
            return [];
        }

        return items.map((item) => ({
            id: item._id?.toString(),

            // ✅ Product snapshot
            product_name: item.product_name,
            product_image: item.product_image,
            variant_label: item.variant_label,
            sku: item.sku,

            // ✅ Unit snapshot
            unit_label: item.unit_label,
            pack_size: item.pack_size,

            // ✅ Quantity tracking
            quantity_ordered: item.quantity_ordered,
            quantity_fulfilled: item.quantity_fulfilled || 0,
            total_items_ordered: item.quantity_ordered * item.pack_size,
            total_items_fulfilled: (item.quantity_fulfilled || 0) *
                item.pack_size,

            // ✅ Pricing snapshot
            unit_price: item.unit_price,
            line_total: item.line_total,

            // ✅ Review status
            review_status: item.review_status || 'pending',
        }));
    }

    /**
     * ✅ Transform items for email (human-readable)
     */
    static transformItemsForEmail(items) {
        if (!Array.isArray(items) || items.length === 0) {
            return [];
        }

        return items.map((item) => ({
            product_name: item.product_name,
            variant_label: item.variant_label,
            unit_label: item.unit_label,
            quantity: `${item.quantity_ordered} ${item.unit_label}`,
            total_items: item.quantity_ordered * item.pack_size,
            price: this.formatPrice(item.line_total),
        }));
    }

    /**
     * ✅ Transform status history
     */
    static transformStatusHistory(history) {
        if (!Array.isArray(history) || history.length === 0) {
            return [];
        }

        return history.map((record) => ({
            from: record.from,
            to: record.to,
            from_label: this.getStatusLabel(record.from),
            to_label: this.getStatusLabel(record.to),
            changed_at: record.changed_at,
            changed_by_id: record.changed_by?.toString() || null,
            note: record.note || null,
        }));
    }

    /**
     * ✅ Transform status history (with user details for admin)
     */
    static transformStatusHistoryDetail(history) {
        if (!Array.isArray(history) || history.length === 0) {
            return [];
        }

        return history.map((record) => ({
            from: record.from,
            to: record.to,
            from_label: this.getStatusLabel(record.from),
            to_label: this.getStatusLabel(record.to),
            changed_at: record.changed_at,
            changed_at_formatted: this.formatDate(record.changed_at),
            changed_by_id: record.changed_by?.toString() || null,
            note: record.note || null,
            is_system: !record.changed_by, // System action if no changed_by
        }));
    }

    /**
     * ✅ Build status timeline for tracking
     */
    static buildStatusTimeline(history) {
        const statusOrder = {
            PENDING: 1,
            PAID: 2,
            PROCESSING: 3,
            SHIPPED: 4,
            DELIVERED: 5,
        };

        const timeline = [];

        // Get unique status transitions
        const statuses = new Map();

        history.forEach((record) => {
            if (!statuses.has(record.to)) {
                statuses.set(record.to, record);
            }
        });

        // Sort by order and format
        Array.from(statuses.values())
            .sort((a, b) => statusOrder[a.to] - statusOrder[b.to])
            .forEach((record) => {
                timeline.push({
                    status: record.to,
                    status_label: this.getStatusLabel(record.to),
                    timestamp: record.changed_at,
                    timestamp_formatted: this.formatDate(record.changed_at),
                    completed: true,
                });
            });

        return timeline;
    }

    /**
     * ✅ Calculate total items (packs × pack_size)
     */
    static calculateTotalItems(items) {
        if (!Array.isArray(items)) {
            return 0;
        }

        return items.reduce(
            (sum, item) => sum + item.quantity_ordered * item.pack_size,
            0
        );
    }

    /**
     * ✅ Calculate total fulfilled items
     */
    static calculateTotalItemsFulfilled(items) {
        if (!Array.isArray(items)) {
            return 0;
        }

        return items.reduce(
            (sum, item) =>
                sum + (item.quantity_fulfilled || 0) * item.pack_size,
            0
        );
    }

    /**
     * ✅ Calculate pending items (not yet fulfilled)
     */
    static calculatePendingItems(items) {
        if (!Array.isArray(items)) {
            return 0;
        }

        return items.reduce(
            (sum, item) =>
                sum +
                (item.quantity_ordered - (item.quantity_fulfilled || 0)) *
                item.pack_size,
            0
        );
    }

    /**
     * ✅ Get status label (human-readable)
     */
    static getStatusLabel(status) {
        const labels = {
            PENDING: 'Đang chờ thanh toán',
            PAID: 'Đã thanh toán',
            PROCESSING: 'Đang xử lý',
            SHIPPED: 'Đã gửi',
            DELIVERED: 'Đã giao',
            FAILED: 'Thanh toán thất bại',
            CANCELED: 'Đã hủy',
        };

        return labels[status] || status;
    }

    /**
     * ✅ Format address for display
     */
    static formatAddress(address) {
        if (!address) {
            return '';
        }

        const parts = [
            address.street,
            address.district,
            address.city,
            address.postal_code,
        ].filter(Boolean);

        return parts.join(', ');
    }

    /**
     * ✅ Format price for display (VND)
     */
    static formatPrice(price) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
        }).format(price);
    }

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
     * ✅ Calculate expected delivery date (5-7 days)
     */
    static calculateExpectedDelivery(orderDate) {
        if (!orderDate) {
            return null;
        }

        const date = new Date(orderDate);
        const minDays = 5;
        const maxDays = 7;

        const minDate = new Date(date);
        minDate.setDate(minDate.getDate() + minDays);

        const maxDate = new Date(date);
        maxDate.setDate(maxDate.getDate() + maxDays);

        return {
            min: minDate.toLocaleDateString('vi-VN'),
            max: maxDate.toLocaleDateString('vi-VN'),
            display: `${minDays}-${maxDays} ngày làm việc`,
        };
    }

    /**
     * ✅ Estimate delivery date from shipment date
     */
    static estimateDeliveryDate(shippedDate) {
        if (!shippedDate) {
            return null;
        }

        const date = new Date(shippedDate);
        date.setDate(date.getDate() + 3); // 3 days after shipped

        return date.toLocaleDateString('vi-VN');
    }

    /**
     * ✅ Build tracking URL based on carrier
     */
    static buildTrackingUrl(carrier, trackingCode) {
        if (!trackingCode) {
            return null;
        }

        const trackers = {
            GHN: `https://khachhang.ghn.vn/tracking/${trackingCode}`,
            GRAB: `https://grabexpress.com/vn/tracking/${trackingCode}`,
            VIETTEL: `https://www.viettelpost.com.vn/trackingonline/${trackingCode}`,
        };

        return trackers[carrier] || null;
    }
}

module.exports = OrderMapper;