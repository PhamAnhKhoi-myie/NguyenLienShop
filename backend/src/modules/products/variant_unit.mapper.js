/**
 * Variant Unit DTO Mapper
 * Transform between MongoDB documents and API responses
 * 
 * ✅ Expose: pack_size, display_name, price_tiers
 * ✅ Format: price_tiers with min_qty, max_qty, unit_price
 */

class VariantUnitMapper {
    /**
     * ✅ Convert Mongoose document → API Response DTO
     * 
     * Dùng cho: Unit listing, create/update returns
     * Include: all unit info + price tiers
     */
    static toResponseDTO(unit) {
        if (!unit) {
            return null;
        }

        const doc = unit.toObject ? unit.toObject() : unit;

        return {
            id: doc._id?.toString(),
            variant_id: doc.variant_id?.toString(),

            // ✅ Unit definition
            unit_type: doc.unit_type,
            display_name: doc.display_name,
            pack_size: doc.pack_size,

            // ✅ FIX #1: Price tiers (critical)
            price_tiers: this.transformPriceTiers(doc.price_tiers || []),

            // ✅ Order rules
            min_order_qty: doc.min_order_qty || 1,
            max_order_qty: doc.max_order_qty || null,
            qty_step: doc.qty_step || 1,

            // ✅ Visibility
            is_default: doc.is_default || false,
            currency: doc.currency || 'VND',

            created_at: doc.created_at,
            updated_at: doc.updated_at,
        };
    }

    /**
     * ✅ Convert array of documents → array of DTOs
     * 
     * Dùng cho: Get all units for variant
     */
    static toResponseDTOList(units) {
        if (!Array.isArray(units)) {
            return [];
        }
        return units.map((unit) => this.toResponseDTO(unit));
    }

    /**
     * ✅ Convert to List Item DTO (lightweight for display)
     * 
     * Dùng cho: Unit selection dropdown, variant options
     * Include: display name + price range
     */
    static toListDTO(unit) {
        if (!unit) {
            return null;
        }

        const doc = unit.toObject ? unit.toObject() : unit;

        const priceTiers = doc.price_tiers || [];
        const minPrice = priceTiers.length > 0 ?
            Math.min(...priceTiers.map(t => t.unit_price)) : 0;
        const maxPrice = priceTiers.length > 0 ?
            Math.max(...priceTiers.map(t => t.unit_price)) : 0;

        return {
            id: doc._id?.toString(),
            display_name: doc.display_name,
            pack_size: doc.pack_size,

            // ✅ Price range (for card display)
            price_range: {
                min: minPrice,
                max: maxPrice,
                currency: doc.currency || 'VND',
            },

            is_default: doc.is_default || false,
        };
    }

    /**
     * ✅ Convert to Price Calculator DTO (for cart/checkout)
     * 
     * Dùng cho: Add to cart, calculate price, checkout
     * Include: unit info + tiers + price calculation logic
     */
    static toPriceCalcDTO(unit) {
        if (!unit) {
            return null;
        }

        const doc = unit.toObject ? unit.toObject() : unit;

        const priceTiers = doc.price_tiers || [];

        return {
            id: doc._id?.toString(),
            display_name: doc.display_name,
            pack_size: doc.pack_size,

            // ✅ Full tier details for calculation
            price_tiers: this.transformPriceTiers(priceTiers),

            // ✅ Order constraints (enforce in UI)
            min_order_qty: doc.min_order_qty || 1,
            max_order_qty: doc.max_order_qty || null,
            qty_step: doc.qty_step || 1,

            currency: doc.currency || 'VND',

            // ✅ Info to display
            description: this.generateUnitDescription(
                doc.display_name,
                doc.pack_size,
                priceTiers
            ),
        };
    }

    /**
     * ✅ Convert for Order Item (snapshot)
     * 
     * Dùng cho: Order confirmation, order history
     */
    static toOrderItemDTO(unit, qtyPacks) {
        if (!unit) {
            return null;
        }

        const doc = unit.toObject ? unit.toObject() : unit;

        // ✅ Find matching price tier for qty
        const matchingTier = this.findPriceTierForQty(
            qtyPacks,
            doc.price_tiers || []
        );

        const unitPrice = matchingTier?.unit_price || 0;
        const totalPrice = qtyPacks * unitPrice;
        const totalItems = qtyPacks * doc.pack_size;

        return {
            unit_id: doc._id?.toString(),
            unit_name: doc.display_name,
            pack_size: doc.pack_size,
            quantity_packs: qtyPacks,
            total_items: totalItems,

            // ✅ Pricing snapshot
            unit_price: unitPrice,
            total_price: totalPrice,
            price_per_item: Math.round(totalPrice / totalItems),
            currency: doc.currency || 'VND',

            // ✅ Tier info
            applied_tier: matchingTier
                ? {
                    min_qty: matchingTier.min_qty,
                    max_qty: matchingTier.max_qty,
                }
                : null,
        };
    }

