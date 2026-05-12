class ProductMapper {
    static toResponseDTO(product) {
        if (!product) {
            return null;
        }

        const doc = product.toObject ? product.toObject() : product;

        return {
            id: doc._id?.toString(),
            name: doc.name,
            slug: doc.slug,
            category_id: doc.category_id?.toString(),
            brand: doc.brand || null,

            min_price: doc.min_price || 0,
            max_price: doc.max_price || 0,
            min_price_per_unit: doc.min_price_per_unit || 0,
            max_price_per_unit: doc.max_price_per_unit || 0,

            description: doc.description || null,
            short_description: doc.short_description || null,

            images: this.transformImages(doc.images || []),

            search_keywords: doc.search_keywords || [],

            rating_avg: doc.rating_avg || 0,
            rating_count: doc.rating_count || 0,
            sold_count: doc.sold_count || 0,

            status: doc.status,

            created_at: doc.created_at,
            updated_at: doc.updated_at,
        };
    }

    static toResponseDTOList(products) {
        if (!Array.isArray(products)) {
            return [];
        }
        return products.map((product) => this.toResponseDTO(product));
    }

    static toDetailDTO(product, variants = []) {
        if (!product) {
            return null;
        }

        const responseDTO = this.toResponseDTO(product);

        return {
            ...responseDTO,

            variants: variants.map((variant) =>
                this.transformVariantDetail(variant)
            ),
        };
    }

    static toListDTO(product) {
        if (!product) {
            return null;
        }

        const doc = product.toObject ? product.toObject() : product;

        return {
            id: doc._id?.toString(),
            name: doc.name,
            slug: doc.slug,
            category_id: doc.category_id?.toString(),
            brand: doc.brand || null,

            min_price: doc.min_price || 0,
            max_price: doc.max_price || 0,

            image: this.getPrimaryImage(doc.images || []),

            rating_avg: doc.rating_avg || 0,
            rating_count: doc.rating_count || 0,
            sold_count: doc.sold_count || 0,

            status: doc.status,
            created_at: doc.created_at,
        };
    }

    static toCartItemDTO(product, variant, unit) {
        if (!product) {
            return null;
        }

        const doc = product.toObject ? product.toObject() : product;

        return {
            id: doc._id?.toString(),
            name: doc.name,
            slug: doc.slug,

            variant: {
                id: variant?._id?.toString(),
                sku: variant?.sku,
                size: variant?.size,
                fabric_type: variant?.fabric_type,
            },

            unit: {
                id: unit?._id?.toString(),
                display_name: unit?.display_name,
                pack_size: unit?.pack_size,
                currency: unit?.currency,
            },

            image: this.getPrimaryImage(doc.images || []),

            price: unit?.price_tiers?.[0]?.unit_price || 0,
        };
    }

    static toOrderItemDTO(product, variant, unit, orderQty) {
        if (!product) {
            return null;
        }

        return {
            product_id: product._id?.toString(),
            product_name: product.name,
            product_slug: product.slug,

            variant_sku: variant?.sku,
            variant_size: variant?.size,
            variant_fabric: variant?.fabric_type,

            unit_name: unit?.display_name,
            pack_size: unit?.pack_size,

            order_qty_packs: orderQty,
            total_items: orderQty * unit?.pack_size || 0,

            unit_price: unit?.price_tiers?.[0]?.unit_price || 0,
            total_price: (orderQty * unit?.price_tiers?.[0]?.unit_price) || 0,

            currency: unit?.currency,
        };
    }

    static transformImages(images) {
        if (!Array.isArray(images) || images.length === 0) {
            return [];
        }

        return images
            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
            .map((img) => ({
                url: img.url,
                alt: img.alt || null,
                is_primary: img.is_primary || false,
                sort_order: img.sort_order || 0,
            }));
    }

    static getPrimaryImage(images) {
        if (!Array.isArray(images) || images.length === 0) {
            return null;
        }

        const primary = images.find((img) => img.is_primary);
        return primary || images[0];
    }

    static transformVariantDetail(variant) {
        if (!variant) {
            return null;
        }

        const doc = variant.toObject
            ? variant.toObject()
            : variant;

        return {
            id: doc._id?.toString(),
            sku: doc.sku,
            size: doc.size,
            fabric_type: doc.fabric_type,

            min_price: doc.min_price || 0,
            max_price: doc.max_price || 0,
            min_price_per_unit: doc.min_price_per_unit || 0,
            max_price_per_unit: doc.max_price_per_unit || 0,

            stock: {
                available: doc.stock?.available || 0,
                reserved: doc.stock?.reserved || 0,
                sold: doc.stock?.sold || 0,
            },

            status: doc.status,

            units: Array.isArray(doc.units)
                ? doc.units.map((unit) =>
                    this.transformUnitDetail(unit)
                )
                : [],

            created_at: doc.created_at,
            updated_at: doc.updated_at,
        };
    }

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

            price_tiers: (doc.price_tiers || []).map((tier) => ({
                min_qty: tier.min_qty,
                max_qty: tier.max_qty,
                unit_price: tier.unit_price,
            })),

            min_order_qty: doc.min_order_qty || 1,
            max_order_qty: doc.max_order_qty || null,
            qty_step: doc.qty_step || 1,

            is_default: doc.is_default || false,
            currency: doc.currency || 'VND',

            created_at: doc.created_at,
        };
    }
}

module.exports = ProductMapper;