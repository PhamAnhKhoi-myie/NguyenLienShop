const uploadAssetTypeEnum = ["product", "banner", "announcement", "shop_info", "avatar", "blog", "misc"];

module.exports = {
    CloudinarySignatureInput: {
        type: "object",
        additionalProperties: false,
        properties: {
            asset_type: {
                type: "string",
                enum: uploadAssetTypeEnum,
                default: "misc",
                example: "product",
            },
            folder: {
                type: "string",
                minLength: 1,
                maxLength: 120,
                pattern: "^(?!.*\\.\\.)(?!/)[a-zA-Z0-9/_-]+$",
                description: "Optional child folder. The server prefixes it with CLOUDINARY_UPLOAD_FOLDER when needed.",
                example: "products",
            },
            public_id: {
                type: "string",
                minLength: 1,
                maxLength: 160,
                pattern: "^(?!.*\\.\\.)(?!/)[a-zA-Z0-9/_-]+$",
                example: "products/bag-001-main",
            },
            tags: {
                type: "array",
                maxItems: 10,
                items: {
                    type: "string",
                    minLength: 1,
                    maxLength: 40,
                    pattern: "^[a-zA-Z0-9_-]+$",
                },
                default: [],
                example: ["product", "catalog"],
            },
            overwrite: {
                type: "boolean",
                default: false,
                example: false,
            },
            invalidate: {
                type: "boolean",
                default: true,
                example: true,
            },
        },
    },

    CloudinaryAvatarSignatureInput: {
        type: "object",
        additionalProperties: false,
        properties: {
            asset_type: {
                type: "string",
                enum: ["avatar"],
                default: "avatar",
                example: "avatar",
            },
            folder: {
                type: "string",
                enum: ["avatars"],
                default: "avatars",
                example: "avatars",
            },
            tags: {
                type: "array",
                maxItems: 10,
                items: {
                    type: "string",
                    minLength: 1,
                    maxLength: 40,
                    pattern: "^[a-zA-Z0-9_-]+$",
                },
                default: ["avatar", "user"],
                example: ["avatar", "user"],
            },
            overwrite: {
                type: "boolean",
                default: true,
                example: true,
            },
            invalidate: {
                type: "boolean",
                default: true,
                example: true,
            },
        },
    },

    CloudinarySignature: {
        type: "object",
        required: [
            "cloud_name",
            "api_key",
            "upload_url",
            "signature",
            "timestamp",
            "folder",
            "overwrite",
            "invalidate",
            "params",
        ],
        properties: {
            cloud_name: {
                type: "string",
                example: "demo-cloud",
            },
            api_key: {
                type: "string",
                example: "123456789012345",
            },
            upload_url: {
                type: "string",
                format: "uri",
                example: "https://api.cloudinary.com/v1_1/demo-cloud/image/upload",
            },
            signature: {
                type: "string",
                description: "SHA-1 signature for the returned Cloudinary parameters.",
                example: "8f5f9c4d1b6d8c3f0b7e2a1c9d5e6f7a8b9c0d1e",
            },
            timestamp: {
                type: "integer",
                example: 1780246800,
            },
            folder: {
                type: "string",
                example: "nguyen-lien-shop/products",
            },
            public_id: {
                type: "string",
                nullable: true,
                example: "products/bag-001-main",
            },
            tags: {
                type: "string",
                nullable: true,
                description: "Comma-separated tags when tags were provided.",
                example: "product,catalog",
            },
            overwrite: {
                type: "boolean",
                example: false,
            },
            invalidate: {
                type: "boolean",
                example: true,
            },
            params: {
                type: "object",
                required: ["timestamp", "folder", "overwrite", "invalidate", "signature"],
                additionalProperties: true,
                properties: {
                    timestamp: { type: "integer", example: 1780246800 },
                    folder: { type: "string", example: "nguyen-lien-shop/products" },
                    public_id: {
                        type: "string",
                        nullable: true,
                        example: "products/bag-001-main",
                    },
                    tags: {
                        type: "string",
                        nullable: true,
                        example: "product,catalog",
                    },
                    overwrite: { type: "boolean", example: false },
                    invalidate: { type: "boolean", example: true },
                    signature: {
                        type: "string",
                        example: "8f5f9c4d1b6d8c3f0b7e2a1c9d5e6f7a8b9c0d1e",
                    },
                },
            },
        },
    },

    CloudinarySignatureResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/CloudinarySignature" },
        },
    },
};
