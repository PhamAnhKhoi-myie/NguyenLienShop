const objectIdPattern = "^[a-fA-F0-9]{24}$";
const timePattern = "^([01]\\d|2[0-3]):[0-5]\\d$";
const dayEnum = ["mon", "tue", "wed", "thu", "fri", "sat", "sun", "holiday"];

const workingHour = {
    type: "object",
    required: ["day", "open", "close"],
    additionalProperties: false,
    properties: {
        day: { type: "string", enum: dayEnum, example: "mon" },
        open: { type: "string", pattern: timePattern, example: "08:00" },
        close: {
            type: "string",
            pattern: timePattern,
            description: "Must be later than open.",
            example: "18:00",
        },
    },
};

const socialLinks = {
    type: "object",
    additionalProperties: false,
    properties: {
        facebook: {
            type: "string",
            nullable: true,
            description: "HTTP(S) URL.",
            example: "https://facebook.com/nguyen-lien",
        },
        zalo: {
            type: "string",
            nullable: true,
            description: "HTTP(S) URL, phone number, or safe Zalo ID.",
            example: "0912345678",
        },
        instagram: {
            type: "string",
            nullable: true,
            description: "HTTP(S) URL.",
            example: "https://instagram.com/nguyen-lien",
        },
        shoppe: {
            type: "string",
            nullable: true,
            description: "HTTP(S) URL.",
            example: "https://shopee.vn/nguyen-lien",
        },
        tiktok: {
            type: "string",
            nullable: true,
            description: "HTTP(S) URL.",
            example: "https://www.tiktok.com/@nguyen-lien",
        },
    },
};

const certificationLinks = {
    type: "object",
    additionalProperties: false,
    properties: {
        ministry_notified: {
            type: "string",
            nullable: true,
            description: "HTTP(S) URL for the notified Ministry of Industry and Trade logo.",
            example: "https://online.gov.vn/Home/WebDetails/12345",
        },
        ministry_registered: {
            type: "string",
            nullable: true,
            description: "HTTP(S) URL for the registered Ministry of Industry and Trade logo.",
            example: "https://online.gov.vn/Home/WebDetails/67890",
        },
        extra: {
            type: "string",
            nullable: true,
            description: "Reserved HTTP(S) certification or trust link.",
            example: "https://nguyenlien.shop/chung-nhan",
        },
    },
};

