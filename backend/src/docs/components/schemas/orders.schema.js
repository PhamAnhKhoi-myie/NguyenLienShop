const objectIdPattern = "^[a-fA-F0-9]{24}$";
const orderStatusEnum = ["PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "FAILED", "CANCELED"];
const paymentStatusEnum = ["PENDING", "PAID", "FAILED", "REFUNDED"];
const paymentMethodEnum = ["COD", "VNPAY", "PAYPAL", "PAYOS", "MOMO", "CARD"];

module.exports = {
    OrderAddressSnapshot: {
        type: "object",
        required: [
            "receiver_name",
            "phone",
            "province_code",
            "province_name",
            "ward_code",
            "ward_name",
            "detail",
            "full_address",
        ],
        properties: {
            receiver_name: { type: "string", minLength: 1, maxLength: 100, example: "Nguyen Van A" },
            phone: {
                type: "string",
                pattern: "^(0|\\+84)[0-9]{9}$",
                example: "0912345678",
            },
            province_code: { type: "string", pattern: "^\\d{2}$", example: "79" },
            province_name: { type: "string", example: "Ho Chi Minh City" },
            ward_code: { type: "string", pattern: "^\\d{5}$", example: "26743" },
            ward_name: { type: "string", example: "Ben Thanh Ward" },
            detail: { type: "string", minLength: 5, maxLength: 255, example: "123 Nguyen Trai" },
            full_address: { type: "string", example: "123 Nguyen Trai, Ben Thanh Ward, Ho Chi Minh City" },
            note: { type: "string", maxLength: 500, nullable: true, example: "Assigned office hours" },
        },
    },

    CreateOrderAddressSnapshotInput: {
        type: "object",
        required: ["receiver_name", "phone", "province_code", "ward_code", "detail"],
        properties: {
            receiver_name: { type: "string", minLength: 1, maxLength: 100, example: "Nguyen Van A" },
            phone: {
                type: "string",
                pattern: "^(0|\\+84)[0-9]{9}$",
                example: "0912345678",
            },
            province_code: { type: "string", pattern: "^\\d{2}$", example: "79" },
            ward_code: { type: "string", pattern: "^\\d{5}$", example: "26743" },
            detail: { type: "string", minLength: 5, maxLength: 255, example: "123 Nguyen Trai" },
            note: { type: "string", maxLength: 500, nullable: true, example: "Assigned office hours" },
        },
    },

    OrderItemSnapshot: {
        type: "object",
        required: [
            "id",
            "product_name",
            "variant_label",
            "sku",
            "unit_label",
            "pack_size",
            "quantity_ordered",
            "quantity_fulfilled",
            "total_items_ordered",
            "total_items_fulfilled",
            "unit_price",
            "line_total",
            "review_status",
        ],
        properties: {
            id: { type: "string", pattern: objectIdPattern, example: "507f1f77bcf86cd799439021" },
            product_name: { type: "string", example: "Fruit protection bag" },
            product_image: { type: "string", format: "uri", nullable: true, example: "https://example.com/product.jpg" },
            variant_label: { type: "string", example: "20x25 - Non-woven" },
            sku: { type: "string", example: "BAG-20X25-NW" },
            unit_label: { type: "string", example: "Pack 100" },
            pack_size: { type: "integer", minimum: 1, example: 100 },
            quantity_ordered: { type: "integer", minimum: 1, example: 10 },
            quantity_fulfilled: { type: "integer", minimum: 0, example: 0 },
            total_items_ordered: { type: "integer", minimum: 1, example: 1000 },
            total_items_fulfilled: { type: "integer", minimum: 0, example: 0 },
            original_unit_price: { type: "number", minimum: 0, example: 200000 },
            unit_price: { type: "number", minimum: 0, exclusiveMinimum: true, example: 180000 },
            promotion_discount_amount: { type: "number", minimum: 0, example: 20000 },
            promotion_discount_percent: { type: "integer", minimum: 0, maximum: 99, example: 10 },
            is_on_sale: { type: "boolean", example: true },
            original_line_total: { type: "number", minimum: 0, example: 2000000 },
            line_total: { type: "number", minimum: 0, exclusiveMinimum: true, example: 1800000 },
            review_status: { type: "string", enum: ["pending", "reviewed"], example: "pending" },
        },
    },

    OrderPricing: {
        type: "object",
        required: ["subtotal", "shipping_fee", "discount_amount", "total_amount", "currency"],
        properties: {
            original_subtotal: { type: "number", minimum: 0, example: 2000000 },
            promotion_discount_amount: { type: "number", minimum: 0, example: 200000 },
            subtotal: { type: "number", minimum: 0, example: 1800000 },
            shipping_fee: { type: "number", minimum: 0, default: 0, example: 30000 },
            discount_amount: { type: "number", minimum: 0, default: 0, example: 180000 },
            total_amount: { type: "number", minimum: 0, example: 1650000 },
            currency: { type: "string", enum: ["VND", "USD", "EUR"], default: "VND", example: "VND" },
        },
    },

    OrderDiscount: {
        type: "object",
        required: ["type", "value", "scope", "applied_amount"],
        properties: {
            code: { type: "string", maxLength: 50, nullable: true, example: "SALE10" },
            type: { type: "string", enum: ["percentage", "fixed"], example: "percentage" },
            value: { type: "number", minimum: 0, exclusiveMinimum: true, example: 10 },
            scope: { type: "string", enum: ["ORDER", "ITEM"], default: "ORDER", example: "ORDER" },
            applied_amount: { type: "number", minimum: 0, example: 180000 },
        },
    },

    OrderPayment: {
        type: "object",
        required: ["method", "status"],
        properties: {
            method: { type: "string", enum: paymentMethodEnum, example: "COD" },
            status: { type: "string", enum: paymentStatusEnum, example: "PENDING" },
            paid_at: { type: "string", format: "date-time", nullable: true, example: null },
            refunded_at: { type: "string", format: "date-time", nullable: true, example: null },
        },
    },

    OrderShipment: {
        type: "object",
        properties: {
            carrier: { type: "string", nullable: true, example: "GHN" },
            tracking_code: { type: "string", nullable: true, example: "100123456789" },
            tracking_url: { type: "string", format: "uri", nullable: true, example: "https://khachhang.ghn.vn/tracking/100123456789" },
            shipped_at: { type: "string", format: "date-time", nullable: true, example: null },
            delivered_at: { type: "string", format: "date-time", nullable: true, example: null },
        },
    },

    OrderStatusHistoryRecord: {
        type: "object",
        required: ["to", "changed_at"],
        properties: {
            from: { type: "string", enum: orderStatusEnum, nullable: true, example: "PENDING" },
            to: { type: "string", enum: orderStatusEnum, example: "PAID" },
            from_label: { type: "string", nullable: true, example: "Pending payment" },
            to_label: { type: "string", example: "Paid" },
            changed_at: { type: "string", format: "date-time" },
            changed_at_formatted: { type: "string", nullable: true, example: "15/04/2024, 10:30" },
            changed_by_id: { type: "string", pattern: objectIdPattern, nullable: true, example: null },
            note: { type: "string", nullable: true, example: "Payment confirmed" },
            is_system: { type: "boolean", nullable: true, example: false },
        },
    },

    OrderFulfillment: {
        type: "object",
        required: ["total_ordered", "total_fulfilled", "pending_items"],
        properties: {
            total_ordered: { type: "integer", minimum: 0, example: 1000 },
            total_fulfilled: { type: "integer", minimum: 0, example: 0 },
            pending_items: { type: "integer", minimum: 0, example: 1000 },
        },
    },

    Order: {
        type: "object",
        required: [
            "id",
            "order_code",
            "user_id",
            "address_snapshot",
            "items",
            "pricing",
            "payment",
            "shipment",
            "status",
            "status_history",
            "created_at",
            "updated_at",
        ],
        properties: {
            id: { type: "string", pattern: objectIdPattern, example: "507f1f77bcf86cd799439020" },
            order_code: {
                type: "string",
                pattern: "^ORD-\\d{8}-[A-Z0-9]{5}$",
                example: "ORD-20240415-ABC12",
            },
            user_id: { type: "string", pattern: objectIdPattern, example: "507f1f77bcf86cd799439011" },
            address_snapshot: { $ref: "#/components/schemas/OrderAddressSnapshot" },
            items: {
                type: "array",
                items: { $ref: "#/components/schemas/OrderItemSnapshot" },
            },
            pricing: { $ref: "#/components/schemas/OrderPricing" },
            discount: {
                nullable: true,
                allOf: [{ $ref: "#/components/schemas/OrderDiscount" }],
            },
            payment: { $ref: "#/components/schemas/OrderPayment" },
            shipment: {
                nullable: true,
                allOf: [{ $ref: "#/components/schemas/OrderShipment" }],
            },
            status: { type: "string", enum: orderStatusEnum, example: "PENDING" },
            status_history: {
                type: "array",
                items: { $ref: "#/components/schemas/OrderStatusHistoryRecord" },
            },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
        },
    },

    OrderDetail: {
        allOf: [
            { $ref: "#/components/schemas/Order" },
            {
                type: "object",
                required: ["customer_notes", "fulfillment", "payment_id", "shipment_id", "payment_expires_at"],
                properties: {
                    customer_notes: { type: "string", nullable: true, maxLength: 500, example: "Please deliver in the morning." },
                    fulfillment: { $ref: "#/components/schemas/OrderFulfillment" },
                    payment_id: { type: "string", pattern: objectIdPattern, nullable: true, example: null },
                    shipment_id: { type: "string", pattern: objectIdPattern, nullable: true, example: null },
                    payment_expires_at: { type: "string", format: "date-time", nullable: true, example: null },
                },
            },
        ],
    },

    AdminOrderDetail: {
        allOf: [
            { $ref: "#/components/schemas/OrderDetail" },
            {
                type: "object",
                required: ["admin_notes", "is_deleted", "deleted_at"],
                properties: {
                    admin_notes: { type: "string", nullable: true, maxLength: 1000, example: "Priority shipping requested." },
                    is_deleted: { type: "boolean", example: false },
                    deleted_at: { type: "string", format: "date-time", nullable: true, example: null },
                },
            },
        ],
    },

    OrderListItem: {
        type: "object",
        required: ["id", "order_code", "item_count", "total_items", "total_amount", "status", "payment_status", "created_at", "delivered_at"],
        properties: {
            id: { type: "string", pattern: objectIdPattern, example: "507f1f77bcf86cd799439020" },
            order_code: { type: "string", pattern: "^ORD-\\d{8}-[A-Z0-9]{5}$", example: "ORD-20240415-ABC12" },
            item_count: { type: "integer", minimum: 0, example: 2 },
            total_items: { type: "integer", minimum: 0, example: 1000 },
            total_amount: { type: "number", minimum: 0, example: 1650000 },
            status: { type: "string", enum: orderStatusEnum, example: "PENDING" },
            payment_status: { type: "string", enum: paymentStatusEnum, example: "PENDING" },
            created_at: { type: "string", format: "date-time" },
            delivered_at: { type: "string", format: "date-time", nullable: true, example: null },
        },
    },

    OrderTrackingTimelineItem: {
        type: "object",
        required: ["status", "status_label", "timestamp", "timestamp_formatted", "completed"],
        properties: {
            status: { type: "string", enum: orderStatusEnum, example: "PENDING" },
            status_label: { type: "string", example: "Pending payment" },
            timestamp: { type: "string", format: "date-time" },
            timestamp_formatted: { type: "string", example: "15/04/2024, 10:30" },
            completed: { type: "boolean", example: true },
        },
    },

    OrderTracking: {
        type: "object",
        required: ["order_code", "status", "status_label", "timeline", "shipment", "estimated_delivery"],
        properties: {
            order_code: { type: "string", pattern: "^ORD-\\d{8}-[A-Z0-9]{5}$", example: "ORD-20240415-ABC12" },
            status: { type: "string", enum: orderStatusEnum, example: "SHIPPED" },
            status_label: { type: "string", example: "Shipped" },
            timeline: {
                type: "array",
                items: { $ref: "#/components/schemas/OrderTrackingTimelineItem" },
            },
            shipment: {
                nullable: true,
                allOf: [{ $ref: "#/components/schemas/OrderShipment" }],
            },
            estimated_delivery: { type: "string", nullable: true, example: "18/04/2024" },
        },
    },

    OrderStatsFacetCount: {
        type: "object",
        required: ["count"],
        properties: {
            count: { type: "integer", minimum: 0, example: 1250 },
        },
    },

    OrderStatsRevenue: {
        type: "object",
        required: ["_id", "total"],
        properties: {
            _id: { nullable: true, example: null },
            total: { type: "number", minimum: 0, example: 2500000000 },
        },
    },

    OrderStatsBreakdownItem: {
        type: "object",
        required: ["_id", "count"],
        properties: {
            _id: { type: "string", example: "PENDING" },
            count: { type: "integer", minimum: 0, example: 12 },
        },
    },

    OrderStats: {
        type: "object",
        required: ["totalOrders", "totalRevenue", "statusBreakdown", "paymentBreakdown"],
        properties: {
            totalOrders: {
                type: "array",
                items: { $ref: "#/components/schemas/OrderStatsFacetCount" },
            },
            totalRevenue: {
                type: "array",
                items: { $ref: "#/components/schemas/OrderStatsRevenue" },
            },
            statusBreakdown: {
                type: "array",
                items: { $ref: "#/components/schemas/OrderStatsBreakdownItem" },
            },
            paymentBreakdown: {
                type: "array",
                items: { $ref: "#/components/schemas/OrderStatsBreakdownItem" },
            },
        },
    },

    CreateOrderInput: {
        type: "object",
        required: ["cart_id", "address_snapshot"],
        properties: {
            cart_id: { type: "string", pattern: objectIdPattern, example: "507f1f77bcf86cd799439016" },
            address_snapshot: { $ref: "#/components/schemas/CreateOrderAddressSnapshotInput" },
            payment_method: { type: "string", enum: paymentMethodEnum, default: "COD", example: "COD" },
            customer_notes: { type: "string", maxLength: 500, example: "Please deliver in the morning." },
        },
    },

    CheckoutSettingsResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: {
                type: "object",
                required: ["shipping_fee", "currency"],
                properties: {
                    shipping_fee: { type: "integer", minimum: 0, example: 30000 },
                    currency: { type: "string", enum: ["VND"], example: "VND" },
                },
            },
        },
    },

    CancelOrderInput: {
        type: "object",
        required: ["reason"],
        properties: {
            reason: { type: "string", minLength: 1, maxLength: 500, example: "I ordered the wrong size." },
        },
    },

    WriteReviewInput: {
        type: "object",
        required: ["item_id", "rating", "comment"],
        properties: {
            item_id: { type: "string", pattern: objectIdPattern, example: "507f1f77bcf86cd799439021" },
            rating: { type: "integer", minimum: 1, maximum: 5, example: 5 },
            title: { type: "string", maxLength: 200, nullable: true, example: "Product meets expectations" },
            comment: { type: "string", minLength: 10, maxLength: 500, example: "Product quality is good and delivery was fast." },
        },
    },

    UpdateOrderStatusInput: {
        type: "object",
        required: ["status"],
        properties: {
            status: { type: "string", enum: orderStatusEnum, example: "PROCESSING" },
            note: { type: "string", maxLength: 500, example: "Sent to warehouse for fulfillment." },
        },
    },

    AdminUpdateOrderInput: {
        type: "object",
        properties: {
            status: { type: "string", enum: orderStatusEnum, example: "PROCESSING" },
            admin_notes: { type: "string", maxLength: 1000, example: "Customer requested priority shipping." },
        },
    },

    FulfillItemInput: {
        type: "object",
        required: ["item_id", "quantity_fulfilled"],
        properties: {
            item_id: { type: "string", pattern: objectIdPattern, example: "507f1f77bcf86cd799439021" },
            quantity_fulfilled: { type: "integer", minimum: 1, maximum: 1000000, example: 10 },
        },
    },

    RecordShipmentInput: {
        type: "object",
        required: ["carrier", "tracking_code"],
        properties: {
            carrier: { type: "string", minLength: 1, maxLength: 50, example: "GHN" },
            tracking_code: { type: "string", minLength: 1, maxLength: 100, example: "100123456789" },
        },
    },

    OrderResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Order created successfully" },
            data: { $ref: "#/components/schemas/Order" },
        },
    },

    OrderDetailResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Order updated successfully" },
            data: { $ref: "#/components/schemas/OrderDetail" },
        },
    },

    AdminOrderDetailResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Order updated successfully" },
            data: { $ref: "#/components/schemas/AdminOrderDetail" },
        },
    },

    OrdersListResponse: {
        type: "object",
        required: ["success", "data", "pagination"],
        properties: {
            success: { type: "boolean", example: true },
            data: {
                type: "array",
                items: { $ref: "#/components/schemas/OrderListItem" },
            },
            pagination: {
                type: "object",
                required: ["page", "limit", "total", "pages"],
                properties: {
                    page: { type: "integer", minimum: 1, example: 1 },
                    limit: { type: "integer", minimum: 1, maximum: 100, example: 20 },
                    total: { type: "integer", minimum: 0, example: 45 },
                    pages: { type: "integer", minimum: 0, example: 3 },
                },
            },
        },
    },

    AdminOrdersListResponse: {
        type: "object",
        required: ["success", "data", "pagination"],
        properties: {
            success: { type: "boolean", example: true },
            data: {
                type: "array",
                items: { $ref: "#/components/schemas/AdminOrderDetail" },
            },
            pagination: {
                type: "object",
                required: ["page", "limit", "total", "pages"],
                properties: {
                    page: { type: "integer", minimum: 1, example: 1 },
                    limit: { type: "integer", minimum: 1, maximum: 100, example: 20 },
                    total: { type: "integer", minimum: 0, example: 45 },
                    pages: { type: "integer", minimum: 0, example: 3 },
                },
            },
        },
    },

    OrderTrackingResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/OrderTracking" },
        },
    },

    OrderStatsResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/OrderStats" },
        },
    },
};
