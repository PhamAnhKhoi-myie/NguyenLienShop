const objectIdPattern = "^[a-fA-F0-9]{24}$";

const productIdParam = {
    in: "path",
    name: "productId",
    required: true,
    schema: { type: "string", pattern: objectIdPattern },
};

const categoryIdParam = {
    in: "path",
    name: "categoryId",
    required: true,
    schema: { type: "string", pattern: objectIdPattern },
};

const variantIdParam = {
    in: "path",
    name: "variantId",
    required: true,
    schema: { type: "string", pattern: objectIdPattern },
};

const unitIdParam = {
    in: "path",
    name: "unitId",
    required: true,
    schema: { type: "string", pattern: objectIdPattern },
};

const internalKeyHeader = {
    in: "header",
    name: "x-internal-key",
    required: true,
    schema: { type: "string" },
    description: "Internal API key. Required by requireInternal middleware.",
};

const commonListResponses = {
    400: { $ref: "#/components/responses/BadRequest" },
    500: { $ref: "#/components/responses/InternalError" },
};

const authErrors = {
    400: { $ref: "#/components/responses/BadRequest" },
    401: { $ref: "#/components/responses/Unauthorized" },
    403: { $ref: "#/components/responses/Forbidden" },
    404: { $ref: "#/components/responses/NotFound" },
    409: { $ref: "#/components/responses/Conflict" },
    500: { $ref: "#/components/responses/InternalError" },
};

