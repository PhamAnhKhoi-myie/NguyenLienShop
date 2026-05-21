const categoryIdParam = {
    in: "path",
    name: "categoryId",
    required: true,
    schema: {
        type: "string",
        pattern: "^[a-fA-F0-9]{24}$",
    },
};

const includeInactiveQuery = {
    in: "query",
    name: "include_inactive",
    schema: {
        type: "boolean",
        default: false,
    },
};

module.exports = {
    "/categories/tree": {
        get: {
            tags: ["Categories"],
            summary: "Get category tree",
            security: [],
            parameters: [includeInactiveQuery],
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/CategoryTreeResponse" },
                        },
                    },
                },
                400: { $ref: "#/components/responses/BadRequest" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/categories/all": {
        get: {
            tags: ["Categories"],
            summary: "Get all categories",
            security: [],
            parameters: [
                {
                    in: "query",
                    name: "status",
                    schema: { type: "string", enum: ["ACTIVE", "INACTIVE"] },
                },
                {
                    in: "query",
                    name: "parent_id",
                    schema: {
                        type: "string",
                        pattern: "^[a-fA-F0-9]{24}$",
                        nullable: true,
                    },
                },
            ],
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/CategoriesListResponse" },
                        },
                    },
                },
                400: { $ref: "#/components/responses/BadRequest" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/categories/slug/{slug}": {
        get: {
            tags: ["Categories"],
            summary: "Get category by slug",
            security: [],
            parameters: [
                {
                    in: "path",
                    name: "slug",
                    required: true,
                    schema: { type: "string", minLength: 1 },
                },
            ],
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/CategoryResponse" },
                        },
                    },
                },
                400: { $ref: "#/components/responses/BadRequest" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/categories/{categoryId}/breadcrumb": {
        get: {
            tags: ["Categories"],
            summary: "Get category breadcrumb",
            security: [],
            parameters: [categoryIdParam],
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/BreadcrumbResponse" },
                        },
                    },
                },
                400: { $ref: "#/components/responses/BadRequest" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/categories/{categoryId}/ancestors": {
        get: {
            tags: ["Categories"],
            summary: "Get category ancestors",
            security: [],
            parameters: [categoryIdParam],
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/CategoriesListResponse" },
                        },
                    },
                },
                400: { $ref: "#/components/responses/BadRequest" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/categories/{categoryId}/children": {
        get: {
            tags: ["Categories"],
            summary: "Get category children",
            security: [],
            parameters: [categoryIdParam],
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/CategoriesListResponse" },
                        },
                    },
                },
                400: { $ref: "#/components/responses/BadRequest" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/categories/{categoryId}/descendants": {
        get: {
            tags: ["Categories"],
            summary: "Get category descendants",
            security: [],
            parameters: [categoryIdParam, includeInactiveQuery],
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/CategoriesListResponse" },
                        },
                    },
                },
                400: { $ref: "#/components/responses/BadRequest" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/categories": {
        post: {
            tags: ["Categories"],
            summary: "Create category",
            description: "Admin or manager only.",
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/CreateCategoryInput" },
                    },
                },
            },
            responses: {
                201: {
                    description: "Created",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/CategoryResponse" },
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

    "/categories/{categoryId}": {
        get: {
            tags: ["Categories"],
            summary: "Get category by id",
            security: [],
            parameters: [categoryIdParam],
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/CategoryResponse" },
                        },
                    },
                },
                400: { $ref: "#/components/responses/BadRequest" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
        patch: {
            tags: ["Categories"],
            summary: "Update category",
            description: "Admin or manager only.",
            security: [{ bearerAuth: [] }],
            parameters: [categoryIdParam],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/UpdateCategoryInput" },
                    },
                },
            },
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/CategoryResponse" },
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
            tags: ["Categories"],
            summary: "Soft delete category",
            description: "Admin or manager only. Descendants are also soft-deleted.",
            security: [{ bearerAuth: [] }],
            parameters: [categoryIdParam],
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/DeleteCategoryResponse" },
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

    "/categories/{categoryId}/hard": {
        delete: {
            tags: ["Categories"],
            summary: "Hard delete category",
            description: "Admin only. Descendants are also permanently deleted.",
            security: [{ bearerAuth: [] }],
            parameters: [categoryIdParam],
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/HardDeleteCategoryResponse" },
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

    "/categories/{categoryId}/restore": {
        patch: {
            tags: ["Categories"],
            summary: "Restore category",
            description: "Admin only. Descendants are also restored.",
            security: [{ bearerAuth: [] }],
            parameters: [categoryIdParam],
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/CategoryResponse" },
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
