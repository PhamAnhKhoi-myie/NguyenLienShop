const objectIdPattern = "^[a-fA-F0-9]{24}$";
const chatIntentEnum = [
    "GREETING",
    "ASK_PRICE",
    "SEARCH_PRODUCT",
    "ORDER_STATUS",
    "SHIPPING_POLICY",
    "PAYMENT_POLICY",
    "RETURN_POLICY",
    "UNKNOWN",
];

module.exports = {
    CreateChatSessionInput: {
        type: "object",
        additionalProperties: false,
        properties: {
            title: {
                type: "string",
                minLength: 1,
                maxLength: 100,
                example: "Product consultation",
            },
        },
    },

    SendChatMessageInput: {
        type: "object",
        required: ["session_id", "message"],
        additionalProperties: false,
        properties: {
            session_id: {
                type: "string",
                pattern: objectIdPattern,
                example: "507f1f77bcf86cd799439011",
            },
            message: {
                type: "string",
                minLength: 1,
                maxLength: 1000,
                example: "Túi bao xoài còn hàng không?",
            },
        },
    },

    ChatSession: {
        type: "object",
        required: ["_id", "user_id", "title", "is_deleted", "last_message_at", "createdAt", "updatedAt"],
        properties: {
            _id: {
                type: "string",
                pattern: objectIdPattern,
                example: "507f1f77bcf86cd799439011",
            },
            user_id: {
                type: "string",
                pattern: objectIdPattern,
                example: "507f1f77bcf86cd799439012",
            },
            title: {
                type: "string",
                example: "Product consultation",
            },
            context_summary: {
                type: "object",
                nullable: true,
                properties: {
                    short_term: { type: "string", nullable: true },
                    updated_at: { type: "string", format: "date-time", nullable: true },
                },
            },
            last_entities: {
                type: "object",
                nullable: true,
                properties: {
                    product: { type: "string", nullable: true },
                    category: { type: "string", nullable: true },
                },
            },
            is_deleted: {
                type: "boolean",
                example: false,
            },
            last_message_at: {
                type: "string",
                format: "date-time",
            },
            createdAt: {
                type: "string",
                format: "date-time",
            },
            updatedAt: {
                type: "string",
                format: "date-time",
            },
        },
    },

    ChatAssistantMessage: {
        type: "object",
        required: ["role", "content", "intent", "related_data", "quick_replies"],
        properties: {
            id: {
                type: "string",
                pattern: objectIdPattern,
                example: "507f1f77bcf86cd799439013",
            },
            session_id: {
                type: "string",
                pattern: objectIdPattern,
                example: "507f1f77bcf86cd799439011",
            },
            role: {
                type: "string",
                enum: ["assistant"],
                example: "assistant",
            },
            content: {
                type: "string",
                example: "Mình tìm thấy một vài sản phẩm phù hợp. Bạn xem nhanh các lựa chọn bên dưới nhé.",
            },
            intent: {
                type: "string",
                enum: chatIntentEnum,
                example: "SEARCH_PRODUCT",
            },
            confidence: {
                type: "number",
                minimum: 0,
                maximum: 1,
                example: 0.86,
            },
            related_data: {
                nullable: true,
                description: "Structured data for frontend cards.",
                oneOf: [
                    {
                        type: "object",
                        additionalProperties: true,
                        properties: {
                            type: {
                                type: "string",
                                enum: ["products", "order", "policy", "support"],
                            },
                            items: {
                                type: "array",
                                items: { type: "object", additionalProperties: true },
                            },
                            item: {
                                type: "object",
                                additionalProperties: true,
                            },
                        },
                    },
                    { type: "null" },
                ],
            },
            quick_replies: {
                type: "array",
                items: { type: "string" },
                example: ["Hỏi phí ship", "Kiểm tra đơn hàng"],
            },
            created_at: {
                type: "string",
                format: "date-time",
            },
        },
    },

    ChatSessionResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/ChatSession" },
        },
    },

    ChatMessageResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/ChatAssistantMessage" },
        },
    },
};
