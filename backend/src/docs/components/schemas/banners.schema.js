const objectIdPattern = "^[a-fA-F0-9]{24}$";
const bannerLocationEnum = ["homepage_top", "homepage_middle", "homepage_bottom", "category_page"];

module.exports = {
    BannerImageInput: {
        type: "object",
        required: ["url"],
        additionalProperties: false,
        properties: {
            url: {
                type: "string",
                format: "uri",
                description: "HTTP(S) image URL.",
                example: "https://example.com/banners/home-top.jpg",
            },
            alt_text: {
                type: "string",
                maxLength: 200,
                example: "Summer sale banner",
            },
            public_id: {
                type: "string",
                example: "banners/home-top",
            },
        },
    },

    BannerImage: {
        type: "object",
        required: ["url", "alt_text"],
        properties: {
            url: {
                type: "string",
                format: "uri",
                example: "https://example.com/banners/home-top.jpg",
            },
            alt_text: {
                type: "string",
                example: "Summer sale banner",
            },
        },
    },

    CreateBannerInput: {
        type: "object",
        required: ["image", "link", "location", "sort_order", "start_at", "end_at"],
        additionalProperties: false,
        properties: {
            image: { $ref: "#/components/schemas/BannerImageInput" },
            link: {
                type: "string",
                minLength: 1,
                description: "Safe destination: https:// URL, internal route such as /products, or an ID.",
                example: "/products",
            },
            location: { type: "string", enum: bannerLocationEnum, example: "homepage_top" },
            sort_order: { type: "integer", minimum: 0, maximum: 999, example: 1 },
            start_at: { type: "string", format: "date-time", example: "2026-06-01T00:00:00Z" },
            end_at: { type: "string", format: "date-time", example: "2026-06-30T23:59:59Z" },
        },
    },

    UpdateBannerInput: {
        type: "object",
        additionalProperties: false,
        properties: {
            image: { $ref: "#/components/schemas/BannerImageInput" },
            link: { type: "string", minLength: 1, example: "/products" },
            location: { type: "string", enum: bannerLocationEnum },
            sort_order: { type: "integer", minimum: 0, maximum: 999 },
            start_at: { type: "string", format: "date-time" },
            end_at: { type: "string", format: "date-time" },
        },
    },

    Banner: {
        type: "object",
        required: [
            "id",
            "image",
            "link",
            "location",
            "sort_order",
            "start_at",
            "end_at",
            "is_active",
            "created_at",
            "updated_at",
            "created_by",
        ],
        properties: {
            id: {
                type: "string",
                pattern: objectIdPattern,
                example: "507f1f77bcf86cd799439011",
            },
            image: { $ref: "#/components/schemas/BannerImage" },
            link: { type: "string", example: "/products" },
            location: { type: "string", enum: bannerLocationEnum, example: "homepage_top" },
            sort_order: { type: "integer", minimum: 0, maximum: 999, example: 1 },
            start_at: { type: "string", format: "date-time" },
            end_at: { type: "string", format: "date-time" },
            is_active: { type: "boolean", example: true },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
            created_by: {
                type: "string",
                pattern: objectIdPattern,
                nullable: true,
                example: "507f1f77bcf86cd799439012",
            },
        },
    },

    BannerListItem: {
        allOf: [{ $ref: "#/components/schemas/Banner" }],
    },

    BannerResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Banner restored successfully" },
            data: { $ref: "#/components/schemas/Banner" },
        },
    },

    BannersListResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: {
                type: "array",
                items: { $ref: "#/components/schemas/BannerListItem" },
            },
        },
    },

    BannerMessageResponse: {
        type: "object",
        required: ["success", "message"],
        properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Banner deleted successfully" },
        },
    },
};
