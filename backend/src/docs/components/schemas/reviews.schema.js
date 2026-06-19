const objectIdPattern = "^[a-fA-F0-9]{24}$";
const flagReasonEnum = ["spam", "inappropriate", "fake", "duplicate", "other"];

const objectId = (example = "507f1f77bcf86cd799439011") => ({
    type: "string",
    pattern: objectIdPattern,
    example,
});

const pagination = {
    type: "object",
    required: ["page", "limit", "total", "totalPages"],
    properties: {
        page: { type: "integer", minimum: 1, example: 1 },
        limit: { type: "integer", minimum: 1, example: 10 },
        total: { type: "integer", minimum: 0, example: 25 },
        totalPages: { type: "integer", minimum: 0, example: 3 },
    },
};

module.exports = {
    ReviewRating: {
        type: "object",
        required: ["overall"],
        properties: {
            overall: { type: "integer", minimum: 1, maximum: 5, example: 5 },
            quality: { type: "integer", minimum: 1, maximum: 5, nullable: true, example: null },
            value_for_money: { type: "integer", minimum: 1, maximum: 5, nullable: true, example: null },
            delivery_speed: { type: "integer", minimum: 1, maximum: 5, nullable: true, example: null },
        },
    },

    ReviewDTO: {
        type: "object",
        required: [
            "id",
            "user_id",
            "product_id",
            "variant_id",
            "is_verified_purchase",
            "rating",
            "title",
            "edit_count",
            "edited_at",
            "helpful_count",
            "unhelpful_count",
            "user_vote",
            "created_at",
            "updated_at",
        ],
        properties: {
            id: objectId(),
            user_id: objectId("507f1f77bcf86cd799439012"),
            product_id: objectId("507f1f77bcf86cd799439010"),
            variant_id: objectId("507f1f77bcf86cd799439013"),
            is_verified_purchase: { type: "boolean", example: true },
            rating: { $ref: "#/components/schemas/ReviewRating" },
            title: { type: "string", maxLength: 200, nullable: true, example: "Great product" },
            content: {
                type: "string",
                maxLength: 5000,
                nullable: true,
                example: "This product exceeded my expectations. Quality is excellent.",
            },
            edit_count: { type: "integer", minimum: 0, example: 0 },
            edited_at: { type: "string", format: "date-time", nullable: true, example: null },
            helpful_count: { type: "integer", minimum: 0, example: 15 },
            unhelpful_count: { type: "integer", minimum: 0, example: 2 },
            user_vote: { type: "string", enum: ["helpful", "unhelpful"], nullable: true, example: null },
            is_approved: {
                type: "boolean",
                example: false,
                description: "Present in authenticated owner/admin responses. Public DTOs omit this field.",
            },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
        },
    },

    ReviewListItem: {
        allOf: [{ $ref: "#/components/schemas/ReviewDTO" }],
    },

    AdminReviewDTO: {
        allOf: [
            { $ref: "#/components/schemas/ReviewDTO" },
            {
                type: "object",
                required: [
                    "is_flagged",
                    "flag_reason",
                    "approved_at",
                    "approved_by",
                    "rejected_at",
                    "rejection_reason",
                    "flagged_by",
                ],
                properties: {
                    is_flagged: { type: "boolean", example: false },
                    flag_reason: { type: "string", enum: flagReasonEnum, nullable: true, example: null },
                    approved_at: { type: "string", format: "date-time", nullable: true, example: null },
                    approved_by: { type: "string", pattern: objectIdPattern, nullable: true, example: null },
                    rejected_at: { type: "string", format: "date-time", nullable: true, example: null },
                    rejection_reason: { type: "string", nullable: true, example: null },
                    flagged_by: { type: "string", pattern: objectIdPattern, nullable: true, example: null },
                },
            },
        ],
    },

    CreateReviewInput: {
        type: "object",
        required: ["product_id", "variant_id", "order_id", "rating"],
        properties: {
            product_id: objectId("507f1f77bcf86cd799439010"),
            variant_id: objectId("507f1f77bcf86cd799439013"),
            order_id: objectId("507f1f77bcf86cd799439020"),
            rating: { type: "integer", minimum: 1, maximum: 5, example: 5 },
            title: { type: "string", maxLength: 200, nullable: true, example: "Great product" },
            content: {
                type: "string",
                maxLength: 5000,
                nullable: true,
                example: "This product exceeded my expectations. Quality is excellent.",
            },
        },
    },

    UpdateReviewInput: {
        type: "object",
        properties: {
            rating: { type: "integer", minimum: 1, maximum: 5, example: 4 },
            title: { type: "string", maxLength: 200, nullable: true, example: "Updated title" },
            content: {
                type: "string",
                maxLength: 5000,
                nullable: true,
                example: "Updated review content with enough detail.",
            },
        },
    },

    MarkHelpfulInput: {
        type: "object",
        required: ["helpful"],
        properties: {
            helpful: { type: "boolean", example: true },
        },
    },

    FlagReviewInput: {
        type: "object",
        required: ["reason"],
        properties: {
            reason: { type: "string", enum: flagReasonEnum, example: "spam" },
        },
    },

    RejectReviewInput: {
        type: "object",
        required: ["reason"],
        properties: {
            reason: {
                type: "string",
                minLength: 5,
                maxLength: 500,
                example: "Contains inappropriate language.",
            },
        },
    },

    ReviewResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Review approved successfully" },
            data: { $ref: "#/components/schemas/ReviewDTO" },
        },
    },

    AdminReviewResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Review approved successfully" },
            data: { $ref: "#/components/schemas/AdminReviewDTO" },
        },
    },

    ReviewsListResponse: {
        type: "object",
        required: ["success", "data", "pagination"],
        properties: {
            success: { type: "boolean", example: true },
            data: {
                type: "array",
                items: { $ref: "#/components/schemas/ReviewListItem" },
            },
            pagination,
        },
    },

    AdminReviewsListResponse: {
        type: "object",
        required: ["success", "data", "pagination"],
        properties: {
            success: { type: "boolean", example: true },
            data: {
                type: "array",
                items: { $ref: "#/components/schemas/AdminReviewDTO" },
            },
            pagination: {
                ...pagination,
                properties: {
                    ...pagination.properties,
                    limit: { type: "integer", minimum: 1, example: 20 },
                    total: { type: "integer", minimum: 0, example: 50 },
                },
            },
        },
    },

    ReviewMessageResponse: {
        type: "object",
        required: ["success", "message"],
        properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Vote recorded successfully" },
        },
    },
};
