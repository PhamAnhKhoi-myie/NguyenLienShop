const objectIdPattern = "^[a-fA-F0-9]{24}$";
const notificationTypeEnum = ["order", "system", "promotion"];
const notificationPriorityEnum = ["low", "medium", "high"];

const notificationIdParam = {
    name: "notificationId",
    in: "path",
    required: true,
    schema: { type: "string", pattern: objectIdPattern },
    description: "Notification ID.",
};

const ok = (schemaRef) => ({
    description: "OK",
    content: {
        "application/json": {
            schema: { $ref: schemaRef },
        },
    },
});

const jsonBody = (schemaRef) => ({
    required: true,
    content: {
        "application/json": {
            schema: { $ref: schemaRef },
        },
    },
});

module.exports = {
    "/notifications/unread-count": {
        get: {
            tags: ["Notifications"],
            summary: "Get unread notification count",
            security: [{ bearerAuth: [] }],
            responses: {
                200: ok("#/components/schemas/UnreadNotificationCountResponse"),
                401: { $ref: "#/components/responses/Unauthorized" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/notifications/mark-all-read": {
        patch: {
            tags: ["Notifications"],
            summary: "Mark all notifications as read",
            security: [{ bearerAuth: [] }],
            responses: {
                200: ok("#/components/schemas/NotificationsMarkedReadResponse"),
                401: { $ref: "#/components/responses/Unauthorized" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/notifications/bulk/mark-read": {
        patch: {
            tags: ["Notifications"],
            summary: "Mark multiple notifications as read",
            security: [{ bearerAuth: [] }],
            requestBody: jsonBody("#/components/schemas/MarkBulkNotificationsReadInput"),
            responses: {
                200: ok("#/components/schemas/NotificationsMarkedReadResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/notifications": {
        get: {
            tags: ["Notifications"],
            summary: "Get paginated notifications",
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: "page",
                    in: "query",
                    schema: { type: "integer", minimum: 1, default: 1 },
                },
                {
                    name: "limit",
                    in: "query",
                    schema: { type: "integer", minimum: 1, maximum: 100, default: 10 },
                },
                {
                    name: "type",
                    in: "query",
                    schema: { type: "string", enum: notificationTypeEnum },
                },
                {
                    name: "priority",
                    in: "query",
                    schema: { type: "string", enum: notificationPriorityEnum },
                },
                {
                    name: "unread_only",
                    in: "query",
                    schema: { type: "string", enum: ["true", "false"], default: "false" },
                    description: "When true, returns only unread notifications.",
                },
            ],
            responses: {
                200: ok("#/components/schemas/NotificationsListResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
        delete: {
            tags: ["Notifications"],
            summary: "Delete all notifications",
            security: [{ bearerAuth: [] }],
            description: "Soft deletes all notifications for the authenticated user.",
            responses: {
                200: ok("#/components/schemas/NotificationsDeletedResponse"),
                401: { $ref: "#/components/responses/Unauthorized" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/notifications/{notificationId}": {
        get: {
            tags: ["Notifications"],
            summary: "Get notification by ID",
            security: [{ bearerAuth: [] }],
            parameters: [notificationIdParam],
            responses: {
                200: ok("#/components/schemas/NotificationResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
        delete: {
            tags: ["Notifications"],
            summary: "Delete notification",
            security: [{ bearerAuth: [] }],
            parameters: [notificationIdParam],
            responses: {
                200: ok("#/components/schemas/NotificationMessageResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/notifications/{notificationId}/read": {
        patch: {
            tags: ["Notifications"],
            summary: "Mark notification as read",
            security: [{ bearerAuth: [] }],
            parameters: [notificationIdParam],
            responses: {
                200: ok("#/components/schemas/NotificationResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },
};
