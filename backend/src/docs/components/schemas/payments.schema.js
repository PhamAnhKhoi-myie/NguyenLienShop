const objectIdPattern = "^[a-fA-F0-9]{24}$";
const providerEnum = ["vnpay", "stripe", "paypal"];
const paymentStatusEnum = ["pending", "paid", "failed"];
const verificationStatusEnum = ["pending", "verified", "failed"];

module.exports = {
    PaymentProviderData: {
        type: "object",
        nullable: true,
        properties: {
            vnp_txn_ref: { type: "string", nullable: true, example: "1715830000000_507f1f77bcf86cd799439020" },
            vnp_transaction_no: { type: "string", nullable: true, example: "14235820" },
            vnp_response_code: { type: "string", nullable: true, example: "00" },
            vnp_bank_code: { type: "string", nullable: true, example: "VCB" },
            vnp_pay_date: { type: "string", format: "date-time", nullable: true },
            stripe_pi_id: { type: "string", nullable: true, example: "pi_1234567890" },
            stripe_status: { type: "string", nullable: true, example: "succeeded" },
            stripe_client_secret: { type: "string", nullable: true, example: "***" },
            paypal_order_id: { type: "string", nullable: true, example: "EC-123456789" },
            paypal_payer_id: { type: "string", nullable: true, example: "PAYER123" },
        },
    },

    PaymentFailure: {
        type: "object",
        nullable: true,
        properties: {
            reason: { type: "string", nullable: true, example: "PAYMENT_EXPIRED" },
            code: { type: "string", nullable: true, example: "EXPIRED" },
            message: { type: "string", nullable: true, example: "Payment expired before completion" },
        },
    },

    Payment: {
        type: "object",
        required: [
            "id",
            "order_id",
            "user_id",
            "provider",
            "amount",
            "currency",
            "status",
            "verification_status",
            "transaction_ref",
            "created_at",
            "updated_at",
        ],
        properties: {
            id: { type: "string", pattern: objectIdPattern, example: "507f1f77bcf86cd799439030" },
            order_id: { type: "string", pattern: objectIdPattern, example: "507f1f77bcf86cd799439020" },
            user_id: { type: "string", pattern: objectIdPattern, example: "507f1f77bcf86cd799439011" },
            provider: { type: "string", enum: providerEnum, example: "vnpay" },
            amount: { type: "number", minimum: 0, example: 1650000 },
            currency: { type: "string", enum: ["VND", "USD"], default: "VND", example: "VND" },
            status: { type: "string", enum: paymentStatusEnum, example: "pending" },
            verification_status: { type: "string", enum: verificationStatusEnum, example: "pending" },
            transaction_ref: { type: "string", nullable: true, example: "1715830000000_507f1f77bcf86cd799439020" },
            failure_reason: { type: "string", nullable: true, example: null },
            failure_message: { type: "string", nullable: true, example: null },
            paid_at: { type: "string", format: "date-time", nullable: true, example: null },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
        },
    },

    PaymentDetail: {
        allOf: [
            { $ref: "#/components/schemas/Payment" },
            {
                type: "object",
                required: [
                    "status_label",
                    "verification_status_label",
                    "provider_data",
                    "failure",
                    "retry_count",
                    "expires_at",
                    "is_expired",
                ],
                properties: {
                    status_label: { type: "string", example: "Pending" },
                    verification_status_label: { type: "string", example: "Awaiting verification" },
                    webhook_verified_at: { type: "string", format: "date-time", nullable: true, example: null },
                    provider_data: { $ref: "#/components/schemas/PaymentProviderData" },
                    failure: { $ref: "#/components/schemas/PaymentFailure" },
                    retry_count: { type: "integer", minimum: 0, example: 0 },
                    last_retry_at: { type: "string", format: "date-time", nullable: true, example: null },
                    expires_at: { type: "string", format: "date-time", nullable: true, example: "2024-04-15T10:45:00Z" },
                    is_expired: { type: "boolean", example: false },
                },
            },
        ],
    },

    PaymentCustomerDetail: {
        type: "object",
        required: [
            "id",
            "order_id",
            "provider",
            "provider_label",
            "amount",
            "currency",
            "status",
            "status_label",
            "message",
            "can_retry",
            "can_cancel",
            "created_at",
        ],
        properties: {
            id: { type: "string", pattern: objectIdPattern, example: "507f1f77bcf86cd799439030" },
            order_id: { type: "string", pattern: objectIdPattern, example: "507f1f77bcf86cd799439020" },
            provider: { type: "string", enum: providerEnum, example: "vnpay" },
            provider_label: { type: "string", example: "VNPay" },
            amount: { type: "number", minimum: 0, example: 1650000 },
            currency: { type: "string", enum: ["VND", "USD"], default: "VND", example: "VND" },
            status: { type: "string", enum: paymentStatusEnum, example: "pending" },
            status_label: { type: "string", example: "Pending" },
            message: { type: "string", example: "Your payment is pending. Please complete the payment process to continue." },
            can_retry: { type: "boolean", example: false },
            can_cancel: { type: "boolean", example: true },
            created_at: { type: "string", format: "date-time" },
            paid_at: { type: "string", format: "date-time", nullable: true, example: null },
        },
    },

    PaymentAdminDetail: {
        allOf: [
            { $ref: "#/components/schemas/PaymentDetail" },
            {
                type: "object",
                required: [
                    "idempotency_key",
                    "webhook_data",
                    "is_deleted",
                    "deleted_at",
                ],
                properties: {
                    idempotency_key: { type: "string", example: "507f1f77bcf86cd799439011-507f1f77bcf86cd799439020" },
                    webhook_data: {
                        type: "object",
                        required: ["raw_ipn_present", "raw_return_present"],
                        properties: {
                            raw_ipn_present: { type: "boolean", example: false },
                            raw_return_present: { type: "boolean", example: false },
                        },
                    },
                    is_deleted: { type: "boolean", example: false },
                    deleted_at: { type: "string", format: "date-time", nullable: true, example: null },
                },
            },
        ],
    },

    PaymentListItem: {
        type: "object",
        required: [
            "id",
            "order_id",
            "user_id",
            "provider",
            "transaction_ref",
            "amount",
            "currency",
            "status",
            "status_label",
            "verification_status",
            "created_at",
        ],
        properties: {
            id: { type: "string", pattern: objectIdPattern, example: "507f1f77bcf86cd799439030" },
            order_id: { type: "string", pattern: objectIdPattern, example: "507f1f77bcf86cd799439020" },
            user_id: { type: "string", pattern: objectIdPattern, example: "507f1f77bcf86cd799439011" },
            provider: { type: "string", enum: providerEnum, example: "vnpay" },
            transaction_ref: { type: "string", nullable: true, example: "1715830000000_507f1f77bcf86cd799439020" },
            amount: { type: "number", minimum: 0, example: 1650000 },
            currency: { type: "string", enum: ["VND", "USD"], example: "VND" },
            status: { type: "string", enum: paymentStatusEnum, example: "pending" },
            status_label: { type: "string", example: "Pending" },
            verification_status: { type: "string", enum: verificationStatusEnum, example: "pending" },
            created_at: { type: "string", format: "date-time" },
            paid_at: { type: "string", format: "date-time", nullable: true, example: null },
        },
    },

    CreatePaymentInput: {
        type: "object",
        required: ["order_id"],
        properties: {
            order_id: { type: "string", pattern: objectIdPattern, example: "507f1f77bcf86cd799439020" },
            provider: { type: "string", enum: ["vnpay"], default: "vnpay", example: "vnpay" },
        },
    },

    CancelPaymentInput: {
        type: "object",
        properties: {
            reason: { type: "string", maxLength: 500, example: "Changed my mind about this order." },
        },
    },

    CreatePaymentResult: {
        type: "object",
        required: ["paymentId", "payment", "paymentUrl"],
        properties: {
            paymentId: { type: "string", pattern: objectIdPattern, example: "507f1f77bcf86cd799439030" },
            payment: { $ref: "#/components/schemas/Payment" },
            paymentUrl: { type: "string", format: "uri", example: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?..." },
        },
    },

    CreatePaymentResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/CreatePaymentResult" },
        },
    },

    RetryPaymentResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/CreatePaymentResult" },
        },
    },

    CancelPaymentResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: {
                type: "object",
                required: ["status", "reason", "message"],
                properties: {
                    status: { type: "string", enum: ["failed"], example: "failed" },
                    reason: { type: "string", example: "CANCELLED_BY_USER" },
                    message: { type: "string", example: "User cancelled" },
                },
            },
        },
    },

    PaymentResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: {
                oneOf: [
                    { $ref: "#/components/schemas/PaymentCustomerDetail" },
                    { $ref: "#/components/schemas/PaymentAdminDetail" },
                ],
            },
        },
    },

    CustomerPaymentResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/PaymentCustomerDetail" },
        },
    },

    AdminPaymentResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/PaymentAdminDetail" },
        },
    },

    PaymentsListResponse: {
        type: "object",
        required: ["success", "data", "pagination"],
        properties: {
            success: { type: "boolean", example: true },
            data: {
                type: "array",
                items: { $ref: "#/components/schemas/PaymentListItem" },
            },
            pagination: {
                type: "object",
                required: ["page", "limit", "total", "totalPages"],
                properties: {
                    page: { type: "integer", minimum: 1, example: 1 },
                    limit: { type: "integer", minimum: 1, maximum: 100, example: 20 },
                    total: { type: "integer", minimum: 0, example: 45 },
                    totalPages: { type: "integer", minimum: 0, example: 3 },
                },
            },
        },
    },

    AdminPaymentsListResponse: {
        type: "object",
        required: ["success", "data", "pagination"],
        properties: {
            success: { type: "boolean", example: true },
            data: {
                type: "array",
                items: { $ref: "#/components/schemas/PaymentAdminDetail" },
            },
            pagination: {
                type: "object",
                required: ["page", "limit", "total", "totalPages"],
                properties: {
                    page: { type: "integer", minimum: 1, example: 1 },
                    limit: { type: "integer", minimum: 1, maximum: 100, example: 20 },
                    total: { type: "integer", minimum: 0, example: 45 },
                    totalPages: { type: "integer", minimum: 0, example: 3 },
                },
            },
        },
    },

    VNPayWebhookInput: {
        type: "object",
        required: [
            "vnp_Amount",
            "vnp_PayDate",
            "vnp_ResponseCode",
            "vnp_TransactionStatus",
            "vnp_TmnCode",
            "vnp_TxnRef",
            "vnp_SecureHash",
        ],
        properties: {
            vnp_Amount: { oneOf: [{ type: "integer" }, { type: "string" }], example: "165000000" },
            vnp_BankCode: { type: "string", minLength: 2, maxLength: 10, nullable: true, example: "VCB" },
            vnp_BankTranNo: { type: "string", maxLength: 100, example: "VNP14235820" },
            vnp_CardType: { type: "string", example: "ATM" },
            vnp_OrderInfo: { type: "string", maxLength: 200, example: "Thanh toan don hang 507f1f77bcf86cd799439020" },
            vnp_PayDate: { type: "string", pattern: "^\\d{14}$", example: "20240415101500" },
            vnp_ResponseCode: { type: "string", pattern: "^\\d{2}$", example: "00" },
            vnp_TransactionStatus: { type: "string", pattern: "^\\d{2}$", example: "00" },
            vnp_TmnCode: { type: "string", minLength: 1, example: "2QXYZ" },
            vnp_TransactionNo: { type: "string", maxLength: 100, example: "14235820" },
            vnp_TxnRef: { type: "string", minLength: 1, maxLength: 100, example: "1715830000000_507f1f77bcf86cd799439020" },
            vnp_SecureHash: { type: "string", pattern: "^[a-fA-F0-9]{64}$|^[a-fA-F0-9]{128}$" },
            vnp_SecureHashType: { type: "string", default: "SHA512", example: "SHA512" },
        },
    },

    VNPayIPNResponse: {
        type: "object",
        required: ["RspCode", "Message"],
        properties: {
            RspCode: { type: "string", example: "00" },
            Message: { type: "string", example: "Confirm Success" },
        },
    },

    StripeWebhookInput: {
        type: "object",
        required: ["id", "object", "type", "data", "created", "livemode", "pending_webhooks"],
        properties: {
            id: { type: "string", example: "evt_1234567890" },
            object: { type: "string", enum: ["event"], default: "event" },
            type: { type: "string", example: "payment_intent.succeeded" },
            data: {
                type: "object",
                required: ["object"],
                properties: {
                    object: {
                        type: "object",
                        required: ["id", "object", "amount", "currency", "status"],
                        properties: {
                            id: { type: "string", pattern: "^pi_", example: "pi_1234567890" },
                            object: { type: "string", enum: ["payment_intent"], default: "payment_intent" },
                            amount: { type: "integer", minimum: 1, example: 1650000 },
                            currency: { type: "string", enum: ["VND", "USD"], example: "VND" },
                            status: {
                                type: "string",
                                enum: ["succeeded", "failed", "canceled", "processing", "requires_action"],
                                example: "succeeded",
                            },
                            metadata: {
                                type: "object",
                                properties: {
                                    order_id: { type: "string", pattern: objectIdPattern },
                                },
                            },
                        },
                    },
                },
            },
            created: { oneOf: [{ type: "integer" }, { type: "string" }], example: 1715830000 },
            request: {
                type: "object",
                properties: {
                    id: { type: "string", nullable: true },
                    idempotency_key: { type: "string", nullable: true },
                },
            },
            livemode: { type: "boolean", example: false },
            pending_webhooks: { type: "integer", minimum: 0, example: 1 },
            api_version: { type: "string", example: "2024-04-10" },
        },
    },

    PayPalWebhookInput: {
        type: "object",
        required: ["id", "event_type", "resource", "create_time"],
        properties: {
            id: { type: "string", example: "WH-123456789" },
            event_type: { type: "string", example: "CHECKOUT.ORDER.COMPLETED" },
            resource: {
                type: "object",
                required: ["id", "status", "amount"],
                properties: {
                    id: { type: "string", pattern: "^EC-", example: "EC-123456789" },
                    status: {
                        type: "string",
                        enum: ["APPROVED", "CAPTURED", "DECLINED", "EXPIRED", "VOIDED"],
                        example: "APPROVED",
                    },
                    amount: {
                        type: "object",
                        required: ["value", "currency_code"],
                        properties: {
                            value: { type: "string", pattern: "^\\d+(\\.\\d{2})?$", example: "16.50" },
                            currency_code: { type: "string", enum: ["VND", "USD"], example: "USD" },
                        },
                    },
                    payer: {
                        type: "object",
                        properties: {
                            email_address: { type: "string", format: "email", example: "buyer@example.com" },
                            payer_id: { type: "string", example: "PAYER123" },
                        },
                    },
                },
            },
            create_time: { type: "string", format: "date-time" },
            links: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        rel: { type: "string", example: "self" },
                        href: { type: "string", format: "uri" },
                    },
                },
            },
        },
    },

    WebhookResult: {
        type: "object",
        required: ["status"],
        properties: {
            status: { type: "string", enum: paymentStatusEnum, example: "paid" },
            orderId: { type: "string", pattern: objectIdPattern, nullable: true },
            paymentId: { type: "string", pattern: objectIdPattern, nullable: true },
            transactionRef: { type: "string", nullable: true, example: "14235820" },
            failureReason: { type: "string", nullable: true, example: "PAYMENT_REJECTED" },
            message: { type: "string", nullable: true, example: "Payment processed successfully" },
        },
    },

    WebhookResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/WebhookResult" },
        },
    },

    PaymentStatsFacetCount: {
        type: "object",
        required: ["count"],
        properties: {
            count: { type: "integer", minimum: 0, example: 1250 },
        },
    },

    PaymentStatsRevenue: {
        type: "object",
        required: ["_id", "total"],
        properties: {
            _id: { nullable: true, example: null },
            total: { type: "number", minimum: 0, example: 2500000000 },
        },
    },

    PaymentStatsBreakdownItem: {
        type: "object",
        required: ["_id", "count", "revenue"],
        properties: {
            _id: { type: "string", example: "paid" },
            count: { type: "integer", minimum: 0, example: 100 },
            revenue: { type: "number", minimum: 0, example: 250000000 },
        },
    },

    PaymentStats: {
        type: "object",
        required: ["totalPayments", "totalRevenue", "statusBreakdown", "providerBreakdown", "failedVerifications"],
        properties: {
            totalPayments: {
                type: "array",
                items: { $ref: "#/components/schemas/PaymentStatsFacetCount" },
            },
            totalRevenue: {
                type: "array",
                items: { $ref: "#/components/schemas/PaymentStatsRevenue" },
            },
            statusBreakdown: {
                type: "array",
                items: { $ref: "#/components/schemas/PaymentStatsBreakdownItem" },
            },
            providerBreakdown: {
                type: "array",
                items: { $ref: "#/components/schemas/PaymentStatsBreakdownItem" },
            },
            failedVerifications: {
                type: "array",
                items: { $ref: "#/components/schemas/PaymentStatsFacetCount" },
            },
        },
    },

    PaymentStatsResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/PaymentStats" },
        },
    },

    AdminVerifyPaymentResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: {
                type: "object",
                required: ["paymentId", "verification_status", "status", "message"],
                properties: {
                    paymentId: { type: "string", pattern: objectIdPattern },
                    verification_status: { type: "string", enum: verificationStatusEnum, example: "verified" },
                    status: { type: "string", enum: paymentStatusEnum, example: "paid" },
                    message: { type: "string", example: "Verification status: verified" },
                },
            },
        },
    },
};
