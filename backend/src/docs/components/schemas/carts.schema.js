const objectIdPattern = "^[a-fA-F0-9]{24}$";
const cartStatusEnum = ["ACTIVE", "ABANDONED", "CHECKED_OUT"];

module.exports = {
    CartItem: {
        type: "object",
        required: [
            "id",
            "product_id",
            "variant_id",
            "unit_id",
            "sku",
            "quantity",
            "price_at_added",
            "line_total",
        ],
        properties: {
            id: { type: "string", pattern: objectIdPattern, example: "507f1f77bcf86cd799439015" },
            product_id: { type: "string", pattern: objectIdPattern, example: "507f1f77bcf86cd799439010" },
            variant_id: { type: "string", pattern: objectIdPattern, example: "507f1f77bcf86cd799439011" },
            unit_id: { type: "string", pattern: objectIdPattern, example: "507f1f77bcf86cd799439012" },
            category_id: { type: "string", pattern: objectIdPattern, nullable: true },
            sku: { type: "string", example: "BAG-20X25-NONWOVEN" },
            variant_label: { type: "string", example: "20x25 - Non-woven" },
            product_name: { type: "string", example: "Fruit protection bag" },
            product_image: { type: "string", format: "uri", nullable: true },
            display_name: { type: "string", example: "Pack 100" },
            pack_size: { type: "integer", example: 100 },
            price_at_added: { type: "number", example: 180000 },
            quantity: { type: "integer", example: 5 },
            line_total: { type: "number", example: 900000 },
            added_at: { type: "string", format: "date-time" },
        },
    },

    CartItemDetail: {
        allOf: [
            { $ref: "#/components/schemas/CartItem" },
            {
                type: "object",
                properties: {
                    quantity_packs: { type: "integer", example: 5 },
                    total_items: { type: "integer", example: 500 },
                    price_per_item: { type: "number", example: 1800 },
                },
            },
        ],
    },

    CartDiscount: {
        type: "object",
        properties: {
            discount_id: { type: "string", pattern: objectIdPattern, nullable: true },
            code: { type: "string", example: "SALE10" },
            type: { type: "string", enum: ["PERCENT", "FIXED"], example: "PERCENT" },
            value: { type: "number", example: 10 },
            discount_amount: { type: "number", example: 90000 },
            min_purchase: { type: "number", example: 500000 },
            max_discount: { type: "number", example: 100000 },
            apply_scope: { type: "string", enum: ["CART", "ITEM"], example: "CART" },
            applied_at: { type: "string", format: "date-time" },
            expires_at: { type: "string", format: "date-time", nullable: true },
        },
    },

    CartTotals: {
        type: "object",
        properties: {
            subtotal: { type: "number", example: 900000 },
            discount_amount: { type: "number", example: 90000 },
            total: { type: "number", example: 810000 },
            item_count: { type: "integer", example: 1 },
            items_total_units: { type: "integer", example: 500 },
        },
    },

    Cart: {
        type: "object",
        required: ["id", "items", "totals", "status", "created_at", "updated_at"],
        properties: {
            id: { type: "string", pattern: objectIdPattern },
            user_id: { type: "string", pattern: objectIdPattern, nullable: true },
            session_key: { type: "string", format: "uuid", nullable: true },
            items: { type: "array", items: { $ref: "#/components/schemas/CartItem" } },
            discount: { $ref: "#/components/schemas/CartDiscount", nullable: true },
            totals: { $ref: "#/components/schemas/CartTotals" },
            status: { type: "string", enum: cartStatusEnum, example: "ACTIVE" },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
        },
    },

    CartSummary: {
        type: "object",
        required: ["id", "item_count", "items_total_units", "subtotal", "discount_amount", "total", "status"],
        properties: {
            id: { type: "string", pattern: objectIdPattern },
            item_count: { type: "integer", example: 1 },
            items_total_units: { type: "integer", example: 500 },
            subtotal: { type: "number", example: 900000 },
            discount_amount: { type: "number", example: 90000 },
            total: { type: "number", example: 810000 },
            status: { type: "string", enum: cartStatusEnum, example: "ACTIVE" },
        },
    },

    CartDetail: {
        allOf: [
            { $ref: "#/components/schemas/Cart" },
            {
                type: "object",
                properties: {
                    items: {
                        type: "array",
                        items: { $ref: "#/components/schemas/CartItemDetail" },
                    },
                },
            },
        ],
    },

    AddToCartInput: {
        type: "object",
        required: ["product_id", "variant_id", "unit_id", "quantity"],
        additionalProperties: false,
        properties: {
            product_id: { type: "string", pattern: objectIdPattern },
            variant_id: { type: "string", pattern: objectIdPattern },
            unit_id: { type: "string", pattern: objectIdPattern },
            quantity: { type: "integer", minimum: 1, maximum: 999, example: 2 },
        },
    },

    UpdateCartItemInput: {
        type: "object",
        required: ["quantity"],
        properties: {
            quantity: { type: "integer", minimum: 1, maximum: 999, example: 3 },
        },
    },

    ApplyDiscountInput: {
        type: "object",
        required: ["code"],
        properties: {
            code: {
                type: "string",
                minLength: 3,
                maxLength: 20,
                pattern: "^[A-Z0-9\\-]+$",
                example: "SALE10",
            },
        },
    },

    MergeCartInput: {
        type: "object",
        additionalProperties: false,
        properties: {
            session_key: { type: "string", format: "uuid", nullable: true },
        },
    },

    CreateGuestCartInput: {
        type: "object",
        additionalProperties: false,
        properties: {
            session_key: { type: "string", format: "uuid" },
        },
    },

    CheckoutSnapshotItem: {
        type: "object",
        properties: {
            product_id: { type: "string", pattern: objectIdPattern },
            variant_id: { type: "string", pattern: objectIdPattern },
            unit_id: { type: "string", pattern: objectIdPattern },
            category_id: { type: "string", pattern: objectIdPattern, nullable: true },
            sku: { type: "string" },
            variant_label: { type: "string" },
            product_name: { type: "string" },
            product_image: { type: "string", format: "uri", nullable: true },
            display_name: { type: "string" },
            pack_size: { type: "integer" },
            price_at_added: { type: "number" },
            quantity: { type: "integer" },
            line_total: { type: "number" },
            total_items: { type: "integer" },
            price_per_item: { type: "number" },
        },
    },

    CheckoutSnapshot: {
        type: "object",
        required: ["source_cart_id", "items", "totals", "snapshot_at"],
        properties: {
            source_cart_id: { type: "string", pattern: objectIdPattern },
            cart_id: { type: "string", pattern: objectIdPattern },
            items: {
                type: "array",
                items: { $ref: "#/components/schemas/CheckoutSnapshotItem" },
            },
            discount: { $ref: "#/components/schemas/CartDiscount", nullable: true },
            totals: { $ref: "#/components/schemas/CartTotals" },
            snapshot_at: { type: "string", format: "date-time" },
        },
    },

    CartValidation: {
        type: "object",
        required: ["isValid", "errors", "totals"],
        properties: {
            isValid: { type: "boolean", example: true },
            errors: { type: "array", items: { type: "string" }, example: [] },
            totals: { $ref: "#/components/schemas/CartTotals" },
        },
    },

    AbandonedCart: {
        allOf: [
            { $ref: "#/components/schemas/Cart" },
            {
                type: "object",
                properties: {
                    expired_at: { type: "string", format: "date-time", nullable: true },
                    abandoned_since: { type: "string", example: "2 days ago" },
                },
            },
        ],
    },

    CartResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/Cart" },
            message: { type: "string" },
        },
    },

    CartSummaryResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/CartSummary" },
        },
    },

    CartDetailResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/CartDetail" },
        },
    },

    CartListResponse: {
        type: "object",
        required: ["success", "data", "pagination"],
        properties: {
            success: { type: "boolean", example: true },
            data: {
                type: "array",
                items: { $ref: "#/components/schemas/AbandonedCart" },
            },
            pagination: {
                type: "object",
                required: ["total", "limit"],
                properties: {
                    total: { type: "integer", example: 50 },
                    limit: { type: "integer", example: 100 },
                },
            },
        },
    },

    CheckoutResponse: {
        type: "object",
        required: ["success", "data", "message"],
        properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/CheckoutSnapshot" },
            message: { type: "string", example: "Cart validated for checkout" },
        },
    },

    ValidateResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/CartValidation" },
        },
    },

    AbandonedResponse: {
        type: "object",
        required: ["success", "data", "message"],
        properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/AbandonedCart" },
            message: { type: "string", example: "Cart marked as abandoned" },
        },
    },
};
