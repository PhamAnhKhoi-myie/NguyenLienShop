const addressIdParam = {
    in: "path",
    name: "addressId",
    required: true,
    schema: {
        type: "string",
        pattern: "^[a-fA-F0-9]{24}$",
    },
};

const userIdParam = {
    in: "path",
    name: "userId",
    required: true,
    schema: {
        type: "string",
        pattern: "^[a-fA-F0-9]{24}$",
    },
};

module.exports = {
    "/user-addresses": {
        post: {
            tags: ["User Addresses"],
            summary: "Create a user address",
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/CreateUserAddressInput" },
                    },
                },
            },
            responses: {
                201: {
                    description: "Created",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/CreateUserAddressResponse" },
                        },
                    },
                },
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                409: { $ref: "#/components/responses/Conflict" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
        get: {
            tags: ["User Addresses"],
            summary: "Get current user's addresses",
            security: [{ bearerAuth: [] }],
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/UserAddressListResponse" },
                        },
                    },
                },
                401: { $ref: "#/components/responses/Unauthorized" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/user-addresses/user/{userId}": {
        get: {
            tags: ["User Addresses"],
            summary: "Get addresses by user id",
            description: "Admin only.",
            security: [{ bearerAuth: [] }],
            parameters: [userIdParam],
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/UserAddressListResponse" },
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

    "/user-addresses/{addressId}/set-default": {
        patch: {
            tags: ["User Addresses"],
            summary: "Set address as default",
            security: [{ bearerAuth: [] }],
            parameters: [addressIdParam],
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/UpdateUserAddressResponse" },
                        },
                    },
                },
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                404: { $ref: "#/components/responses/NotFound" },
                409: { $ref: "#/components/responses/Conflict" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/user-addresses/{addressId}": {
        patch: {
            tags: ["User Addresses"],
            summary: "Update an address",
            security: [{ bearerAuth: [] }],
            parameters: [addressIdParam],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/UpdateUserAddressInput" },
                    },
                },
            },
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/UpdateUserAddressResponse" },
                        },
                    },
                },
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                404: { $ref: "#/components/responses/NotFound" },
                409: { $ref: "#/components/responses/Conflict" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
        delete: {
            tags: ["User Addresses"],
            summary: "Delete an address",
            security: [{ bearerAuth: [] }],
            parameters: [addressIdParam],
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/DeleteUserAddressResponse" },
                        },
                    },
                },
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                404: { $ref: "#/components/responses/NotFound" },
                409: { $ref: "#/components/responses/Conflict" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },
};