module.exports = {
    "/products": {
        get: {
            tags: ["Products"],
            summary: "Get products",
            security: [],
            parameters: [
                { in: "query", name: "page", schema: { type: "integer", minimum: 1, default: 1 } },
                { in: "query", name: "limit", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
                { in: "query", name: "category_id", schema: { type: "string", pattern: objectIdPattern, nullable: true } },
                { in: "query", name: "min_price", schema: { type: "integer", minimum: 0 } },
                { in: "query", name: "max_price", schema: { type: "integer", minimum: 0 } },
                { in: "query", name: "status", schema: { type: "string", enum: ["ACTIVE", "INACTIVE"] } },
                { in: "query", name: "search", schema: { type: "string", maxLength: 100 } },
                {
                    in: "query",
                    name: "sortBy",
                    schema: {
                        type: "string",
                        enum: ["popular", "rating", "price_asc", "price_desc", "newest"],
                        default: "newest",
                    },
                },
            ],
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/ProductsPaginatedResponse" },
                        },
                    },
                },
                ...commonListResponses,
            },
        },
        post: {
            tags: ["Products"],
            summary: "Create product",
            description: "Admin or manager only.",
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/CreateProductInput" },
                    },
                },
            },
            responses: {
                201: {
                    description: "Created",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/ProductResponse" },
                        },
                    },
                },
                ...authErrors,
            },
        },
    },

    "/products/search": {
        get: {
            tags: ["Products"],
            summary: "Search products",
            security: [],
            parameters: [
                { in: "query", name: "q", required: true, schema: { type: "string", minLength: 2, maxLength: 100 } },
                { in: "query", name: "limit", schema: { type: "integer", minimum: 1, maximum: 50, default: 20 } },
            ],
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/ProductsListResponse" },
                        },
                    },
                },
                ...commonListResponses,
            },
        },
    },

    "/products/category/{categoryId}": {
        get: {
            tags: ["Products"],
            summary: "Get products by category",
            security: [],
            parameters: [
                categoryIdParam,
                { in: "query", name: "limit", schema: { type: "integer", minimum: 1, maximum: 100, default: 50 } },
            ],
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/ProductsListResponse" },
                        },
                    },
                },
                400: { $ref: "#/components/responses/BadRequest" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/products/slug/{slug}": {
        get: {
            tags: ["Products"],
            summary: "Get product by slug",
            security: [],
            parameters: [
                { in: "path", name: "slug", required: true, schema: { type: "string", minLength: 1, maxLength: 200 } },
                { in: "query", name: "include_units", schema: { type: "boolean", default: true } },
            ],
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/ProductDetailResponse" },
                        },
                    },
                },
                400: { $ref: "#/components/responses/BadRequest" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/products/{productId}": {
        get: {
            tags: ["Products"],
            summary: "Get product by id",
            security: [],
            parameters: [
                productIdParam,
                { in: "query", name: "include_units", schema: { type: "boolean", default: true } },
            ],
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/ProductDetailResponse" },
                        },
                    },
                },
                400: { $ref: "#/components/responses/BadRequest" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
        patch: {
            tags: ["Products"],
            summary: "Update product",
            description: "Admin or manager only.",
            security: [{ bearerAuth: [] }],
            parameters: [productIdParam],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/UpdateProductInput" },
                    },
                },
            },
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/ProductResponse" },
                        },
                    },
                },
                ...authErrors,
            },
        },
        delete: {
            tags: ["Products"],
            summary: "Soft delete product",
            description: "Admin or manager only. Variants are also soft-deleted.",
            security: [{ bearerAuth: [] }],
            parameters: [productIdParam],
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/ProductDeleteResponse" },
                        },
                    },
                },
                ...authErrors,
            },
        },
    },

    "/products/{productId}/variants": {
        get: {
            tags: ["Variants"],
            summary: "Get variants by product",
            security: [],
            parameters: [productIdParam],
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/VariantsListResponse" },
                        },
                    },
                },
                400: { $ref: "#/components/responses/BadRequest" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
        post: {
            tags: ["Variants"],
            summary: "Create variant",
            description: "Admin or manager only.",
            security: [{ bearerAuth: [] }],
            parameters: [productIdParam],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/CreateVariantInput" },
                    },
                },
            },
            responses: {
                201: {
                    description: "Created",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/VariantResponse" },
                        },
                    },
                },
                ...authErrors,
            },
        },
    },

    "/products/{productId}/variants/{variantId}": {
        get: {
            tags: ["Variants"],
            summary: "Get variant by id",
            security: [],
            parameters: [productIdParam, variantIdParam],
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/VariantResponse" },
                        },
                    },
                },
                400: { $ref: "#/components/responses/BadRequest" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
        patch: {
            tags: ["Variants"],
            summary: "Update variant",
            description: "Admin or manager only. Current service only allows status updates.",
            security: [{ bearerAuth: [] }],
            parameters: [productIdParam, variantIdParam],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/UpdateVariantInput" },
                    },
                },
            },
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/VariantResponse" },
                        },
                    },
                },
                ...authErrors,
            },
        },
        delete: {
            tags: ["Variants"],
            summary: "Soft delete variant",
            description: "Admin or manager only.",
            security: [{ bearerAuth: [] }],
            parameters: [productIdParam, variantIdParam],
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/VariantDeleteResponse" },
                        },
                    },
                },
                ...authErrors,
            },
        },
    },

    "/products/{productId}/variants/{variantId}/stock": {
        get: {
            tags: ["Variants"],
            summary: "Check variant stock",
            security: [],
            parameters: [productIdParam, variantIdParam],
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/VariantStockResponse" },
                        },
                    },
                },
                400: { $ref: "#/components/responses/BadRequest" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/products/{productId}/variants/{variantId}/max-order-qty": {
        get: {
            tags: ["Variants"],
            summary: "Get variant max order quantity",
            security: [],
            parameters: [
                productIdParam,
                variantIdParam,
                { in: "query", name: "pack_size", schema: { type: "integer", minimum: 1, default: 100 } },
            ],
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/VariantMaxOrderQtyResponse" },
                        },
                    },
                },
                400: { $ref: "#/components/responses/BadRequest" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/products/{productId}/variants/{variantId}/reserve-stock": {
        post: {
            tags: ["Variants"],
            summary: "Reserve variant stock",
            security: [],
            parameters: [internalKeyHeader, productIdParam, variantIdParam],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/ReserveStockInput" },
                    },
                },
            },
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/StockActionResponse" },
                        },
                    },
                },
                400: { $ref: "#/components/responses/BadRequest" },
                403: { $ref: "#/components/responses/Forbidden" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/products/{productId}/variants/{variantId}/complete-sale": {
        post: {
            tags: ["Variants"],
            summary: "Complete reserved stock sale",
            security: [],
            parameters: [internalKeyHeader, productIdParam, variantIdParam],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/ReserveStockInput" },
                    },
                },
            },
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/StockActionResponse" },
                        },
                    },
                },
                400: { $ref: "#/components/responses/BadRequest" },
                403: { $ref: "#/components/responses/Forbidden" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/products/{productId}/variants/{variantId}/release-stock": {
        post: {
            tags: ["Variants"],
            summary: "Release reserved variant stock",
            security: [],
            parameters: [internalKeyHeader, productIdParam, variantIdParam],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/ReserveStockInput" },
                    },
                },
            },
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/StockActionResponse" },
                        },
                    },
                },
                400: { $ref: "#/components/responses/BadRequest" },
                403: { $ref: "#/components/responses/Forbidden" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/variants/{variantId}/units": {
        get: {
            tags: ["Variant Units"],
            summary: "Get units by variant",
            security: [],
            parameters: [variantIdParam],
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/VariantUnitsListResponse" },
                        },
                    },
                },
                400: { $ref: "#/components/responses/BadRequest" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
        post: {
            tags: ["Variant Units"],
            summary: "Create variant unit",
            description: "Admin or manager only.",
            security: [{ bearerAuth: [] }],
            parameters: [variantIdParam],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/CreateVariantUnitInput" },
                    },
                },
            },
            responses: {
                201: {
                    description: "Created",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/VariantUnitResponse" },
                        },
                    },
                },
                ...authErrors,
            },
        },
    },

    "/variants/{variantId}/units/default": {
        get: {
            tags: ["Variant Units"],
            summary: "Get default unit for variant",
            security: [],
            parameters: [variantIdParam],
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/VariantUnitResponse" },
                        },
                    },
                },
                400: { $ref: "#/components/responses/BadRequest" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/variants/{variantId}/units/validate-tiers": {
        post: {
            tags: ["Variant Units"],
            summary: "Validate price tiers",
            description: "Admin or manager only. Nested alias under a variant route; the service validates only the submitted tiers.",
            security: [{ bearerAuth: [] }],
            parameters: [variantIdParam],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/ValidatePriceTiersInput" },
                    },
                },
            },
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/ValidatePriceTiersResponse" },
                        },
                    },
                },
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/variants/{variantId}/units/{unitId}": {
        get: {
            tags: ["Variant Units"],
            summary: "Get variant unit by id",
            security: [],
            parameters: [variantIdParam, unitIdParam],
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/VariantUnitResponse" },
                        },
                    },
                },
                400: { $ref: "#/components/responses/BadRequest" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
        patch: {
            tags: ["Variant Units"],
            summary: "Update variant unit",
            description: "Admin or manager only.",
            security: [{ bearerAuth: [] }],
            parameters: [variantIdParam, unitIdParam],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/UpdateVariantUnitInput" },
                    },
                },
            },
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/VariantUnitResponse" },
                        },
                    },
                },
                ...authErrors,
            },
        },
        delete: {
            tags: ["Variant Units"],
            summary: "Delete variant unit",
            description: "Admin or manager only.",
            security: [{ bearerAuth: [] }],
            parameters: [variantIdParam, unitIdParam],
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/VariantUnitDeleteResponse" },
                        },
                    },
                },
                ...authErrors,
            },
        },
    },

    "/variants/{variantId}/units/{unitId}/price-tiers": {
        get: {
            tags: ["Variant Units"],
            summary: "Get unit price tiers",
            security: [],
            parameters: [variantIdParam, unitIdParam],
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/PriceTierSummaryResponse" },
                        },
                    },
                },
                400: { $ref: "#/components/responses/BadRequest" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/variants/{variantId}/units/{unitId}/max-orderable-qty": {
        get: {
            tags: ["Variant Units"],
            summary: "Get max orderable quantity",
            security: [],
            parameters: [variantIdParam, unitIdParam],
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/MaxOrderableQtyResponse" },
                        },
                    },
                },
                400: { $ref: "#/components/responses/BadRequest" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/variants/{variantId}/units/{unitId}/calculate-price": {
        post: {
            tags: ["Variant Units"],
            summary: "Calculate unit price",
            security: [],
            parameters: [variantIdParam, unitIdParam],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/CalculatePriceInput" },
                    },
                },
            },
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/CalculatePriceResponse" },
                        },
                    },
                },
                400: { $ref: "#/components/responses/BadRequest" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/variant-units/{unitId}": {
        get: {
            tags: ["Variant Units"],
            summary: "Get variant unit by id",
            security: [],
            parameters: [unitIdParam],
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/VariantUnitResponse" },
                        },
                    },
                },
                400: { $ref: "#/components/responses/BadRequest" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
        patch: {
            tags: ["Variant Units"],
            summary: "Update variant unit",
            description: "Admin or manager only.",
            security: [{ bearerAuth: [] }],
            parameters: [unitIdParam],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/UpdateVariantUnitInput" },
                    },
                },
            },
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/VariantUnitResponse" },
                        },
                    },
                },
                ...authErrors,
            },
        },
        delete: {
            tags: ["Variant Units"],
            summary: "Delete variant unit",
            description: "Admin or manager only.",
            security: [{ bearerAuth: [] }],
            parameters: [unitIdParam],
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/VariantUnitDeleteResponse" },
                        },
                    },
                },
                ...authErrors,
            },
        },
    },

    "/variant-units/{unitId}/price-tiers": {
        get: {
            tags: ["Variant Units"],
            summary: "Get unit price tiers",
            security: [],
            parameters: [unitIdParam],
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/PriceTierSummaryResponse" },
                        },
                    },
                },
                400: { $ref: "#/components/responses/BadRequest" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/variant-units/{unitId}/max-orderable-qty": {
        get: {
            tags: ["Variant Units"],
            summary: "Get max orderable quantity",
            security: [],
            parameters: [unitIdParam],
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/MaxOrderableQtyResponse" },
                        },
                    },
                },
                400: { $ref: "#/components/responses/BadRequest" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/variant-units/{unitId}/calculate-price": {
        post: {
            tags: ["Variant Units"],
            summary: "Calculate unit price",
            security: [],
            parameters: [unitIdParam],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/CalculatePriceInput" },
                    },
                },
            },
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/CalculatePriceResponse" },
                        },
                    },
                },
                400: { $ref: "#/components/responses/BadRequest" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/variant-units/validate-tiers": {
        post: {
            tags: ["Variant Units"],
            summary: "Validate price tiers",
            description: "Admin or manager only.",
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/ValidatePriceTiersInput" },
                    },
                },
            },
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/ValidatePriceTiersResponse" },
                        },
                    },
                },
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },
};
