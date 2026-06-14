const objectIdPattern = "^[a-fA-F0-9]{24}$";
const slugPattern = "^[a-z0-9]+(?:-[a-z0-9]+)*$";
const statusEnum = ["ACTIVE", "INACTIVE"];
const unitTypeEnum = ["UNIT", "PACK", "BOX", "CARTON"];
const currencyEnum = ["VND", "USD", "EUR"];

const promotion = {
    type: "object",
    properties: {
        enabled: { type: "boolean", default: false },
        type: { type: "string", enum: ["FIXED", "PERCENT"], default: "FIXED" },
        value: { type: "integer", minimum: 0, example: 5000 },
        starts_at: { type: "string", format: "date-time", nullable: true },
        ends_at: { type: "string", format: "date-time", nullable: true },
        allow_voucher: { type: "boolean", default: true },
        is_active: { type: "boolean", readOnly: true },
    },
};

const productImage = {
    type: "object",
    required: ["url"],
    properties: {
        url: { type: "string", format: "uri", example: "https://example.com/product.jpg" },
        alt: { type: "string", maxLength: 200, example: "Product image" },
        is_primary: { type: "boolean", default: false, example: true },
        sort_order: { type: "integer", minimum: 0, default: 0, example: 0 },
    },
};

const stock = {
    type: "object",
    properties: {
        available: { type: "integer", minimum: 0, example: 1000 },
        reserved: { type: "integer", minimum: 0, example: 50 },
        sold: { type: "integer", minimum: 0, example: 200 },
    },
};

const priceTierInput = {
    type: "object",
    required: ["min_qty", "unit_price"],
    properties: {
        min_qty: { type: "integer", minimum: 1, example: 1 },
        max_qty: { type: "integer", minimum: 1, nullable: true, example: null },
        unit_price: { type: "number", minimum: 0, exclusiveMinimum: true, example: 180000 },
    },
};

const priceTier = {
    type: "object",
    properties: {
        tier_number: { type: "integer", example: 1 },
        min_qty: { type: "integer", example: 1 },
        max_qty: { type: "integer", nullable: true, example: null },
        unit_price: { type: "number", example: 180000 },
        original_unit_price: { type: "number", example: 200000 },
        promotion_discount_amount: { type: "number", example: 20000 },
        promotion_discount_percent: { type: "integer", example: 10 },
        is_on_sale: { type: "boolean", example: true },
        price: { type: "number", example: 180000 },
        price_per_unit: { type: "number", example: 1800 },
        qty_range: { type: "string", example: "1+" },
        currency: { type: "string", enum: currencyEnum, example: "VND" },
    },
};

const pagination = {
    type: "object",
    required: ["current_page", "total_pages", "total_items", "per_page"],
    properties: {
        current_page: { type: "integer", example: 1 },
        total_pages: { type: "integer", example: 5 },
        total_items: { type: "integer", example: 100 },
        per_page: { type: "integer", example: 20 },
    },
};

