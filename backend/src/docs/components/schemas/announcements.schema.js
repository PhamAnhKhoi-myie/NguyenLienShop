const objectIdPattern = "^[a-fA-F0-9]{24}$";
const announcementTargetEnum = ["all", "user", "admin", "guest"];
const announcementTypeEnum = ["info", "warning", "promotion", "system", "urgent"];

module.exports = {
    CreateAnnouncementInput: {
        type: "object",
        required: ["title", "content", "start_at", "end_at"],
        additionalProperties: false,
        properties: {
            title: {
                type: "string",
                minLength: 5,
                maxLength: 200,
                example: "Black Friday promotion",
            },
            content: {
                type: "string",
                minLength: 10,
                maxLength: 5000,
                example: "Discounts up to 50 percent for selected products.",
            },
            priority: {
                type: "integer",
                minimum: 0,
                maximum: 10,
                default: 0,
                example: 10,
            },
            target: {
                type: "string",
                enum: announcementTargetEnum,
                default: "all",
                example: "all",
            },
            type: {
                type: "string",
                enum: announcementTypeEnum,
                default: "info",
                example: "promotion",
            },
            start_at: {
                type: "string",
                format: "date-time",
                example: "2026-06-01T00:00:00Z",
            },
            end_at: {
                type: "string",
                format: "date-time",
                description: "Must be after start_at.",
                example: "2026-06-30T23:59:59Z",
            },
            is_dismissible: {
                type: "boolean",
                default: true,
                example: true,
            },
        },
    },

    UpdateAnnouncementInput: {
        type: "object",
        additionalProperties: false,
        properties: {
            title: {
                type: "string",
                minLength: 5,
                maxLength: 200,
            },
            content: {
                type: "string",
                minLength: 10,
                maxLength: 5000,
            },
            priority: {
                type: "integer",
                minimum: 0,
                maximum: 10,
            },
            target: {
                type: "string",
                enum: announcementTargetEnum,
            },
            type: {
                type: "string",
                enum: announcementTypeEnum,
            },
            start_at: {
                type: "string",
                format: "date-time",
            },
            end_at: {
                type: "string",
                format: "date-time",
                description: "Must be after start_at when both dates are provided.",
            },
            is_dismissible: {
                type: "boolean",
            },
        },
    },

    Announcement: {
        type: "object",
        required: [
            "id",
            "title",
            "content",
            "priority",
            "target",
            "type",
            "is_dismissible",
            "start_at",
            "end_at",
            "is_active",
            "created_at",
            "updated_at",
            "created_by",
        ],
        properties: {
            id: {
                type: "string",
                pattern: objectIdPattern,
                example: "507f1f77bcf86cd799439011",
            },
            title: {
                type: "string",
                minLength: 5,
                maxLength: 200,
                example: "Black Friday promotion",
            },
            content: {
                type: "string",
                minLength: 10,
                maxLength: 5000,
                example: "Discounts up to 50 percent for selected products.",
            },
            priority: {
                type: "integer",
                minimum: 0,
                maximum: 10,
                example: 10,
            },
            target: {
                type: "string",
                enum: announcementTargetEnum,
                example: "all",
            },
            type: {
                type: "string",
                enum: announcementTypeEnum,
                example: "promotion",
            },
            is_dismissible: {
                type: "boolean",
                example: true,
            },
            start_at: {
                type: "string",
                format: "date-time",
            },
            end_at: {
                type: "string",
                format: "date-time",
            },
            is_active: {
                type: "boolean",
                description: "Computed from start_at <= now < end_at.",
                example: true,
            },
            created_at: {
                type: "string",
                format: "date-time",
            },
            updated_at: {
                type: "string",
                format: "date-time",
            },
            created_by: {
                type: "string",
                pattern: objectIdPattern,
                nullable: true,
                example: "507f1f77bcf86cd799439012",
            },
        },
    },

    AnnouncementListItem: {
        allOf: [{ $ref: "#/components/schemas/Announcement" }],
    },

    AnnouncementResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/Announcement" },
        },
    },

    AnnouncementsListResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: {
                type: "array",
                items: { $ref: "#/components/schemas/AnnouncementListItem" },
            },
        },
    },

    AnnouncementRestoreResponse: {
        type: "object",
        required: ["success", "data", "message"],
        properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/Announcement" },
            message: {
                type: "string",
                example: "Announcement restored successfully",
            },
        },
    },

    AnnouncementMessageResponse: {
        type: "object",
        required: ["success", "message"],
        properties: {
            success: { type: "boolean", example: true },
            message: {
                type: "string",
                example: "Announcement deleted successfully",
            },
        },
    },
};
