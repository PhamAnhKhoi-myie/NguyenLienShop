const objectIdPattern = "^[a-fA-F0-9]{24}$";
const bannerLocationEnum = ["homepage_top", "homepage_middle", "homepage_bottom", "category_page"];

const bannerIdParam = {
    name: "id",
    in: "path",
    required: true,
    schema: { type: "string", pattern: objectIdPattern },
    description: "Banner ID.",
};

const locationParam = {
    name: "location",
    in: "path",
    required: true,
    schema: { type: "string", enum: bannerLocationEnum },
    description: "Banner location.",
};

const locationQuery = {
    name: "location",
    in: "query",
    schema: { type: "string", enum: bannerLocationEnum },
    description: "Optional location filter.",
};

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
    "/banners/location/{location}": {
        get: {
            tags: ["Banners"],
            summary: "Get active banners by location",
            security: [],
            parameters: [locationParam],
            responses: {
                200: ok("#/components/schemas/BannersListResponse"),
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/banners/deleted": {
        get: {
            tags: ["Banners"],
            summary: "Get deleted banners",
            security: [{ bearerAuth: [] }],
            responses: {
                200: ok("#/components/schemas/BannersListResponse"),
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/banners": {
        get: {
            tags: ["Banners"],
            summary: "Get all banners",
            security: [{ bearerAuth: [] }],
            parameters: [locationQuery],
            responses: {
                200: ok("#/components/schemas/BannersListResponse"),
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
        post: {
            tags: ["Banners"],
            summary: "Create banner",
            security: [{ bearerAuth: [] }],
            requestBody: jsonBody("#/components/schemas/CreateBannerInput"),
            responses: {
                201: {
                    description: "Created",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/BannerResponse" },
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
    },

    "/banners/{id}": {
        get: {
            tags: ["Banners"],
            summary: "Get banner by ID",
            security: [],
            parameters: [bannerIdParam],
            responses: {
                200: ok("#/components/schemas/BannerResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
        put: {
            tags: ["Banners"],
            summary: "Update banner",
            security: [{ bearerAuth: [] }],
            parameters: [bannerIdParam],
            requestBody: jsonBody("#/components/schemas/UpdateBannerInput"),
            responses: {
                200: ok("#/components/schemas/BannerResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                404: { $ref: "#/components/responses/NotFound" },
                409: { $ref: "#/components/responses/Conflict" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
        delete: {
            tags: ["Banners"],
            summary: "Soft delete banner",
            security: [{ bearerAuth: [] }],
            parameters: [bannerIdParam],
            responses: {
                200: ok("#/components/schemas/BannerMessageResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/banners/{id}/restore": {
        post: {
            tags: ["Banners"],
            summary: "Restore deleted banner",
            security: [{ bearerAuth: [] }],
            parameters: [bannerIdParam],
            responses: {
                200: ok("#/components/schemas/BannerResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },
};
