const objectIdPattern = "^[a-fA-F0-9]{24}$";
const vietnamPhonePattern = "^(0|\\+84)[0-9]{9}$";

module.exports = {
    CreateUserAddressInput: {
        type: "object",
        required: [
            "receiver_name",
            "phone",
            "address_line_1",
            "city",
            "district",
            "ward",
        ],
        properties: {
            receiver_name: { type: "string", minLength: 1, example: "Nguyen Van A" },
            phone: {
                type: "string",
                pattern: vietnamPhonePattern,
                example: "0912345678",
            },
            address_line_1: {
                type: "string",
                minLength: 1,
                example: "123 Le Loi",
            },
            address_line_2: {
                type: "string",
                example: "Apartment 101",
            },
            city: { type: "string", minLength: 1, example: "Ho Chi Minh" },
            district: { type: "string", minLength: 1, example: "District 1" },
            ward: { type: "string", minLength: 1, example: "Ben Nghe" },
            is_default: { type: "boolean", default: false, example: false },
        },
    },

    UpdateUserAddressInput: {
        type: "object",
        description: "At least one field should be provided.",
        properties: {
            receiver_name: { type: "string", minLength: 1, example: "Nguyen Van B" },
            phone: {
                type: "string",
                pattern: vietnamPhonePattern,
                example: "0987654321",
            },
            address_line_1: {
                type: "string",
                minLength: 1,
                example: "456 Nguyen Hue",
            },
            address_line_2: {
                type: "string",
                example: "Floor 2",
            },
            city: { type: "string", minLength: 1, example: "Ho Chi Minh" },
            district: { type: "string", minLength: 1, example: "District 3" },
            ward: { type: "string", minLength: 1, example: "Ward 6" },
            is_default: { type: "boolean", example: true },
        },
    },

    UserAddress: {
        type: "object",
        required: [
            "id",
            "user_id",
            "receiver_name",
            "phone",
            "address_line_1",
            "city",
            "district",
            "ward",
            "is_default",
            "created_at",
            "updated_at",
        ],
        properties: {
            id: {
                type: "string",
                pattern: objectIdPattern,
                example: "507f1f77bcf86cd799439011",
            },
            user_id: {
                type: "string",
                pattern: objectIdPattern,
                example: "507f1f77bcf86cd799439012",
            },
            receiver_name: { type: "string", example: "Nguyen Van A" },
            phone: { type: "string", example: "0912345678" },
            address_line_1: { type: "string", example: "123 Le Loi" },
            address_line_2: {
                type: "string",
                nullable: true,
                example: "Apartment 101",
            },
            city: { type: "string", example: "Ho Chi Minh" },
            district: { type: "string", example: "District 1" },
            ward: { type: "string", example: "Ben Nghe" },
            is_default: { type: "boolean", example: false },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
        },
    },

    UserAddressListResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: {
                type: "array",
                items: { $ref: "#/components/schemas/UserAddress" },
            },
        },
    },

    CreateUserAddressResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/UserAddress" },
        },
    },

    UpdateUserAddressResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/UserAddress" },
        },
    },

    DeleteUserAddressResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/UserAddress" },
        },
    },
};
