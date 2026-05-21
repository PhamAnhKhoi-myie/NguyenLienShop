const userIdParam = {
    in: "path",
    name: "id",
    required: true,
    schema: {
        type: "string",
        pattern: "^[a-fA-F0-9]{24}$",
    },
};

module.exports = {
    "/users/me": {
        get: {
            tags: ["Users"],
            summary: "Get current authenticated user",
            security: [{ bearerAuth: [] }],
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/UserProfileResponse" },
                        },
                    },
                },
                401: { $ref: "#/components/responses/Unauthorized" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/users": {
        get: {
            tags: ["Users"],
            summary: "Get all users",
            description: "Admin only.",
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
                    name: "search",
                    schema: { type: "string" },
                },
                {
                    in: "query",
                    name: "status",
                    schema: {
                        type: "string",
                        enum: ["ACTIVE", "INACTIVE", "SUSPENDED"],
                    },
                },
            ],
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/UsersListResponse" },
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

    "/users/{id}": {
        patch: {
            tags: ["Users"],
            summary: "Update user profile",
            description: "Owner or admin only.",
            security: [{ bearerAuth: [] }],
            parameters: [userIdParam],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/UserProfileInput" },
                    },
                },
            },
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/UpdateUserResponse" },
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
        delete: {
            tags: ["Users"],
            summary: "Delete user",
            description: "Soft delete. Owner or admin only.",
            security: [{ bearerAuth: [] }],
            parameters: [userIdParam],
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/DeleteUserResponse" },
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

    "/users/{id}/roles": {
        patch: {
            tags: ["Users"],
            summary: "Update user roles",
            description: "Admin only.",
            security: [{ bearerAuth: [] }],
            parameters: [userIdParam],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/UpdateUserRolesInput" },
                    },
                },
            },
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/UpdateRolesResponse" },
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

    "/users/{id}/status": {
        patch: {
            tags: ["Users"],
            summary: "Update user status",
            description: "Admin only.",
            security: [{ bearerAuth: [] }],
            parameters: [userIdParam],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/UpdateUserStatusInput" },
                    },
                },
            },
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/UpdateUserStatusResponse" },
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
