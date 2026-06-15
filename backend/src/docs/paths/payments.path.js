const objectIdPattern = "^[a-fA-F0-9]{24}$";
const paymentStatusEnum = ["pending", "paid", "failed"];
const providerEnum = ["vnpay", "stripe", "paypal", "payos"];

const paymentIdParam = {
    in: "path",
    name: "payment_id",
    required: true,
    schema: { type: "string", pattern: objectIdPattern },
    description: "Payment ID.",
};

const orderIdParam = {
    in: "path",
    name: "order_id",
    required: true,
    schema: { type: "string", pattern: objectIdPattern },
    description: "Order ID.",
};

const listPaymentsQueryParams = [
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
        schema: { type: "string", example: "pending,paid" },
        description: `Comma-separated list of statuses. Allowed values: ${paymentStatusEnum.join(", ")}.`,
    },
    {
        in: "query",
        name: "provider",
        schema: { type: "string", enum: providerEnum },
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

const vnpayWebhookQueryParams = [
    "vnp_Amount",
    "vnp_PayDate",
    "vnp_ResponseCode",
    "vnp_TransactionStatus",
    "vnp_TmnCode",
    "vnp_TxnRef",
    "vnp_SecureHash",
].map((name) => ({
    in: "query",
    name,
    required: true,
    schema: { type: "string" },
}));

const optionalVNPayReturnParams = ["vnp_ResponseCode", "vnp_TransactionStatus", "vnp_TxnRef", "vnp_SecureHash"].map((name) => ({
    in: "query",
    name,
    required: false,
    schema: { type: "string" },
}));

const jsonBody = (schemaRef, required = true) => ({
    required,
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
    "/payments/vnpay-return": {
        get: {
            tags: ["Payments"],
            summary: "Handle VNPay browser return",
            security: [],
            description: "Redirect-only endpoint for the browser return URL. Payment state is updated by the VNPay IPN webhook, not this redirect.",
            parameters: optionalVNPayReturnParams,
            responses: {
                302: { description: "Redirects to frontend payment return page." },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/payments/paypal-return": {
        get: {
            tags: ["Payments"],
            summary: "Handle PayPal browser return",
            security: [],
            description: "Captures the approved PayPal order and redirects to the frontend payment return page.",
            parameters: [
                {
                    in: "query",
                    name: "token",
                    required: true,
                    schema: { type: "string" },
                    description: "PayPal order ID returned as token.",
                },
                {
                    in: "query",
                    name: "PayerID",
                    required: false,
                    schema: { type: "string" },
                },
            ],
            responses: {
                302: { description: "Redirects to frontend payment return page." },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/payments/webhook/vnpay": {
        get: {
            tags: ["Payments"],
            summary: "Handle VNPay IPN webhook via query",
            security: [],
            parameters: vnpayWebhookQueryParams,
            responses: {
                200: ok("#/components/schemas/VNPayIPNResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
            },
        },
        post: {
            tags: ["Payments"],
            summary: "Handle VNPay IPN webhook",
            security: [],
            requestBody: jsonBody("#/components/schemas/VNPayWebhookInput"),
            responses: {
                200: ok("#/components/schemas/VNPayIPNResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
            },
        },
    },

    "/payments/webhook/stripe": {
        post: {
            tags: ["Payments"],
            summary: "Handle Stripe webhook",
            security: [],
            parameters: [
                {
                    in: "header",
                    name: "x-stripe-signature",
                    required: true,
                    schema: { type: "string" },
                },
            ],
            requestBody: jsonBody("#/components/schemas/StripeWebhookInput"),
            responses: {
                200: ok("#/components/schemas/WebhookResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                404: { $ref: "#/components/responses/NotFound" },
                409: { $ref: "#/components/responses/Conflict" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/payments/webhook/paypal": {
        post: {
            tags: ["Payments"],
            summary: "Handle PayPal webhook",
            security: [],
            parameters: [
                { in: "header", name: "paypal-transmission-id", required: true, schema: { type: "string" } },
                { in: "header", name: "paypal-transmission-time", required: true, schema: { type: "string" } },
                { in: "header", name: "paypal-cert-url", required: true, schema: { type: "string" } },
                { in: "header", name: "paypal-auth-algo", required: true, schema: { type: "string" } },
                { in: "header", name: "paypal-transmission-sig", required: true, schema: { type: "string" } },
            ],
            requestBody: jsonBody("#/components/schemas/PayPalWebhookInput"),
            responses: {
                200: ok("#/components/schemas/WebhookResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                404: { $ref: "#/components/responses/NotFound" },
                409: { $ref: "#/components/responses/Conflict" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/payments/payos/webhook": {
        post: {
            tags: ["Payments"],
            summary: "Handle PayOS webhook",
            security: [],
            requestBody: jsonBody("#/components/schemas/PayOSWebhookInput"),
            responses: {
                200: ok("#/components/schemas/WebhookResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                404: { $ref: "#/components/responses/NotFound" },
                409: { $ref: "#/components/responses/Conflict" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/payments/webhook/payos": {
        post: {
            tags: ["Payments"],
            summary: "Handle PayOS webhook",
            security: [],
            requestBody: jsonBody("#/components/schemas/PayOSWebhookInput"),
            responses: {
                200: ok("#/components/schemas/WebhookResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                404: { $ref: "#/components/responses/NotFound" },
                409: { $ref: "#/components/responses/Conflict" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/payments/admin/stats": {
        get: {
            tags: ["Payments"],
            summary: "Get payment statistics",
            security: [{ bearerAuth: [] }],
            responses: {
                200: ok("#/components/schemas/PaymentStatsResponse"),
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/payments/admin": {
        get: {
            tags: ["Payments"],
            summary: "List payments for admin",
            security: [{ bearerAuth: [] }],
            parameters: listPaymentsQueryParams,
            responses: {
                200: ok("#/components/schemas/AdminPaymentsListResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/payments/admin/{payment_id}/verify": {
        post: {
            tags: ["Payments"],
            summary: "Record manual payment verification audit",
            security: [{ bearerAuth: [] }],
            parameters: [paymentIdParam],
            responses: {
                200: ok("#/components/schemas/AdminVerifyPaymentResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/payments/admin/{payment_id}": {
        delete: {
            tags: ["Payments"],
            summary: "Soft delete payment",
            security: [{ bearerAuth: [] }],
            parameters: [paymentIdParam],
            responses: {
                200: ok("#/components/schemas/AdminPaymentResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/payments": {
        post: {
            tags: ["Payments"],
            summary: "Create payment",
            security: [{ bearerAuth: [] }],
            requestBody: jsonBody("#/components/schemas/CreatePaymentInput"),
            responses: {
                201: {
                    description: "Created",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/CreatePaymentResponse" },
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
            tags: ["Payments"],
            summary: "List current user's payments",
            security: [{ bearerAuth: [] }],
            parameters: listPaymentsQueryParams,
            responses: {
                200: ok("#/components/schemas/PaymentsListResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/payments/{payment_id}/retry": {
        post: {
            tags: ["Payments"],
            summary: "Retry failed payment",
            security: [{ bearerAuth: [] }],
            parameters: [paymentIdParam],
            responses: {
                200: ok("#/components/schemas/RetryPaymentResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                404: { $ref: "#/components/responses/NotFound" },
                409: { $ref: "#/components/responses/Conflict" },
                503: { $ref: "#/components/responses/ServiceUnavailable" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/payments/{payment_id}/cancel": {
        post: {
            tags: ["Payments"],
            summary: "Cancel pending payment",
            security: [{ bearerAuth: [] }],
            parameters: [paymentIdParam],
            requestBody: jsonBody("#/components/schemas/CancelPaymentInput", false),
            responses: {
                200: ok("#/components/schemas/CancelPaymentResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                404: { $ref: "#/components/responses/NotFound" },
                409: { $ref: "#/components/responses/Conflict" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/payments/order/{order_id}": {
        get: {
            tags: ["Payments"],
            summary: "Get payment by order",
            security: [{ bearerAuth: [] }],
            parameters: [orderIdParam],
            responses: {
                200: ok("#/components/schemas/CustomerPaymentResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/payments/{payment_id}": {
        get: {
            tags: ["Payments"],
            summary: "Get payment detail",
            security: [{ bearerAuth: [] }],
            parameters: [paymentIdParam],
            responses: {
                200: ok("#/components/schemas/PaymentResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },
};