module.exports = {
    ShopInfoWorkingHour: workingHour,

    ShopInfoSocialLinks: socialLinks,

    ShopInfoCertificationLinks: certificationLinks,

    ShopInfo: {
        type: "object",
        required: [
            "id",
            "shop_name",
            "email",
            "phone",
            "address",
            "shipping_partner",
            "working_hours",
            "social_links",
            "certification_links",
            "map_embed_url",
            "is_active",
            "created_at",
            "updated_at",
        ],
        properties: {
            id: {
                type: "string",
                pattern: objectIdPattern,
                example: "507f1f77bcf86cd799439011",
            },
            shop_name: {
                type: "string",
                nullable: true,
                minLength: 1,
                maxLength: 200,
                example: "Nguyen Lien Shop",
            },
            email: {
                type: "string",
                nullable: true,
                format: "email",
                example: "contact@nguyen-lien.com",
            },
            phone: {
                type: "string",
                nullable: true,
                minLength: 10,
                maxLength: 20,
                example: "0912345678",
            },
            address: {
                type: "string",
                nullable: true,
                minLength: 5,
                maxLength: 500,
                example: "123 Le Loi, District 1, Ho Chi Minh City",
            },
            shipping_partner: {
                type: "string",
                nullable: true,
                maxLength: 200,
                example: "Viettel Post",
            },
            working_hours: {
                type: "array",
                items: { $ref: "#/components/schemas/ShopInfoWorkingHour" },
            },
            social_links: { $ref: "#/components/schemas/ShopInfoSocialLinks" },
            certification_links: { $ref: "#/components/schemas/ShopInfoCertificationLinks" },
            map_embed_url: {
                type: "string",
                format: "uri",
                nullable: true,
                example: "https://www.google.com/maps/embed?pb=...",
            },
            is_active: { type: "boolean", example: true },
            created_at: {
                type: "string",
                format: "date-time",
                nullable: true,
            },
            updated_at: {
                type: "string",
                format: "date-time",
                nullable: true,
            },
        },
    },

    ShopContactInfo: {
        type: "object",
        required: ["id", "shop_name", "email", "phone", "address", "shipping_partner", "is_active"],
        properties: {
            id: {
                type: "string",
                pattern: objectIdPattern,
                example: "507f1f77bcf86cd799439011",
            },
            shop_name: { type: "string", nullable: true, example: "Nguyen Lien Shop" },
            email: {
                type: "string",
                nullable: true,
                format: "email",
                example: "contact@nguyen-lien.com",
            },
            phone: { type: "string", nullable: true, example: "0912345678" },
            address: {
                type: "string",
                nullable: true,
                example: "123 Le Loi, District 1, Ho Chi Minh City",
            },
            shipping_partner: {
                type: "string",
                nullable: true,
                example: "Viettel Post",
            },
            is_active: { type: "boolean", example: true },
        },
    },

    ShopWorkingHours: {
        type: "object",
        required: ["id", "shop_name", "working_hours", "is_active"],
        properties: {
            id: {
                type: "string",
                pattern: objectIdPattern,
                example: "507f1f77bcf86cd799439011",
            },
            shop_name: { type: "string", nullable: true, example: "Nguyen Lien Shop" },
            working_hours: {
                type: "array",
                items: { $ref: "#/components/schemas/ShopInfoWorkingHour" },
            },
            is_active: { type: "boolean", example: true },
        },
    },

    ShopSocialLinks: {
        type: "object",
        required: ["id", "shop_name", "social_links", "is_active"],
        properties: {
            id: {
                type: "string",
                pattern: objectIdPattern,
                example: "507f1f77bcf86cd799439011",
            },
            shop_name: { type: "string", nullable: true, example: "Nguyen Lien Shop" },
            social_links: { $ref: "#/components/schemas/ShopInfoSocialLinks" },
            is_active: { type: "boolean", example: true },
        },
    },

    ShopIsOpen: {
        type: "object",
        required: ["is_open"],
        properties: {
            is_open: { type: "boolean", example: true },
        },
    },

    ShopNextOpening: {
        type: "object",
        required: ["date", "time", "day"],
        properties: {
            date: { type: "string", format: "date", example: "2026-06-01" },
            time: { type: "string", pattern: timePattern, example: "08:00" },
            day: { type: "string", enum: dayEnum, example: "mon" },
        },
    },

    CreateShopInfoInput: {
        type: "object",
        required: ["shop_name", "email", "phone", "address", "working_hours"],
        additionalProperties: false,
        properties: {
            shop_name: {
                type: "string",
                minLength: 1,
                maxLength: 200,
                example: "Nguyen Lien Shop",
            },
            email: {
                type: "string",
                format: "email",
                example: "contact@nguyen-lien.com",
            },
            phone: {
                type: "string",
                minLength: 10,
                maxLength: 20,
                pattern: "^\\+?[\\d\\s\\-\\(\\)]+$",
                example: "0912345678",
            },
            address: {
                type: "string",
                minLength: 5,
                maxLength: 500,
                example: "123 Le Loi, District 1, Ho Chi Minh City",
            },
            shipping_partner: {
                type: "string",
                nullable: true,
                maxLength: 200,
                example: "Viettel Post",
            },
            working_hours: {
                type: "array",
                minItems: 1,
                maxItems: 8,
                items: { $ref: "#/components/schemas/ShopInfoWorkingHour" },
            },
            social_links: { $ref: "#/components/schemas/ShopInfoSocialLinks" },
            certification_links: { $ref: "#/components/schemas/ShopInfoCertificationLinks" },
            map_embed_url: {
                type: "string",
                format: "uri",
                nullable: true,
                example: "https://www.google.com/maps/embed?pb=...",
            },
            is_active: { type: "boolean", default: true, example: true },
        },
    },

    UpdateShopInfoInput: {
        type: "object",
        additionalProperties: false,
        properties: {
            shop_name: { type: "string", minLength: 1, maxLength: 200 },
            email: { type: "string", format: "email" },
            phone: {
                type: "string",
                minLength: 10,
                maxLength: 20,
                pattern: "^\\+?[\\d\\s\\-\\(\\)]+$",
            },
            address: { type: "string", minLength: 5, maxLength: 500 },
            shipping_partner: {
                type: "string",
                nullable: true,
                maxLength: 200,
            },
            working_hours: {
                type: "array",
                minItems: 1,
                maxItems: 8,
                items: { $ref: "#/components/schemas/ShopInfoWorkingHour" },
            },
            social_links: { $ref: "#/components/schemas/ShopInfoSocialLinks" },
            certification_links: { $ref: "#/components/schemas/ShopInfoCertificationLinks" },
            map_embed_url: { type: "string", format: "uri", nullable: true },
            is_active: { type: "boolean" },
        },
    },

    ToggleShopStatusInput: {
        type: "object",
        required: ["is_active"],
        additionalProperties: false,
        properties: {
            is_active: { type: "boolean", example: false },
        },
    },

    ShopInfoResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/ShopInfo" },
        },
    },

    ShopContactInfoResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/ShopContactInfo" },
        },
    },

    ShopWorkingHoursResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/ShopWorkingHours" },
        },
    },

    ShopSocialLinksResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/ShopSocialLinks" },
        },
    },

    ShopIsOpenResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/ShopIsOpen" },
        },
    },

    ShopNextOpeningResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: {
                oneOf: [
                    { $ref: "#/components/schemas/ShopNextOpening" },
                    { type: "null" },
                ],
            },
        },
    },
};
