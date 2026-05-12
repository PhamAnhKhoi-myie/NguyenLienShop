class VariantUnitMapper {
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
            price_tiers: this.transformPriceTiers(
                doc.price_tiers || [],
                doc.pack_size
            ),

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

    static toResponseDTOList(units) {
        if (!Array.isArray(units)) {
            return [];
        }
        return units.map((unit) => this.toResponseDTO(unit));
    }

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

    static transformPriceTiers(priceTiers, packSize) {
        if (!Array.isArray(priceTiers) || priceTiers.length === 0) {
            return [];
        }

        return priceTiers.map((tier, index) => ({
            tier_number: index + 1,
            min_qty: tier.min_qty,
            max_qty: tier.max_qty,
            unit_price: tier.unit_price,
            price_per_unit: Math.round(tier.unit_price / packSize), // ✅ FIX
            qty_range: this.formatQtyRange(tier.min_qty, tier.max_qty),
        }));
    }

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

    static formatQtyRange(minQty, maxQty) {
        if (maxQty === null) {
            return `${minQty}+`;
        }
        return `${minQty}-${maxQty}`;
    }

    static formatPrice(price) {
        if (price >= 1000000) {
            return `${(price / 1000000).toFixed(1)}M`;
        }
        if (price >= 1000) {
            return `${(price / 1000).toFixed(0)}k`;
        }
        return price.toString();
    }

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