module.exports = {
    CreateProductInput: {
        type: "object",
        required: ["name", "category_id"],
        properties: {
            name: { type: "string", minLength: 2, maxLength: 200, example: "Fruit protection bag" },
            slug: { type: "string", pattern: slugPattern, example: "fruit-protection-bag" },
            category_id: {
                type: "string",
                pattern: objectIdPattern,
                example: "507f1f77bcf86cd799439011",
            },
            brand: { type: "string", maxLength: 100, example: "Nguyen Lien" },
            short_description: { type: "string", maxLength: 500, example: "Durable agricultural fruit bag" },
            description: { type: "string", maxLength: 2000, example: "Used to protect fruit during growth." },
            images: { type: "array", items: productImage, default: [] },
            search_keywords: {
                type: "array",
                maxItems: 10,
                items: { type: "string" },
                default: [],
                example: ["fruit bag", "agriculture"],
            },
            is_best_seller: { type: "boolean", default: false },
            new_until: { type: "string", format: "date-time", nullable: true },
            status: { type: "string", enum: statusEnum, default: "ACTIVE", example: "ACTIVE" },
        },
    },

    UpdateProductInput: {
        type: "object",
        description: "At least one field should be provided.",
        properties: {
            name: { type: "string", minLength: 2, maxLength: 200, example: "Updated product name" },
            slug: { type: "string", pattern: slugPattern, example: "updated-product-name" },
            category_id: {
                type: "string",
                pattern: objectIdPattern,
                nullable: true,
                example: "507f1f77bcf86cd799439011",
            },
            brand: { type: "string", maxLength: 100, example: "Nguyen Lien" },
            short_description: { type: "string", maxLength: 500, example: "Updated short description" },
            description: { type: "string", maxLength: 2000, example: "Updated product description" },
            images: { type: "array", items: productImage },
            search_keywords: {
                type: "array",
                maxItems: 10,
                items: { type: "string" },
            },
            is_best_seller: { type: "boolean" },
            new_until: { type: "string", format: "date-time", nullable: true },
            status: { type: "string", enum: statusEnum, example: "ACTIVE" },
        },
    },

    ProductImage: productImage,

    Product: {
        type: "object",
        required: ["id", "name", "slug", "category_id", "status", "created_at", "updated_at"],
        properties: {
            id: { type: "string", pattern: objectIdPattern, example: "507f1f77bcf86cd799439011" },
            name: { type: "string", example: "Fruit protection bag" },
            slug: { type: "string", example: "fruit-protection-bag" },
            category_id: { type: "string", pattern: objectIdPattern, example: "507f1f77bcf86cd799439012" },
            brand: { type: "string", nullable: true, example: "Nguyen Lien" },
            min_price: { type: "number", example: 150000 },
            max_price: { type: "number", example: 200000 },
            min_price_per_unit: { type: "number", example: 1500 },
            max_price_per_unit: { type: "number", example: 2000 },
            description: { type: "string", nullable: true, example: "Used to protect fruit during growth." },
            short_description: { type: "string", nullable: true, example: "Durable agricultural fruit bag" },
            images: { type: "array", items: productImage },
            search_keywords: { type: "array", items: { type: "string" } },
            rating_avg: { type: "number", example: 4.5 },
            rating_count: { type: "integer", example: 100 },
            sold_count: { type: "integer", example: 500 },
            is_best_seller: { type: "boolean", example: true },
            new_until: { type: "string", format: "date-time", nullable: true },
            is_new: { type: "boolean", example: true },
            in_stock: { type: "boolean", example: true },
            is_on_sale: { type: "boolean", example: true },
            original_min_price: { type: "number", example: 160000 },
            original_max_price: { type: "number", example: 210000 },
            max_discount_percent: { type: "integer", example: 10 },
            status: { type: "string", enum: statusEnum, example: "ACTIVE" },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
        },
    },

    ProductListItem: {
        type: "object",
        required: ["id", "name", "slug", "category_id", "status", "created_at"],
        properties: {
            id: { type: "string", pattern: objectIdPattern, example: "507f1f77bcf86cd799439011" },
            name: { type: "string", example: "Fruit protection bag" },
            slug: { type: "string", example: "fruit-protection-bag" },
            category_id: { type: "string", pattern: objectIdPattern, example: "507f1f77bcf86cd799439012" },
            brand: { type: "string", nullable: true, example: "Nguyen Lien" },
            min_price: { type: "number", example: 150000 },
            max_price: { type: "number", example: 200000 },
            image: { ...productImage, nullable: true },
            rating_avg: { type: "number", example: 4.5 },
            rating_count: { type: "integer", example: 100 },
            sold_count: { type: "integer", example: 500 },
            is_best_seller: { type: "boolean", example: true },
            new_until: { type: "string", format: "date-time", nullable: true },
            is_new: { type: "boolean", example: true },
            in_stock: { type: "boolean", example: true },
            is_on_sale: { type: "boolean", example: true },
            original_min_price: { type: "number", example: 160000 },
            original_max_price: { type: "number", example: 210000 },
            max_discount_percent: { type: "integer", example: 10 },
            status: { type: "string", enum: statusEnum, example: "ACTIVE" },
            created_at: { type: "string", format: "date-time" },
        },
    },

    ProductDetail: {
        allOf: [
            { $ref: "#/components/schemas/Product" },
            {
                type: "object",
                required: ["variants"],
                properties: {
                    variants: {
                        type: "array",
                        items: { $ref: "#/components/schemas/VariantDetail" },
                    },
                },
            },
        ],
    },

    ProductDeleteResult: {
        type: "object",
        required: ["message", "productId"],
        properties: {
            message: { type: "string", example: "Product deleted successfully (soft delete)" },
            productId: { type: "string", pattern: objectIdPattern, example: "507f1f77bcf86cd799439011" },
        },
    },

    CreateVariantInput: {
        type: "object",
        required: ["size", "fabric_type"],
        properties: {
            size: { type: "string", minLength: 1, maxLength: 50, example: "20x25" },
            fabric_type: { type: "string", minLength: 1, maxLength: 100, example: "Non-woven" },
            stock: { $ref: "#/components/schemas/VariantStock" },
            status: { type: "string", enum: statusEnum, default: "ACTIVE", example: "ACTIVE" },
        },
    },

    UpdateVariantInput: {
        type: "object",
        description: "Current service only allows status updates.",
        properties: {
            status: { type: "string", enum: statusEnum, example: "INACTIVE" },
        },
    },

    VariantStock: stock,

    Variant: {
        type: "object",
        required: ["id", "product_id", "sku", "size", "fabric_type", "status", "created_at", "updated_at"],
        properties: {
            id: { type: "string", pattern: objectIdPattern, example: "507f1f77bcf86cd799439013" },
            product_id: { type: "string", pattern: objectIdPattern, example: "507f1f77bcf86cd799439011" },
            sku: { type: "string", example: "FRUITBAG-20X25-NONWOVEN" },
            size: { type: "string", example: "20x25" },
            fabric_type: { type: "string", example: "Non-woven" },
            min_price: { type: "number", example: 150000 },
            max_price: { type: "number", example: 200000 },
            min_price_per_unit: { type: "number", example: 1500 },
            max_price_per_unit: { type: "number", example: 2000 },
            stock: { $ref: "#/components/schemas/VariantStock" },
            status: { type: "string", enum: statusEnum, example: "ACTIVE" },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
        },
    },

    VariantDetail: {
        allOf: [
            { $ref: "#/components/schemas/Variant" },
            {
                type: "object",
                required: ["units"],
                properties: {
                    units: {
                        type: "array",
                        items: { $ref: "#/components/schemas/VariantUnit" },
                    },
                },
            },
        ],
    },

    VariantDeleteResult: {
        type: "object",
        required: ["message", "variantId"],
        properties: {
            message: { type: "string", example: "Variant deleted successfully" },
            variantId: { type: "string", pattern: objectIdPattern, example: "507f1f77bcf86cd799439013" },
        },
    },

    CreateVariantUnitInput: {
        type: "object",
        required: ["display_name", "pack_size", "price_tiers"],
        properties: {
            unit_type: { type: "string", enum: unitTypeEnum, default: "PACK", example: "PACK" },
            display_name: { type: "string", minLength: 1, maxLength: 100, example: "Pack 100" },
            pack_size: { type: "integer", minimum: 1, example: 100 },
            price_tiers: {
                type: "array",
                minItems: 1,
                items: priceTierInput,
            },
            promotion,
            min_order_qty: { type: "integer", minimum: 1, default: 1, example: 1 },
            max_order_qty: { type: "integer", minimum: 1, nullable: true, example: 100 },
            qty_step: { type: "integer", minimum: 1, default: 1, example: 1 },
            is_default: { type: "boolean", default: false, example: true },
            currency: { type: "string", enum: currencyEnum, default: "VND", example: "VND" },
        },
    },

    UpdateVariantUnitInput: {
        type: "object",
        description: "At least one field should be provided.",
        properties: {
            unit_type: { type: "string", enum: unitTypeEnum, example: "PACK" },
            display_name: { type: "string", minLength: 1, maxLength: 100, example: "Pack 100" },
            price_tiers: {
                type: "array",
                minItems: 1,
                items: priceTierInput,
            },
            promotion,
            min_order_qty: { type: "integer", minimum: 1, example: 1 },
            max_order_qty: { type: "integer", minimum: 1, nullable: true, example: 100 },
            qty_step: { type: "integer", minimum: 1, example: 1 },
            is_default: { type: "boolean", example: true },
            currency: { type: "string", enum: currencyEnum, example: "VND" },
        },
    },

    VariantUnit: {
        type: "object",
        required: [
            "id",
            "variant_id",
            "unit_type",
            "display_name",
            "pack_size",
            "price_tiers",
            "min_order_qty",
            "qty_step",
            "is_default",
            "currency",
            "created_at",
            "updated_at",
        ],
        properties: {
            id: { type: "string", pattern: objectIdPattern, example: "507f1f77bcf86cd799439014" },
            variant_id: { type: "string", pattern: objectIdPattern, example: "507f1f77bcf86cd799439013" },
            unit_type: { type: "string", enum: unitTypeEnum, example: "PACK" },
            display_name: { type: "string", example: "Pack 100" },
            pack_size: { type: "integer", example: 100 },
            price_tiers: { type: "array", items: priceTier },
            promotion,
            min_order_qty: { type: "integer", example: 1 },
            max_order_qty: { type: "integer", nullable: true, example: 100 },
            qty_step: { type: "integer", example: 1 },
            is_default: { type: "boolean", example: true },
            currency: { type: "string", enum: currencyEnum, example: "VND" },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
        },
    },

    VariantUnitDeleteResult: {
        type: "object",
        required: ["message", "unitId"],
        properties: {
            message: { type: "string", example: "Variant unit deleted successfully" },
            unitId: { type: "string", pattern: objectIdPattern, example: "507f1f77bcf86cd799439014" },
        },
    },

    CalculatePriceInput: {
        type: "object",
        required: ["qty_packs"],
        properties: {
            qty_packs: { type: "integer", minimum: 1, maximum: 1000000, example: 3 },
        },
    },

    PriceCalculationResult: {
        type: "object",
        properties: {
            qty_packs: { type: "integer", example: 3 },
            unit_price: { type: "number", example: 180000 },
            total_price: { type: "number", example: 540000 },
            total_items: { type: "integer", example: 300 },
            price_per_unit: { type: "number", example: 1800 },
            currency: { type: "string", enum: currencyEnum, example: "VND" },
            pack_size: { type: "integer", example: 100 },
            unit_display: { type: "string", example: "Pack 100" },
        },
    },

    ReserveStockInput: {
        type: "object",
        required: ["qty_items"],
        properties: {
            qty_items: { type: "integer", minimum: 1, maximum: 1000000, example: 300 },
        },
    },

    ValidatePriceTiersInput: {
        type: "object",
        required: ["price_tiers"],
        properties: {
            price_tiers: {
                type: "array",
                minItems: 1,
                items: priceTierInput,
            },
        },
    },

    ProductResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/Product" },
        },
    },

    ProductDetailResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/ProductDetail" },
        },
    },

    ProductsPaginatedResponse: {
        type: "object",
        required: ["success", "data", "pagination"],
        properties: {
            success: { type: "boolean", example: true },
            data: { type: "array", items: { $ref: "#/components/schemas/ProductListItem" } },
            pagination,
        },
    },

    ProductsListResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: { type: "array", items: { $ref: "#/components/schemas/ProductListItem" } },
        },
    },

    ProductDeleteResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/ProductDeleteResult" },
        },
    },

    VariantResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/VariantDetail" },
        },
    },

    VariantsListResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: { type: "array", items: { $ref: "#/components/schemas/VariantDetail" } },
        },
    },

    VariantDeleteResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/VariantDeleteResult" },
        },
    },

    VariantUnitResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/VariantUnit" },
        },
    },

    VariantUnitsListResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: { type: "array", items: { $ref: "#/components/schemas/VariantUnit" } },
        },
    },

    VariantUnitDeleteResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/VariantUnitDeleteResult" },
        },
    },

    CalculatePriceResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/PriceCalculationResult" },
        },
    },

    VariantStockResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: {
                type: "object",
                required: ["variant_id", "sku", "stock"],
                properties: {
                    variant_id: { type: "string", pattern: objectIdPattern },
                    sku: { type: "string", example: "FRUITBAG-20X25-NONWOVEN" },
                    stock,
                },
            },
        },
    },

    VariantMaxOrderQtyResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: {
                type: "object",
                required: ["variant_id", "max_packs", "max_items", "pack_size"],
                properties: {
                    variant_id: { type: "string", pattern: objectIdPattern },
                    max_packs: { type: "integer", example: 10 },
                    max_items: { type: "integer", example: 1000 },
                    pack_size: { type: "integer", example: 100 },
                },
            },
        },
    },

    StockActionResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: {
                type: "object",
                required: ["variant_id", "stock"],
                properties: {
                    variant_id: { type: "string", pattern: objectIdPattern },
                    stock,
                },
            },
        },
    },

    PriceTierSummaryResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: {
                type: "array",
                items: priceTier,
            },
        },
    },

    MaxOrderableQtyResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: {
                type: "object",
                required: ["unit_id", "max_orderable_packs"],
                properties: {
                    unit_id: { type: "string", pattern: objectIdPattern },
                    max_orderable_packs: { type: "integer", example: 999 },
                },
            },
        },
    },

    ValidatePriceTiersResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: {
                type: "object",
                required: ["valid", "message"],
                properties: {
                    valid: { type: "boolean", example: true },
                    message: { type: "string", example: "Price tiers are valid" },
                },
            },
        },
    },
};