    /**
     * ✅ Convert for Admin Dashboard
     * 
     * Dùng cho: Admin panel, analytics
     */
    static toAdminDTO(unit) {
        if (!unit) {
            return null;
        }

        const doc = unit.toObject ? unit.toObject() : unit;

        const priceTiers = doc.price_tiers || [];
        const minPrice = priceTiers.length > 0 ?
            Math.min(...priceTiers.map(t => t.unit_price)) : 0;
        const maxPrice = priceTiers.length > 0 ?
            Math.max(...priceTiers.map(t => t.unit_price)) : 0;

        return {
            id: doc._id?.toString(),
            variant_id: doc.variant_id?.toString(),

            // ✅ Unit details
            unit_type: doc.unit_type,
            display_name: doc.display_name,
            pack_size: doc.pack_size,

            // ✅ Price analysis
            pricing: {
                min_price: minPrice,
                max_price: maxPrice,
                price_per_unit_min: Math.round(minPrice / doc.pack_size),
                price_per_unit_max: Math.round(maxPrice / doc.pack_size),
                tier_count: priceTiers.length,
                currency: doc.currency,
            },

            // ✅ Full tier breakdown
            price_tiers: this.transformPriceTiers(priceTiers),

            // ✅ Order rules
            constraints: {
                min_order_qty: doc.min_order_qty || 1,
                max_order_qty: doc.max_order_qty || null,
                qty_step: doc.qty_step || 1,
            },

            is_default: doc.is_default || false,

            created_at: doc.created_at,
            updated_at: doc.updated_at,
        };
    }

    /**
     * ✅ Helper: Transform price tiers array
     * 
     * Add calculated fields:
     * - price_per_unit = unit_price / pack_size
     * - price_range_label
     */
    static transformPriceTiers(priceTiers) {
        if (!Array.isArray(priceTiers) || priceTiers.length === 0) {
            return [];
        }

        return priceTiers.map((tier, index) => {
            const packSize = 100; // ⚠️ This should come from parent unit!
            // Better approach: pass packSize as parameter (below)

            return {
                tier_number: index + 1,
                min_qty: tier.min_qty,
                max_qty: tier.max_qty,
                unit_price: tier.unit_price,

                // ✅ Range label (for UI)
                qty_range: this.formatQtyRange(tier.min_qty, tier.max_qty),
            };
        });
    }

    /**
     * ✅ Helper: Transform price tiers WITH pack_size
     * 
     * Include: price_per_unit calculation
     */
    static transformPriceTiersWithCalc(priceTiers, packSize = 100) {
        if (!Array.isArray(priceTiers) || priceTiers.length === 0) {
            return [];
        }

        return priceTiers.map((tier, index) => ({
            tier_number: index + 1,
            min_qty: tier.min_qty,
            max_qty: tier.max_qty,
            unit_price: tier.unit_price,

            // ✅ Per-unit price
            price_per_unit: Math.round(tier.unit_price / packSize),

            // ✅ Display
            qty_range: this.formatQtyRange(tier.min_qty, tier.max_qty),
        }));
    }

    /**
     * ✅ Helper: Generate human-readable unit description
     * 
     * Example: "Gói 100 - từ 180k (mua 1-10 gói)"
     */
    static generateUnitDescription(displayName, packSize, priceTiers = []) {
        if (!displayName) return '';

        let desc = displayName;

        if (priceTiers.length > 0) {
            const minPrice = Math.min(...priceTiers.map(t => t.unit_price));
            const maxPrice = Math.max(...priceTiers.map(t => t.unit_price));

            if (minPrice === maxPrice) {
                desc += ` - ${this.formatPrice(minPrice)}`;
            } else {
                desc += ` - từ ${this.formatPrice(minPrice)} đến ${this.formatPrice(maxPrice)}`;
            }

            const firstTier = priceTiers[0];
            desc += ` (mua ${firstTier.min_qty}-${firstTier.max_qty || '∞'} gói)`;
        }

        return desc;
    }

    /**
     * ✅ Helper: Format quantity range for display
     * 
     * Examples: "1-10", "11-50", "51+"
     */
    static formatQtyRange(minQty, maxQty) {
        if (maxQty === null) {
            return `${minQty}+`;
        }
        return `${minQty}-${maxQty}`;
    }

    /**
     * ✅ Helper: Format price for display
     * 
     * Example: 180000 → "180k"
     */
    static formatPrice(price) {
        if (price >= 1000000) {
            return `${(price / 1000000).toFixed(1)}M`;
        }
        if (price >= 1000) {
            return `${(price / 1000).toFixed(0)}k`;
        }
        return price.toString();
    }

    /**
     * ✅ Helper: Find price tier matching quantity
     * 
     * Used for order calculations
     */
    static findPriceTierForQty(qty, priceTiers) {
        if (!Array.isArray(priceTiers) || priceTiers.length === 0) {
            return null;
        }

        return priceTiers.find(
            (tier) =>
                qty >= tier.min_qty &&
                (tier.max_qty === null || qty <= tier.max_qty)
        );
    }
}

module.exports = VariantUnitMapper;