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
    "/shop-info": {
        get: {
            tags: ["Shop Info"],
            summary: "Get shop information",
            security: [],
            responses: {
                200: ok("#/components/schemas/ShopInfoResponse"),
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
        post: {
            tags: ["Shop Info"],
            summary: "Create shop information",
            security: [{ bearerAuth: [] }],
            description: "Creates the singleton shop information record. Returns 409 when it already exists.",
            requestBody: jsonBody("#/components/schemas/CreateShopInfoInput"),
            responses: {
                201: {
                    description: "Created",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/ShopInfoResponse" },
                        },
                    },
                },
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                409: { $ref: "#/components/responses/Conflict" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
        patch: {
            tags: ["Shop Info"],
            summary: "Update shop information",
            security: [{ bearerAuth: [] }],
            requestBody: jsonBody("#/components/schemas/UpdateShopInfoInput"),
            responses: {
                200: ok("#/components/schemas/ShopInfoResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/shop-info/contact": {
        get: {
            tags: ["Shop Info"],
            summary: "Get contact information",
            security: [],
            responses: {
                200: ok("#/components/schemas/ShopContactInfoResponse"),
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/shop-info/hours": {
        get: {
            tags: ["Shop Info"],
            summary: "Get working hours",
            security: [],
            responses: {
                200: ok("#/components/schemas/ShopWorkingHoursResponse"),
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/shop-info/social": {
        get: {
            tags: ["Shop Info"],
            summary: "Get social links",
            security: [],
            responses: {
                200: ok("#/components/schemas/ShopSocialLinksResponse"),
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/shop-info/is-open": {
        get: {
            tags: ["Shop Info"],
            summary: "Check current open status",
            security: [],
            description: "Returns false when shop information is missing or inactive.",
            responses: {
                200: ok("#/components/schemas/ShopIsOpenResponse"),
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/shop-info/next-opening": {
        get: {
            tags: ["Shop Info"],
            summary: "Get next opening time",
            security: [],
            description: "Returns null when shop information is missing, inactive, or no working day is configured.",
            responses: {
                200: ok("#/components/schemas/ShopNextOpeningResponse"),
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/shop-info/status": {
        patch: {
            tags: ["Shop Info"],
            summary: "Update shop active status",
            security: [{ bearerAuth: [] }],
            requestBody: jsonBody("#/components/schemas/ToggleShopStatusInput"),
            responses: {
                200: ok("#/components/schemas/ShopInfoResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },
};
