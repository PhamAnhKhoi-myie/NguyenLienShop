const objectIdPattern = "^[a-fA-F0-9]{24}$";

const reviewIdParam = {
    in: "path",
    name: "reviewId",
    required: true,
    schema: { type: "string", pattern: objectIdPattern },
    description: "Review ID.",
};

const productIdParam = {
    in: "path",
    name: "productId",
    required: true,
    schema: { type: "string", pattern: objectIdPattern },
    description: "Product ID.",
};

const variantIdParam = {
    in: "path",
    name: "variantId",
    required: true,
    schema: { type: "string", pattern: objectIdPattern },
    description: "Variant ID.",
};

const paginationQuery = (limitDefault = 10, limitMax = 50) => [
    { in: "query", name: "page", schema: { type: "integer", minimum: 1, default: 1 } },
    { in: "query", name: "limit", schema: { type: "integer", minimum: 1, maximum: limitMax, default: limitDefault } },
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
    "/reviews/product/{productId}": {
        get: {
            tags: ["Reviews"],
            summary: "Get product reviews",
            security: [],
            parameters: [productIdParam, ...paginationQuery()],
            responses: {
                200: ok("#/components/schemas/ReviewsListResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/reviews/variant/{variantId}": {
        get: {
            tags: ["Reviews"],
            summary: "Get variant reviews",
            security: [],
            parameters: [variantIdParam, ...paginationQuery()],
            responses: {
                200: ok("#/components/schemas/ReviewsListResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/reviews/{reviewId}": {
        get: {
            tags: ["Reviews"],
            summary: "Get review detail",
            security: [],
            parameters: [reviewIdParam],
            responses: {
                200: ok("#/components/schemas/ReviewResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
        put: {
            tags: ["Reviews"],
            summary: "Update own review",
            security: [{ bearerAuth: [] }],
            parameters: [reviewIdParam],
            requestBody: jsonBody("#/components/schemas/UpdateReviewInput"),
            responses: {
                200: ok("#/components/schemas/ReviewResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
        delete: {
            tags: ["Reviews"],
            summary: "Delete own review",
            security: [{ bearerAuth: [] }],
            parameters: [reviewIdParam],
            responses: {
                200: ok("#/components/schemas/ReviewMessageResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/reviews": {
        post: {
            tags: ["Reviews"],
            summary: "Create review",
            security: [{ bearerAuth: [] }],
            requestBody: jsonBody("#/components/schemas/CreateReviewInput"),
            responses: {
                201: {
                    description: "Created",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/ReviewResponse" },
                        },
                    },
                },
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                404: { $ref: "#/components/responses/NotFound" },
                409: { $ref: "#/components/responses/Conflict" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/reviews/user/my-reviews": {
        get: {
            tags: ["Reviews"],
            summary: "Get my reviews",
            security: [{ bearerAuth: [] }],
            parameters: paginationQuery(),
            responses: {
                200: ok("#/components/schemas/ReviewsListResponse"),
                401: { $ref: "#/components/responses/Unauthorized" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/reviews/{reviewId}/helpful": {
        post: {
            tags: ["Reviews"],
            summary: "Mark review as helpful or unhelpful",
            security: [{ bearerAuth: [] }],
            parameters: [reviewIdParam],
            requestBody: jsonBody("#/components/schemas/MarkHelpfulInput"),
            responses: {
                200: ok("#/components/schemas/ReviewMessageResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/reviews/{reviewId}/flag": {
        post: {
            tags: ["Reviews"],
            summary: "Flag review for moderation",
            security: [{ bearerAuth: [] }],
            parameters: [reviewIdParam],
            requestBody: jsonBody("#/components/schemas/FlagReviewInput"),
            responses: {
                200: ok("#/components/schemas/ReviewResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/reviews/admin/pending": {
        get: {
            tags: ["Reviews"],
            summary: "Get pending reviews",
            security: [{ bearerAuth: [] }],
            parameters: paginationQuery(20, 100),
            responses: {
                200: ok("#/components/schemas/AdminReviewsListResponse"),
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/reviews/admin/flagged": {
        get: {
            tags: ["Reviews"],
            summary: "Get flagged reviews",
            security: [{ bearerAuth: [] }],
            parameters: paginationQuery(20, 100),
            responses: {
                200: ok("#/components/schemas/AdminReviewsListResponse"),
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/reviews/{reviewId}/approve": {
        post: {
            tags: ["Reviews"],
            summary: "Approve review",
            security: [{ bearerAuth: [] }],
            parameters: [reviewIdParam],
            responses: {
                200: ok("#/components/schemas/AdminReviewResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/reviews/{reviewId}/reject": {
        post: {
            tags: ["Reviews"],
            summary: "Reject review",
            security: [{ bearerAuth: [] }],
            parameters: [reviewIdParam],
            requestBody: jsonBody("#/components/schemas/RejectReviewInput"),
            responses: {
                200: ok("#/components/schemas/AdminReviewResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },
};
