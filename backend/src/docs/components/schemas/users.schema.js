const roleEnum = ["CUSTOMER", "VIP", "MANAGER", "ADMIN"];
const statusEnum = ["ACTIVE", "INACTIVE", "SUSPENDED"];
const genderEnum = ["MALE", "FEMALE", "OTHER", "UNSPECIFIED"];

module.exports = {
    UserPublic: {
        type: "object",
        description: "User DTO returned by UserMapper.toResponseDTO.",
        properties: {
            id: {
                type: "string",
                pattern: "^[a-fA-F0-9]{24}$",
                example: "507f1f77bcf86cd799439011",
            },
            email: {
                type: "string",
                format: "email",
                nullable: true,
                example: "user@example.com",
            },
            profile: {
                type: "object",
                properties: {
                    full_name: { type: "string", nullable: true, example: "Nguyen Van A" },
                    avatar_url: {
                        type: "string",
                        nullable: true,
                        example: "https://example.com/avatar.png",
                    },
                    phone_number: { type: "string", example: "0912345678" },
                    gender: {
                        type: "string",
                        enum: genderEnum,
                        example: "UNSPECIFIED",
                    },
                },
            },
            roles: {
                type: "array",
                items: { type: "string", enum: roleEnum },
                example: ["CUSTOMER"],
            },
            tier: {
                type: "string",
                enum: ["bronze", "silver", "gold", "platinum"],
                nullable: true,
                example: "bronze",
            },
            status: { type: "string", enum: statusEnum, example: "ACTIVE" },
            is_email_verified: { type: "boolean", example: false },
            email_verified_at: {
                type: "string",
                format: "date-time",
                nullable: true,
                example: null,
            },
            is_phone_verified: { type: "boolean", example: true },
            phone_verified_at: {
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

    UserListItem: {
        $ref: "#/components/schemas/UserPublic",
    },

    UserProfileInput: {
        type: "object",
        description: "At least one field should be provided.",
        properties: {
            name: { type: "string", minLength: 2, example: "Nguyen Van B" },
            avatar: {
                type: "string",
                format: "uri",
                example: "https://example.com/avatar.png",
            },
            email: { type: "string", format: "email", example: "new@example.com" },
            gender: {
                type: "string",
                enum: genderEnum,
                example: "MALE",
            },
        },
    },

    UpdateUserRolesInput: {
        type: "object",
        required: ["roles"],
        properties: {
            roles: {
                type: "array",
                minItems: 1,
                items: { type: "string", enum: roleEnum },
                example: ["MANAGER"],
            },
        },
    },

    UpdateUserStatusInput: {
        type: "object",
        required: ["status"],
        properties: {
            status: { type: "string", enum: statusEnum, example: "SUSPENDED" },
        },
    },

    UserProfileResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/UserPublic" },
        },
    },

    UsersListResponse: {
        type: "object",
        required: ["success", "data", "pagination"],
        properties: {
            success: { type: "boolean", example: true },
            data: {
                type: "array",
                items: { $ref: "#/components/schemas/UserPublic" },
            },
            pagination: {
                type: "object",
                required: ["current_page", "total_pages", "total_items", "per_page"],
                properties: {
                    current_page: { type: "integer", example: 1 },
                    total_pages: { type: "integer", example: 5 },
                    total_items: { type: "integer", example: 92 },
                    per_page: { type: "integer", example: 20 },
                },
            },
        },
    },

    UpdateUserResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/UserPublic" },
        },
    },

    DeleteUserResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/UserPublic" },
        },
    },

    UpdateRolesResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/UserPublic" },
        },
    },

    UpdateUserStatusResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/UserPublic" },
        },
    },
};
