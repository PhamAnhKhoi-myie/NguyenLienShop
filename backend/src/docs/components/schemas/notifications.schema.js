const objectIdPattern = "^[a-fA-F0-9]{24}$";
const notificationTypeEnum = ["order", "system", "promotion"];
const notificationPriorityEnum = ["low", "medium", "high"];
const notificationRefTypeEnum = ["order", "payment", "discount", "product"];

module.exports = {
    NotificationData: {
        type: "object",
        properties: {
            ref_type: {
                type: "string",
                enum: notificationRefTypeEnum,
                nullable: true,
                example: "order",
            },
            ref_id: {
                type: "string",
                pattern: objectIdPattern,
                nullable: true,
                example: "507f1f77bcf86cd799439011",
            },
            extra: {
                type: "object",
                nullable: true,
                additionalProperties: true,
                example: { order_code: "ORD-20260601-001" },
            },
        },
    },

    Notification: {
        type: "object",
        required: [
            "id",
            "user_id",
            "type",
            "title",
            "message",
            "data",
            "priority",
            "is_read",
            "read_at",
            "delivered_at",
            "expire_at",
            "created_at",
        ],
        properties: {
            id: {
                type: "string",
                pattern: objectIdPattern,
                example: "507f1f77bcf86cd799439011",
            },
            user_id: {
                type: "string",
                pattern: objectIdPattern,
                example: "507f1f77bcf86cd799439012",
            },
            type: {
                type: "string",
                enum: notificationTypeEnum,
                example: "order",
            },
            title: {
                type: "string",
                minLength: 1,
                maxLength: 200,
                example: "Order updated",
            },
            message: {
                type: "string",
                minLength: 1,
                maxLength: 1000,
                example: "Your order is being prepared.",
            },
            data: {
                oneOf: [
                    { $ref: "#/components/schemas/NotificationData" },
                    { type: "null" },
                ],
            },
            priority: {
                type: "string",
                enum: notificationPriorityEnum,
                example: "low",
            },
            is_read: {
                type: "boolean",
                example: false,
            },
            read_at: {
                type: "string",
                format: "date-time",
                nullable: true,
                example: null,
            },
            delivered_at: {
                type: "string",
                format: "date-time",
                nullable: true,
            },
            expire_at: {
                type: "string",
                format: "date-time",
                nullable: true,
                example: null,
            },
            created_at: {
                type: "string",
                format: "date-time",
            },
        },
    },

    NotificationResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/Notification" },
        },
    },

    NotificationsListResponse: {
        type: "object",
        required: ["success", "data", "pagination"],
        properties: {
            success: { type: "boolean", example: true },
            data: {
                type: "array",
                items: { $ref: "#/components/schemas/Notification" },
            },
            pagination: {
                type: "object",
                required: ["page", "limit", "total", "total_pages", "has_more"],
                properties: {
                    page: { type: "integer", minimum: 1, example: 1 },
                    limit: { type: "integer", minimum: 1, maximum: 100, example: 10 },
                    total: { type: "integer", minimum: 0, example: 42 },
                    total_pages: { type: "integer", minimum: 0, example: 5 },
                    has_more: { type: "boolean", example: true },
                },
            },
        },
    },

    UnreadNotificationCountResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: {
                type: "object",
                required: ["unread_count"],
                properties: {
                    unread_count: { type: "integer", minimum: 0, example: 3 },
                },
            },
        },
    },

    MarkBulkNotificationsReadInput: {
        type: "object",
        required: ["notification_ids"],
        additionalProperties: false,
        properties: {
            notification_ids: {
                type: "array",
                minItems: 1,
                maxItems: 100,
                items: {
                    type: "string",
                    pattern: objectIdPattern,
                },
                example: [
                    "507f1f77bcf86cd799439011",
                    "507f1f77bcf86cd799439012",
                ],
            },
        },
    },

    NotificationsMarkedReadResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: {
                type: "object",
                required: ["marked_count"],
                properties: {
                    marked_count: { type: "integer", minimum: 0, example: 2 },
                },
            },
        },
    },

    NotificationsDeletedResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: {
                type: "object",
                required: ["deleted_count"],
                properties: {
                    deleted_count: { type: "integer", minimum: 0, example: 12 },
                },
            },
        },
    },

    NotificationMessageResponse: {
        type: "object",
        required: ["success", "message"],
        properties: {
            success: { type: "boolean", example: true },
            message: {
                type: "string",
                example: "Notification deleted successfully",
            },
        },
    },
};
