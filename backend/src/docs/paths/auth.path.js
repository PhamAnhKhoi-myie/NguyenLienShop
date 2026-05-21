module.exports = {
    "/auth/register": {
        post: {
            tags: ["Auth"],
            summary: "Register",
            security: [],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/RegisterInput" },
                    },
                },
            },
            responses: {
                201: {
                    description: "Created",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/RegisterSuccessResponse" },
                        },
                    },
                },
                400: { $ref: "#/components/responses/BadRequest" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/auth/login": {
        post: {
            tags: ["Auth"],
            summary: "Login",
            security: [],
            description: "Returns an access token in the response body and sets the httpOnly refreshToken cookie.",
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/LoginInput" },
                    },
                },
            },
            responses: {
                200: {
                    description: "OK",
                    headers: {
                        "Set-Cookie": {
                            description: "refreshToken httpOnly cookie.",
                            schema: { type: "string" },
                        },
                    },
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/LoginSuccessResponse" },
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

    "/auth/refresh": {
        post: {
            tags: ["Auth"],
            summary: "Refresh access token",
            security: [{ refreshTokenCookie: [] }],
            description: "Reads refreshToken from cookie, rotates it, and returns a new access token.",
            responses: {
                200: {
                    description: "OK",
                    headers: {
                        "Set-Cookie": {
                            description: "Rotated refreshToken httpOnly cookie.",
                            schema: { type: "string" },
                        },
                    },
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/RefreshSuccessResponse" },
                        },
                    },
                },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                404: { $ref: "#/components/responses/NotFound" },
            },
        },
    },

    "/auth/change-password": {
        post: {
            tags: ["Auth"],
            summary: "Change password",
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/ChangePasswordInput" },
                    },
                },
            },
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/AuthMessageSuccessResponse" },
                        },
                    },
                },
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/auth/forgot-password": {
        post: {
            tags: ["Auth"],
            summary: "Request password reset OTP",
            security: [],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/ForgotPasswordInput" },
                    },
                },
            },
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/AuthMessageSuccessResponse" },
                        },
                    },
                },
                400: { $ref: "#/components/responses/BadRequest" },
                429: { $ref: "#/components/responses/TooManyRequests" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/auth/reset-password": {
        post: {
            tags: ["Auth"],
            summary: "Reset password with OTP",
            security: [],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/ResetPasswordInput" },
                    },
                },
            },
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/AuthMessageSuccessResponse" },
                        },
                    },
                },
                400: { $ref: "#/components/responses/BadRequest" },
                404: { $ref: "#/components/responses/NotFound" },
                429: { $ref: "#/components/responses/TooManyRequests" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/auth/logout": {
        post: {
            tags: ["Auth"],
            summary: "Logout",
            security: [],
            description: "The refreshToken cookie is optional. If present, the server revokes it best-effort and always clears the cookie.",
            parameters: [
                {
                    in: "cookie",
                    name: "refreshToken",
                    required: false,
                    schema: { type: "string" },
                },
            ],
            responses: {
                200: {
                    description: "OK",
                    headers: {
                        "Set-Cookie": {
                            description: "Clears refreshToken cookie.",
                            schema: { type: "string" },
                        },
                    },
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/LogoutSuccessResponse" },
                        },
                    },
                },
            },
        },
    },
};
