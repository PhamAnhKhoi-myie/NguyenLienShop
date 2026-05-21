const objectIdPattern = "^[a-fA-F0-9]{24}$";
const discountStatusEnum = ["active", "inactive", "paused", "expired"];
const discountTypeEnum = ["percent", "fixed"];

const discountIdParam = {
    in: "path",
    name: "discountId",
    required: true,
    schema: { type: "string", pattern: objectIdPattern },
    description: "Discount ID.",
};

const userIdParam = {
    in: "path",
    name: "userId",
    required: true,
    schema: { type: "string", pattern: objectIdPattern },
    description: "User ID.",
};

const listDiscountsQueryParams = [
    { in: "query", name: "page", schema: { type: "integer", minimum: 1, default: 1 } },
    { in: "query", name: "limit", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
    { in: "query", name: "status", schema: { type: "string", enum: discountStatusEnum } },
    { in: "query", name: "type", schema: { type: "string", enum: discountTypeEnum } },
    { in: "query", name: "search", schema: { type: "string" } },
    {
        in: "query",
        name: "sortBy",
        schema: {
            type: "string",
            enum: ["created_at", "expiry_date", "usage_count", "-created_at", "-expiry_date"],
            default: "-created_at",
        },
    },
];

const paginationOnlyQueryParams = [
    { in: "query", name: "page", schema: { type: "integer", minimum: 1, default: 1 } },
    { in: "query", name: "limit", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
];

const jsonBody = (schemaRef) => ({
    required: true,
    content: {
        "application/json": {
            schema: { $ref: schemaRef },
        },
    },
});

const response = (statusDescription, schemaRef) => ({
    description: statusDescription,
    content: {
        "application/json": {
            schema: { $ref: schemaRef },
        },
    },
});

module.exports = {
    "/discounts/validate": {
        post: {
            tags: ["Discounts"],
            summary: "Validate discount code",
            security: [],
            requestBody: jsonBody("#/components/schemas/ValidateDiscountInput"),
            responses: {
                200: response("OK", "#/components/schemas/ValidateDiscountResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/discounts/applicable": {
        post: {
            tags: ["Discounts"],
            summary: "Get applicable discounts for cart",
            security: [{ bearerAuth: [] }, {}],
            requestBody: jsonBody("#/components/schemas/ApplicableDiscountsInput"),
            responses: {
                200: response("OK", "#/components/schemas/ApplicableDiscountsResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/discounts": {
        post: {
            tags: ["Discounts"],
            summary: "Create discount",
            security: [{ bearerAuth: [] }],
            requestBody: jsonBody("#/components/schemas/CreateDiscountInput"),
            responses: {
                201: response("Created", "#/components/schemas/DiscountResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                409: { $ref: "#/components/responses/Conflict" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
        get: {
            tags: ["Discounts"],
            summary: "List discounts",
            security: [{ bearerAuth: [] }],
            parameters: listDiscountsQueryParams,
            responses: {
                200: response("OK", "#/components/schemas/DiscountsListResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/discounts/bulk/import": {
        post: {
            tags: ["Discounts"],
            summary: "Bulk import discounts",
            security: [{ bearerAuth: [] }],
            requestBody: jsonBody("#/components/schemas/BulkCreateDiscountInput"),
            responses: {
                207: response("Multi-Status", "#/components/schemas/BulkCreateDiscountResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/discounts/near-expiry": {
        get: {
            tags: ["Discounts"],
            summary: "Get discounts expiring soon",
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    in: "query",
                    name: "daysUntilExpiry",
                    schema: { type: "integer", minimum: 1, default: 7 },
                },
                {
                    in: "query",
                    name: "days",
                    schema: { type: "integer", minimum: 1 },
                    description: "Alias for daysUntilExpiry.",
                },
                ...paginationOnlyQueryParams,
            ],
            responses: {
                200: response("OK", "#/components/schemas/DiscountsListResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/discounts/user/{userId}": {
        get: {
            tags: ["Discounts"],
            summary: "Get discounts available for a user",
            security: [{ bearerAuth: [] }],
            parameters: [userIdParam, ...paginationOnlyQueryParams],
            responses: {
                200: response("OK", "#/components/schemas/DiscountsListResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/discounts/{discountId}/revoke": {
        post: {
            tags: ["Discounts"],
            summary: "Revoke discount",
            security: [{ bearerAuth: [] }],
            parameters: [discountIdParam],
            responses: {
                200: response("OK", "#/components/schemas/DiscountResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/discounts/{discountId}/duplicate": {
        post: {
            tags: ["Discounts"],
            summary: "Duplicate discount",
            security: [{ bearerAuth: [] }],
            parameters: [discountIdParam],
            requestBody: jsonBody("#/components/schemas/DuplicateDiscountInput"),
            responses: {
                201: response("Created", "#/components/schemas/DiscountResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                404: { $ref: "#/components/responses/NotFound" },
                409: { $ref: "#/components/responses/Conflict" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/discounts/{discountId}/stats": {
        get: {
            tags: ["Discounts"],
            summary: "Get discount usage statistics",
            security: [{ bearerAuth: [] }],
            parameters: [discountIdParam],
            responses: {
                200: response("OK", "#/components/schemas/DiscountUsageStatsResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/discounts/{discountId}": {
        get: {
            tags: ["Discounts"],
            summary: "Get discount detail",
            security: [{ bearerAuth: [] }],
            parameters: [discountIdParam],
            responses: {
                200: response("OK", "#/components/schemas/DiscountResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
        patch: {
            tags: ["Discounts"],
            summary: "Update discount",
            security: [{ bearerAuth: [] }],
            parameters: [discountIdParam],
            requestBody: jsonBody("#/components/schemas/UpdateDiscountInput"),
            responses: {
                200: response("OK", "#/components/schemas/DiscountResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                404: { $ref: "#/components/responses/NotFound" },
                409: { $ref: "#/components/responses/Conflict" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
        delete: {
            tags: ["Discounts"],
            summary: "Soft delete discount",
            security: [{ bearerAuth: [] }],
            parameters: [discountIdParam],
            responses: {
                200: response("OK", "#/components/schemas/DeleteDiscountResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },
};
