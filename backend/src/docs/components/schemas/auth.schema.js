module.exports = {
    AuthUser: {
        type: "object",
        properties: {
            id: { type: "string", example: "507f1f77bcf86cd799439011" },
            email: { type: "string", format: "email", example: "user@example.com" },
            profile: {
                type: "object",
                properties: {
                    full_name: { type: "string", nullable: true, example: "Nguyen Van A" },
                    avatar_url: { type: "string", nullable: true, example: null },
                    phone_number: { type: "string", nullable: true, example: null },
                    gender: {
                        type: "string",
                        enum: ["MALE", "FEMALE", "OTHER", "UNSPECIFIED"],
                        example: "UNSPECIFIED",
                    },
                },
            },
            roles: {
                type: "array",
                items: { type: "string" },
                example: ["CUSTOMER"],
            },
            tier: { type: "string", nullable: true, example: null },
            status: { type: "string", example: "ACTIVE" },
            is_email_verified: { type: "boolean", example: false },
            email_verified_at: {
                type: "string",
                format: "date-time",
                nullable: true,
                example: null,
            },
            last_login_at: {
                type: "string",
                format: "date-time",
                nullable: true,
                example: null,
            },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
        },
    },

    RegisterInput: {
        type: "object",
        required: ["email", "password"],
        properties: {
            email: { type: "string", format: "email", example: "new.user@example.com" },
            password: {
                type: "string",
                minLength: 6,
                description: "At least 6 characters, containing a lowercase letter and a number.",
                example: "abc123",
            },
            full_name: { type: "string", minLength: 2, example: "Nguyen Van A" },
        },
    },

    LoginInput: {
        type: "object",
        required: ["email", "password"],
        properties: {
            email: { type: "string", format: "email", example: "user@example.com" },
            password: { type: "string", minLength: 1, example: "abc123" },
        },
    },

    ChangePasswordInput: {
        type: "object",
        required: ["currentPassword", "newPassword"],
        properties: {
            currentPassword: { type: "string", minLength: 1, example: "abc123" },
            newPassword: {
                type: "string",
                minLength: 6,
                description: "Must be different from currentPassword and contain a lowercase letter and a number.",
                example: "newabc123",
            },
        },
    },

    ForgotPasswordInput: {
        type: "object",
        required: ["email"],
        properties: {
            email: { type: "string", format: "email", example: "user@example.com" },
        },
    },

    ResetPasswordInput: {
        type: "object",
        required: ["email", "otp", "newPassword"],
        properties: {
            email: { type: "string", format: "email", example: "user@example.com" },
            otp: {
                type: "string",
                minLength: 6,
                maxLength: 6,
                pattern: "^\\d{6}$",
                example: "123456",
            },
            newPassword: {
                type: "string",
                minLength: 6,
                description: "At least 6 characters, containing a lowercase letter and a number.",
                example: "newabc123",
            },
        },
    },

    RegisterSuccessResponse: {
        type: "object",
        required: ["success", "message", "data"],
        properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Dang ky thanh cong" },
            data: { $ref: "#/components/schemas/AuthUser" },
        },
    },

    LoginSuccessResponse: {
        type: "object",
        required: ["success", "message", "data"],
        properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Dang nhap thanh cong" },
            data: {
                type: "object",
                required: ["accessToken", "user"],
                properties: {
                    accessToken: { type: "string", description: "JWT access token" },
                    user: { $ref: "#/components/schemas/AuthUser" },
                },
            },
        },
    },

    RefreshSuccessResponse: {
        type: "object",
        required: ["success", "message", "data"],
        properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Refresh token thanh cong" },
            data: {
                type: "object",
                required: ["accessToken"],
                properties: {
                    accessToken: { type: "string", description: "New JWT access token" },
                },
            },
        },
    },

    AuthMessageSuccessResponse: {
        type: "object",
        required: ["success", "message"],
        properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Thao tac thanh cong" },
        },
    },

    LogoutSuccessResponse: {
        type: "object",
        required: ["success", "message", "data"],
        properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Dang xuat thanh cong" },
            data: { type: "object", nullable: true, example: null },
        },
    },
};
