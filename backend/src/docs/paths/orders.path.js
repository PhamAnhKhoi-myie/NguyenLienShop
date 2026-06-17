const objectIdPattern = "^[a-fA-F0-9]{24}$";
const orderStatusEnum = ["PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "FAILED", "CANCELED"];
const paymentStatusEnum = ["PENDING", "PAID", "FAILED", "REFUND_PENDING", "REFUNDED"];

const orderIdParam = {
    in: "path",
    name: "order_id",
    required: true,
    schema: { type: "string", pattern: objectIdPattern },
    description: "Order ID.",
};

const orderCodeParam = {
    in: "path",
    name: "order_code",
    required: true,
    schema: {
        type: "string",
        pattern: "^ORD-\\d{8}-[A-Z0-9]{5}$",
        example: "ORD-20240415-ABC12",
    },
    description: "Order code in ORD-YYYYMMDD-XXXXX format.",
};

const orderListQueryParams = [
    {
        in: "query",
        name: "page",
        schema: { type: "integer", minimum: 1, default: 1 },
    },
    {
        in: "query",
        name: "limit",
        schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
    },
    {
        in: "query",
        name: "status",
        schema: { type: "string", example: "PAID,PROCESSING" },
        description: `Comma-separated list of statuses. Allowed values: ${orderStatusEnum.join(", ")}.`,
    },
    {
        in: "query",
        name: "payment_status",
        schema: { type: "string", enum: paymentStatusEnum },
    },
    {
        in: "query",
        name: "date_from",
        schema: { type: "string", format: "date-time" },
    },
    {
        in: "query",
        name: "date_to",
        schema: { type: "string", format: "date-time" },
    },
];

const jsonBody = (schemaRef) => ({
    required: true,
    content: {
        "application/json": {
            schema: { $ref: schemaRef },
        },
    },
});

const ok = (schemaRef) => ({
    description: "OK",
    content: {
        "application/json": {
            schema: { $ref: schemaRef },
        },
    },
});

module.exports = {
    "/orders/track/{order_code}": {
        get: {
            tags: ["Orders"],
            summary: "Track order by code",
            security: [],
            parameters: [orderCodeParam],
            responses: {
                200: ok("#/components/schemas/OrderTrackingResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/orders": {
        post: {
            tags: ["Orders"],
            summary: "Create order from cart",
            security: [{ bearerAuth: [] }],
            requestBody: jsonBody("#/components/schemas/CreateOrderInput"),
            responses: {
                201: {
                    description: "Created",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/OrderResponse" },
                        },
                    },
                },
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                404: { $ref: "#/components/responses/NotFound" },
                409: { $ref: "#/components/responses/Conflict" },
                503: { $ref: "#/components/responses/ServiceUnavailable" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
        get: {
            tags: ["Orders"],
            summary: "Get current user's orders",
            security: [{ bearerAuth: [] }],
            parameters: orderListQueryParams,
            responses: {
                200: ok("#/components/schemas/OrdersListResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/orders/checkout-settings": {
        get: {
            tags: ["Orders"],
            summary: "Get server-controlled checkout pricing settings",
            security: [{ bearerAuth: [] }],
            responses: {
                200: ok("#/components/schemas/CheckoutSettingsResponse"),
                401: { $ref: "#/components/responses/Unauthorized" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/orders/{order_id}": {
        get: {
            tags: ["Orders"],
            summary: "Get order detail",
            security: [{ bearerAuth: [] }],
            parameters: [orderIdParam],
            responses: {
                200: ok("#/components/schemas/OrderDetailResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/orders/{order_id}/cancel": {
        post: {
            tags: ["Orders"],
            summary: "Cancel order",
            security: [{ bearerAuth: [] }],
            parameters: [orderIdParam],
            requestBody: jsonBody("#/components/schemas/CancelOrderInput"),
            responses: {
                200: ok("#/components/schemas/OrderDetailResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                404: { $ref: "#/components/responses/NotFound" },
                409: { $ref: "#/components/responses/Conflict" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/orders/{order_id}/confirm-received": {
        post: {
            tags: ["Orders"],
            summary: "Confirm customer received the delivered order",
            security: [{ bearerAuth: [] }],
            parameters: [orderIdParam],
            responses: {
                200: ok("#/components/schemas/OrderDetailResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                404: { $ref: "#/components/responses/NotFound" },
                409: { $ref: "#/components/responses/Conflict" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/orders/{order_id}/review": {
        post: {
            tags: ["Orders"],
            summary: "Write review for an order item",
            security: [{ bearerAuth: [] }],
            parameters: [orderIdParam],
            requestBody: jsonBody("#/components/schemas/WriteReviewInput"),
            responses: {
                200: ok("#/components/schemas/OrderDetailResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                404: { $ref: "#/components/responses/NotFound" },
                409: { $ref: "#/components/responses/Conflict" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/orders/admin/orders/stats": {
        get: {
            tags: ["Orders"],
            summary: "Get order statistics",
            security: [{ bearerAuth: [] }],
            responses: {
                200: ok("#/components/schemas/OrderStatsResponse"),
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/orders/admin/orders": {
        get: {
            tags: ["Orders"],
            summary: "Get all orders",
            security: [{ bearerAuth: [] }],
            parameters: orderListQueryParams,
            responses: {
                200: ok("#/components/schemas/AdminOrdersListResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/orders/admin/orders/{order_id}": {
        get: {
            tags: ["Orders"],
            summary: "Get order detail for admin",
            security: [{ bearerAuth: [] }],
            parameters: [orderIdParam],
            responses: {
                200: ok("#/components/schemas/AdminOrderDetailResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
        patch: {
            tags: ["Orders"],
            summary: "Update order for admin",
            security: [{ bearerAuth: [] }],
            parameters: [orderIdParam],
            requestBody: jsonBody("#/components/schemas/AdminUpdateOrderInput"),
            responses: {
                200: ok("#/components/schemas/AdminOrderDetailResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/orders/admin/orders/{order_id}/status": {
        patch: {
            tags: ["Orders"],
            summary: "Update order status",
            security: [{ bearerAuth: [] }],
            parameters: [orderIdParam],
            requestBody: jsonBody("#/components/schemas/UpdateOrderStatusInput"),
            responses: {
                200: ok("#/components/schemas/OrderDetailResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/orders/admin/orders/{order_id}/refund": {
        post: {
            tags: ["Orders"],
            summary: "Mark manual refund completed",
            security: [{ bearerAuth: [] }],
            parameters: [orderIdParam],
            requestBody: jsonBody("#/components/schemas/CompleteRefundInput"),
            responses: {
                200: ok("#/components/schemas/AdminOrderDetailResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                404: { $ref: "#/components/responses/NotFound" },
                409: { $ref: "#/components/responses/Conflict" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/orders/admin/orders/{order_id}/fulfill": {
        post: {
            tags: ["Orders"],
            summary: "Fulfill order item quantity",
            security: [{ bearerAuth: [] }],
            parameters: [orderIdParam],
            requestBody: jsonBody("#/components/schemas/FulfillItemInput"),
            responses: {
                200: ok("#/components/schemas/OrderDetailResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                404: { $ref: "#/components/responses/NotFound" },
                409: { $ref: "#/components/responses/Conflict" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/orders/admin/orders/{order_id}/shipment": {
        post: {
            tags: ["Orders"],
            summary: "Record shipment",
            security: [{ bearerAuth: [] }],
            parameters: [orderIdParam],
            requestBody: jsonBody("#/components/schemas/RecordShipmentInput"),
            responses: {
                200: ok("#/components/schemas/OrderResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                404: { $ref: "#/components/responses/NotFound" },
                409: { $ref: "#/components/responses/Conflict" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/orders/admin/orders/{order_id}/deliver": {
        post: {
            tags: ["Orders"],
            summary: "Confirm delivery",
            security: [{ bearerAuth: [] }],
            parameters: [orderIdParam],
            responses: {
                200: ok("#/components/schemas/OrderDetailResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                404: { $ref: "#/components/responses/NotFound" },
                409: { $ref: "#/components/responses/Conflict" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },
};
