/**
 * Variant DTO Mapper
 * Transform between MongoDB documents and API responses
 * 
 * ✅ Expose: sku, size, fabric_type, pricing, stock
 * ✅ Hide: is_deleted, internal fields
 */

class VariantMapper {
    /**
     * ✅ Convert Mongoose document → API Response DTO (basic)
     * 
     * Dùng cho: Variant listing, create/update returns
     * Include: variant info + pricing + stock
     */
    static toResponseDTO(variant) {
        if (!variant) {
            return null;
        }

        const doc = variant.toObject ? variant.toObject() : variant;

        return {
            id: doc._id?.toString(),
            product_id: doc.product_id?.toString(),

            // ✅ Identity
            sku: doc.sku,
            size: doc.size,
            fabric_type: doc.fabric_type,

            // ✅ FIX #3: Pricing (cached)
            min_price: doc.min_price || 0,
            max_price: doc.max_price || 0,
            min_price_per_unit: doc.min_price_per_unit || 0,
            max_price_per_unit: doc.max_price_per_unit || 0,

            // ✅ FIX #2: Stock (by cái, NOT pack)
            stock: {
                available: doc.stock?.available || 0,
                reserved: doc.stock?.reserved || 0,
                sold: doc.stock?.sold || 0,
            },

            status: doc.status,

            created_at: doc.created_at,
            updated_at: doc.updated_at,
        };
    }

    /**
     * ✅ Convert array of documents → array of DTOs
     * 
     * Dùng cho: Get variants by product
     */
    static toResponseDTOList(variants) {
        if (!Array.isArray(variants)) {
            return [];
        }
        return variants.map((variant) => this.toResponseDTO(variant));
    }

    /**
     * ✅ Convert Mongoose document → Detail DTO (with units)
     * 
     * Dùng cho: GET /variants/:id (full detail with units)
     * Include: variant info + all units
     */
    static toDetailDTO(variant, units = []) {
        if (!variant) {
            return null;
        }

        const responseDTO = this.toResponseDTO(variant);

        return {
            ...responseDTO,

            // ✅ Include nested units
            units: units.map((unit) => this.transformUnitDetail(unit)),
        };
    }

    /**
     * ✅ Convert to List Item DTO (lightweight)
     * 
     * Dùng cho: Variant selection dropdown, summary
     */
    static toListDTO(variant) {
        if (!variant) {
            return null;
        }

        const doc = variant.toObject ? variant.toObject() : variant;

        return {
            id: doc._id?.toString(),
            sku: doc.sku,
            size: doc.size,
            fabric_type: doc.fabric_type,

            // ✅ Price range for display
            min_price: doc.min_price || 0,
            max_price: doc.max_price || 0,

            // ✅ Stock for quick check
            available_stock: doc.stock?.available || 0,

            status: doc.status,
        };
    }

    /**
     * ✅ Convert for Shopping Cart
     * 
     * Dùng cho: Add to cart response
     * Include: variant info + default unit
     */
    static toCartDTO(variant, defaultUnit = null) {
        if (!variant) {
            return null;
        }

        const doc = variant.toObject ? variant.toObject() : variant;

        return {
            id: doc._id?.toString(),
            sku: doc.sku,
            size: doc.size,
            fabric_type: doc.fabric_type,

            // ✅ Stock check
            max_available_packs:
                defaultUnit?.pack_size
                    ? Math.floor(
                        doc.stock?.available / defaultUnit.pack_size
                    )
                    : 0,

            // ✅ Default unit info
            default_unit: defaultUnit
                ? {
                    id: defaultUnit._id?.toString(),
                    display_name: defaultUnit.display_name,
                    pack_size: defaultUnit.pack_size,
                    currency: defaultUnit.currency,
                }
                : null,

            pricing: {
                min_price: doc.min_price || 0,
                max_price: doc.max_price || 0,
                min_price_per_unit: doc.min_price_per_unit || 0,
                max_price_per_unit: doc.max_price_per_unit || 0,
            },
        };
    }

    /**
     * ✅ Convert for Order Item (snapshot at purchase time)
     * 
     * Dùng cho: Order confirmation, order history
     */
    static toOrderItemDTO(variant) {
        if (!variant) {
            return null;
        }

        const doc = variant.toObject ? variant.toObject() : variant;

        return {
            variant_id: doc._id?.toString(),
            sku: doc.sku,
            size: doc.size,
            fabric_type: doc.fabric_type,

            // ✅ Snapshot of pricing
            price_snapshot: {
                min_price: doc.min_price || 0,
                max_price: doc.max_price || 0,
                min_price_per_unit: doc.min_price_per_unit || 0,
                max_price_per_unit: doc.max_price_per_unit || 0,
            },

            // ✅ Stock at time of order
            stock_snapshot: {
                available: doc.stock?.available || 0,
                reserved: doc.stock?.reserved || 0,
            },
        };
    }

    /**
     * ✅ Convert for Admin Dashboard (detailed stats)
     * 
     * Dùng cho: Admin panel, analytics
     */
    static toAdminDTO(variant) {
        if (!variant) {
            return null;
        }

        const doc = variant.toObject ? variant.toObject() : variant;

        return {
            id: doc._id?.toString(),
            product_id: doc.product_id?.toString(),
            sku: doc.sku,
            size: doc.size,
            fabric_type: doc.fabric_type,

            // ✅ Full stock details
            stock: {
                available: doc.stock?.available || 0,
                reserved: doc.stock?.reserved || 0,
                sold: doc.stock?.sold || 0,
                total_inventory: (doc.stock?.available || 0) +
                    (doc.stock?.reserved || 0) +
                    (doc.stock?.sold || 0),
            },

            // ✅ Pricing
            pricing: {
                min_price: doc.min_price || 0,
                max_price: doc.max_price || 0,
                min_price_per_unit: doc.min_price_per_unit || 0,
                max_price_per_unit: doc.max_price_per_unit || 0,
            },

            status: doc.status,
            created_at: doc.created_at,
            updated_at: doc.updated_at,
        };
    }

    /**
     * ✅ Helper: Transform unit detail (nested in variant detail)
     */
    static transformUnitDetail(unit) {
        if (!unit) {
            return null;
        }

        const doc = unit.toObject ? unit.toObject() : unit;

        return {
            id: doc._id?.toString(),
            unit_type: doc.unit_type,
            display_name: doc.display_name,
            pack_size: doc.pack_size,

            // ✅ Price tiers
            price_tiers: (doc.price_tiers || []).map((tier) => ({
                min_qty: tier.min_qty,
                max_qty: tier.max_qty,
                unit_price: tier.unit_price,
            })),

            // ✅ Order constraints
            min_order_qty: doc.min_order_qty || 1,
            max_order_qty: doc.max_order_qty || null,
            qty_step: doc.qty_step || 1,

            is_default: doc.is_default || false,
            currency: doc.currency || 'VND',

            created_at: doc.created_at,
        };
    }
}

module.exports = VariantMapper;