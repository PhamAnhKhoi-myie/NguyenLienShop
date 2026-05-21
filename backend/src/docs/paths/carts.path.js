const objectIdPattern = "^[a-fA-F0-9]{24}$";

const sessionKeyQuery = {
    in: "query",
    name: "session_key",
    schema: { type: "string", format: "uuid" },
    description: "Guest cart session key fallback when cookie/header is unavailable.",
};

const cartSessionHeader = {
    in: "header",
    name: "x-cart-session-key",
    schema: { type: "string", format: "uuid" },
    description: "Guest cart session key fallback.",
};

const cartFormatQuery = {
    in: "query",
    name: "format",
    schema: { type: "string", enum: ["summary", "detail", "checkout"], default: "summary" },
};

const includeItemsQuery = {
    in: "query",
    name: "include_items",
    schema: { type: "boolean", default: true },
    description: "Accepted by validator. Current controller always computes response from cart data.",
};

const itemIdParam = {
    in: "path",
    name: "itemId",
    required: true,
    schema: { type: "string", pattern: objectIdPattern },
};

const cartResponse = (schemaRef) => ({
    description: "OK",
    content: {
        "application/json": {
            schema: { $ref: schemaRef },
        },
    },
});

const authOrGuestSecurity = [{ bearerAuth: [] }, {}];

module.exports = {
    "/carts/guest": {
        post: {
            tags: ["Carts"],
            summary: "Create guest cart",
            security: [],
            parameters: [cartSessionHeader],
            requestBody: {
                required: false,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/CreateGuestCartInput" },
                    },
                },
            },
            responses: {
                201: {
                    description: "Created",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/CartResponse" },
                        },
                    },
                },
                400: { $ref: "#/components/responses/BadRequest" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
        get: {
            tags: ["Carts"],
            summary: "Get guest cart",
            security: [],
            parameters: [cartSessionHeader, sessionKeyQuery, includeItemsQuery, cartFormatQuery],
            responses: {
                200: cartResponse("#/components/schemas/CartSummaryResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/carts/guest/{sessionKey}": {
        get: {
            tags: ["Carts"],
            summary: "Get guest cart by session key",
            security: [],
            parameters: [
                {
                    in: "path",
                    name: "sessionKey",
                    required: true,
                    schema: { type: "string", format: "uuid" },
                },
                includeItemsQuery,
                cartFormatQuery,
            ],
            responses: {
                200: cartResponse("#/components/schemas/CartSummaryResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/carts": {
        get: {
            tags: ["Carts"],
            summary: "Get current user's cart",
            security: [{ bearerAuth: [] }],
            parameters: [includeItemsQuery, cartFormatQuery],
            responses: {
                200: cartResponse("#/components/schemas/CartSummaryResponse"),
                401: { $ref: "#/components/responses/Unauthorized" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
        delete: {
            tags: ["Carts"],
            summary: "Clear cart",
            security: authOrGuestSecurity,
            parameters: [
                cartSessionHeader,
                sessionKeyQuery,
                {
                    in: "query",
                    name: "keep_discount",
                    schema: { type: "boolean", default: false },
                },
            ],
            responses: {
                200: cartResponse("#/components/schemas/CartResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/carts/items": {
        post: {
            tags: ["Carts"],
            summary: "Add item to cart",
            security: authOrGuestSecurity,
            parameters: [cartSessionHeader, sessionKeyQuery],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/AddToCartInput" },
                    },
                },
            },
            responses: {
                200: cartResponse("#/components/schemas/CartResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                404: { $ref: "#/components/responses/NotFound" },
                409: { $ref: "#/components/responses/Conflict" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/carts/items/{itemId}": {
        patch: {
            tags: ["Carts"],
            summary: "Update cart item quantity",
            security: authOrGuestSecurity,
            parameters: [itemIdParam, cartSessionHeader, sessionKeyQuery],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/UpdateCartItemInput" },
                    },
                },
            },
            responses: {
                200: cartResponse("#/components/schemas/CartResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
        delete: {
            tags: ["Carts"],
            summary: "Remove item from cart",
            security: authOrGuestSecurity,
            parameters: [itemIdParam, cartSessionHeader, sessionKeyQuery],
            responses: {
                200: cartResponse("#/components/schemas/CartResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/carts/discount": {
        post: {
            tags: ["Carts"],
            summary: "Apply discount",
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/ApplyDiscountInput" },
                    },
                },
            },
            responses: {
                200: cartResponse("#/components/schemas/CartResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
        delete: {
            tags: ["Carts"],
            summary: "Remove discount",
            security: [{ bearerAuth: [] }],
            responses: {
                200: cartResponse("#/components/schemas/CartResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/carts/merge": {
        post: {
            tags: ["Carts"],
            summary: "Merge guest cart into user cart",
            security: [{ bearerAuth: [] }],
            parameters: [cartSessionHeader],
            requestBody: {
                required: false,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/MergeCartInput" },
                    },
                },
            },
            responses: {
                200: cartResponse("#/components/schemas/CartResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/carts/abandon": {
        post: {
            tags: ["Carts"],
            summary: "Mark current user's cart as abandoned",
            security: [{ bearerAuth: [] }],
            responses: {
                200: cartResponse("#/components/schemas/AbandonedResponse"),
                401: { $ref: "#/components/responses/Unauthorized" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/carts/checkout": {
        post: {
            tags: ["Carts"],
            summary: "Validate cart and create checkout snapshot",
            security: [{ bearerAuth: [] }],
            responses: {
                200: cartResponse("#/components/schemas/CheckoutResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/carts/validate": {
        get: {
            tags: ["Carts"],
            summary: "Validate current user's cart",
            security: [{ bearerAuth: [] }],
            responses: {
                200: cartResponse("#/components/schemas/ValidateResponse"),
                401: { $ref: "#/components/responses/Unauthorized" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/carts/admin/abandoned": {
        get: {
            tags: ["Carts"],
            summary: "Get abandoned carts",
            description: "Admin only.",
            security: [{ bearerAuth: [] }],
            parameters: [
                { in: "query", name: "days_ago", schema: { type: "integer", minimum: 1, default: 7 } },
                { in: "query", name: "limit", schema: { type: "integer", minimum: 1, maximum: 500, default: 100 } },
            ],
            responses: {
                200: cartResponse("#/components/schemas/CartListResponse"),
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },
};
