const objectIdPattern = "^[a-fA-F0-9]{24}$";
const slugPattern = "^[a-z0-9]+(?:-[a-z0-9]+)*$";
const statusEnum = ["ACTIVE", "INACTIVE"];

module.exports = {
    CreateCategoryInput: {
        type: "object",
        required: ["name", "slug"],
        properties: {
            name: { type: "string", minLength: 2, maxLength: 100, example: "Fruit Bags" },
            slug: {
                type: "string",
                pattern: slugPattern,
                example: "fruit-bags",
            },
            description: {
                type: "string",
                maxLength: 500,
                example: "Protective bags for fruits and agricultural products",
            },
            parent_id: {
                type: "string",
                pattern: objectIdPattern,
                nullable: true,
                example: null,
            },
            status: {
                type: "string",
                enum: statusEnum,
                default: "ACTIVE",
                example: "ACTIVE",
            },
            icon_url: {
                type: "string",
                format: "uri",
                nullable: true,
                example: "https://example.com/icon.png",
            },
            image_url: {
                type: "string",
                format: "uri",
                nullable: true,
                example: "https://example.com/category.png",
            },
            display_order: { type: "integer", minimum: 0, default: 0, example: 0 },
        },
    },

    UpdateCategoryInput: {
        type: "object",
        description: "At least one field should be provided.",
        properties: {
            name: { type: "string", minLength: 2, maxLength: 100, example: "Fruit Covers" },
            slug: {
                type: "string",
                pattern: slugPattern,
                example: "fruit-covers",
            },
            description: {
                type: "string",
                maxLength: 500,
                example: "Updated category description",
            },
            parent_id: {
                type: "string",
                pattern: objectIdPattern,
                nullable: true,
                example: null,
            },
            status: { type: "string", enum: statusEnum, example: "ACTIVE" },
            icon_url: {
                type: "string",
                format: "uri",
                nullable: true,
                example: "https://example.com/icon.png",
            },
            image_url: {
                type: "string",
                format: "uri",
                nullable: true,
                example: "https://example.com/category.png",
            },
            display_order: { type: "integer", minimum: 0, example: 1 },
        },
    },

    Category: {
        type: "object",
        required: [
            "id",
            "name",
            "slug",
            "parent_id",
            "level",
            "path",
            "status",
            "display_order",
            "is_deleted",
            "created_at",
            "updated_at",
        ],
        properties: {
            id: {
                type: "string",
                pattern: objectIdPattern,
                example: "507f1f77bcf86cd799439011",
            },
            name: { type: "string", example: "Fruit Bags" },
            slug: { type: "string", example: "fruit-bags" },
            description: {
                type: "string",
                nullable: true,
                example: "Protective bags for fruits and agricultural products",
            },
            parent_id: {
                type: "string",
                pattern: objectIdPattern,
                nullable: true,
                example: null,
            },
            level: { type: "integer", minimum: 0, example: 0 },
            path: {
                type: "array",
                items: { type: "string", pattern: objectIdPattern },
                example: [],
            },
            status: { type: "string", enum: statusEnum, example: "ACTIVE" },
            icon_url: {
                type: "string",
                format: "uri",
                nullable: true,
                example: null,
            },
            image_url: {
                type: "string",
                format: "uri",
                nullable: true,
                example: null,
            },
            display_order: { type: "integer", example: 0 },
            is_deleted: { type: "boolean", example: false },
            deleted_at: {
                type: "string",
                format: "date-time",
                nullable: true,
                example: null,
            },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
        },
    },

    CategoryTree: {
        allOf: [
            { $ref: "#/components/schemas/Category" },
            {
                type: "object",
                required: ["children"],
                properties: {
                    children: {
                        type: "array",
                        items: { $ref: "#/components/schemas/CategoryTree" },
                    },
                },
            },
        ],
    },

    CategoryDeleteResult: {
        type: "object",
        required: ["message", "categoryId"],
        properties: {
            message: {
                type: "string",
                example: "Category deleted successfully (soft delete)",
            },
            categoryId: {
                type: "string",
                pattern: objectIdPattern,
                example: "507f1f77bcf86cd799439011",
            },
        },
    },

    CategoryHardDeleteResult: {
        type: "object",
        required: ["deletedCount", "message"],
        properties: {
            deletedCount: { type: "integer", example: 3 },
            message: { type: "string", example: "Deleted 1 category and 2 descendants" },
        },
    },

    CategoryResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/Category" },
        },
    },

    CategoryTreeResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: {
                type: "array",
                items: { $ref: "#/components/schemas/CategoryTree" },
            },
        },
    },

    CategoriesListResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: {
                type: "array",
                items: { $ref: "#/components/schemas/Category" },
            },
        },
    },

    BreadcrumbResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: {
                type: "object",
                required: ["breadcrumb"],
                properties: {
                    breadcrumb: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Category" },
                    },
                },
            },
        },
    },

    DeleteCategoryResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/CategoryDeleteResult" },
        },
    },

    HardDeleteCategoryResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/CategoryHardDeleteResult" },
        },
    },
};
