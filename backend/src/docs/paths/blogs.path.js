const blogIdParam = {
    in: "path",
    name: "id",
    required: true,
    schema: {
        type: "string",
        pattern: "^[a-fA-F0-9]{24}$",
    },
};

const blogSlugParam = {
    in: "path",
    name: "slug",
    required: true,
    schema: {
        type: "string",
        pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
    },
};

const blogCategoryParam = {
    in: "path",
    name: "category",
    required: true,
    schema: {
        type: "string",
    },
};

const paginationParams = [
    {
        in: "query",
        name: "page",
        schema: { type: "integer", minimum: 1, default: 1 },
    },
    {
        in: "query",
        name: "limit",
        schema: { type: "integer", minimum: 1, maximum: 50, default: 12 },
    },
];

module.exports = {
    "/blogs": {
        get: {
            tags: ["Blogs"],
            summary: "List published blogs",
            parameters: [
                ...paginationParams,
                { in: "query", name: "category", schema: { type: "string" } },
                { in: "query", name: "tag", schema: { type: "string" } },
                { in: "query", name: "search", schema: { type: "string" } },
            ],
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/BlogListResponse" },
                        },
                    },
                },
                400: { $ref: "#/components/responses/BadRequest" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
        post: {
            tags: ["Blogs"],
            summary: "Create blog",
            description: "Admin/Manager only.",
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/CreateBlogInput" },
                    },
                },
            },
            responses: {
                201: {
                    description: "Created",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/BlogResponse" },
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

    "/blogs/categories/{category}": {
        get: {
            tags: ["Blogs"],
            summary: "List published blogs by category",
            parameters: [blogCategoryParam, ...paginationParams],
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/BlogListResponse" },
                        },
                    },
                },
                400: { $ref: "#/components/responses/BadRequest" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/blogs/{slug}": {
        get: {
            tags: ["Blogs"],
            summary: "Get published blog by slug",
            parameters: [blogSlugParam],
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/BlogResponse" },
                        },
                    },
                },
                400: { $ref: "#/components/responses/BadRequest" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/blogs/admin/all": {
        get: {
            tags: ["Blogs"],
            summary: "Admin list blogs",
            description: "Admin/Manager only.",
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    in: "query",
                    name: "page",
                    schema: { type: "integer", minimum: 1, default: 1 },
                },
                {
                    in: "query",
                    name: "limit",
                    schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
                },
                {
                    in: "query",
                    name: "status",
                    schema: { $ref: "#/components/schemas/BlogStatus" },
                },
                { in: "query", name: "category", schema: { type: "string" } },
                { in: "query", name: "tag", schema: { type: "string" } },
                { in: "query", name: "search", schema: { type: "string" } },
            ],
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/BlogListResponse" },
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

    "/blogs/admin/{id}": {
        get: {
            tags: ["Blogs"],
            summary: "Admin get blog detail",
            description: "Admin/Manager only.",
            security: [{ bearerAuth: [] }],
            parameters: [blogIdParam],
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/BlogResponse" },
                        },
                    },
                },
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/blogs/{id}": {
        patch: {
            tags: ["Blogs"],
            summary: "Update blog",
            description: "Admin/Manager only.",
            security: [{ bearerAuth: [] }],
            parameters: [blogIdParam],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/UpdateBlogInput" },
                    },
                },
            },
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/BlogResponse" },
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
        delete: {
            tags: ["Blogs"],
            summary: "Archive blog",
            description: "Admin/Manager only. Sets status to ARCHIVED.",
            security: [{ bearerAuth: [] }],
            parameters: [blogIdParam],
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/BlogResponse" },
                        },
                    },
                },
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/blogs/{id}/publish": {
        patch: {
            tags: ["Blogs"],
            summary: "Publish blog",
            description: "Admin/Manager only.",
            security: [{ bearerAuth: [] }],
            parameters: [blogIdParam],
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/BlogResponse" },
                        },
                    },
                },
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/blogs/{id}/archive": {
        patch: {
            tags: ["Blogs"],
            summary: "Archive blog",
            description: "Admin/Manager only.",
            security: [{ bearerAuth: [] }],
            parameters: [blogIdParam],
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/BlogResponse" },
                        },
                    },
                },
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },
};
