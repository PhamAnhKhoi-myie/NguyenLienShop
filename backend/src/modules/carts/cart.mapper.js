class CartMapper {
    static toResponseDTO(cart) {
        if (!cart) {
            return null;
        }

        const doc = cart.toObject ? cart.toObject() : cart;

        const totals = this.calculateCartTotals(doc.items, doc.discount);

        return {
            id: doc._id?.toString?.() || doc.id,

            user_id: doc.user_id ? doc.user_id.toString() : null,
            session_key: doc.session_key || null,

            items: this.transformItems(doc.items || []),

            discount: doc.discount ? this.transformDiscount(doc.discount) : null,

            totals: totals,

            status: doc.status,
            created_at: doc.created_at,
            updated_at: doc.updated_at,
        };
    }

    static toSummaryDTO(cart) {
        if (!cart) {
            return null;
        }

        const doc = cart.toObject ? cart.toObject() : cart;

        const totals = this.calculateCartTotals(doc.items, doc.discount);

        return {
            id: doc._id?.toString?.() || doc.id,

            item_count: doc.items?.length || 0,
            items_total_units: this.calculateTotalUnits(doc.items || []),

            subtotal: totals.subtotal,
            discount_amount: totals.discount_amount,
            total: totals.total,

            status: doc.status,
        };
    }

    static toDetailDTO(cart) {
        if (!cart) {
            return null;
        }

        const doc = cart.toObject ? cart.toObject() : cart;

        const totals = this.calculateCartTotals(doc.items, doc.discount);

        return {
            id: doc._id?.toString?.() || doc.id,

            user_id: doc.user_id ? doc.user_id.toString() : null,
            session_key: doc.session_key || null,

            items: this.transformItemsDetailed(doc.items || []),

            discount: doc.discount
                ? {
                    discount_id: doc.discount.discount_id?.toString?.() || null,
                    code: doc.discount.code,
                    type: doc.discount.type,
                    value: doc.discount.value,
                    discount_amount: doc.discount.discount_amount,
                    min_purchase: doc.discount.min_purchase || 0,
                    max_discount: doc.discount.max_discount || Infinity,
                    apply_scope: doc.discount.apply_scope || 'CART',
                    applied_at: doc.discount.applied_at,
                    expires_at: doc.discount.expires_at,
                }
                : null,

            totals: {
                subtotal: totals.subtotal,
                discount_amount: totals.discount_amount,
                total: totals.total,
                item_count: doc.items?.length || 0,
                items_total_units: this.calculateTotalUnits(doc.items || []),
            },

            status: doc.status,
            created_at: doc.created_at,
            updated_at: doc.updated_at,
        };
    }

    static toAbandonedDTO(cart) {
        if (!cart) {
            return null;
        }

        const doc = cart.toObject ? cart.toObject() : cart;

        const totals = this.calculateCartTotals(doc.items, doc.discount);

        return {
            id: doc._id?.toString(),

            user_id: doc.user_id ? doc.user_id.toString() : null,
            session_key: doc.session_key || null,

            items: this.transformItems(doc.items || []),

            discount: doc.discount ? this.transformDiscount(doc.discount) : null,

            totals: totals,

            created_at: doc.created_at,
            updated_at: doc.updated_at,
            expired_at: doc.expired_at,
            abandoned_since: this.getAbandonedDuration(doc.updated_at),

            status: doc.status,
        };
    }

    static toOrderSnapshotDTO(cart) {
        if (!cart) {
            return null;
        }

        const doc = cart.toObject ? cart.toObject() : cart;

        const totals = this.calculateCartTotals(doc.items, doc.discount);

        return {
            source_cart_id: doc._id?.toString(),

            items: (doc.items || []).map((item) => ({
                product_id: item.product_id?.toString(),
                variant_id: item.variant_id?.toString(),
                unit_id: item.unit_id?.toString(),
                category_id: item.category_id?.toString(),

                sku: item.sku,
                variant_label: item.variant_label,
                product_name: item.product_name,
                product_image: item.product_image,
                display_name: item.display_name,
                pack_size: item.pack_size,

                price_at_added: item.price_at_added,
                quantity: item.quantity,
                line_total: item.price_at_added * item.quantity,

                total_items: item.quantity * item.pack_size,
                price_per_item: Math.round(
                    (item.price_at_added * item.quantity) / (item.quantity * item.pack_size)
                ),
            })),

            discount: doc.discount
                ? {
                    discount_id: doc.discount.discount_id?.toString?.() || null,
                    code: doc.discount.code,
                    type: doc.discount.type,
                    value: doc.discount.value,
                    discount_amount: doc.discount.discount_amount,
                }
                : null,

            totals: {
                subtotal: totals.subtotal,
                discount_amount: totals.discount_amount,
                total: totals.total,
            },

            snapshot_at: new Date(),
        };
    }

    static toAdminDTO(cart) {
        if (!cart) {
            return null;
        }

        const doc = cart.toObject ? cart.toObject() : cart;

        const totals = this.calculateCartTotals(doc.items, doc.discount);

        return {
            id: doc._id?.toString(),

            user_id: doc.user_id ? doc.user_id.toString() : null,
            session_key: doc.session_key || null,
            is_guest: !doc.user_id,

            items: this.transformItemsDetailed(doc.items || []),

            discount: doc.discount
                ? {
                    discount_id: doc.discount.discount_id?.toString?.() || null,
                    code: doc.discount.code,
                    type: doc.discount.type,
                    value: doc.discount.value,
                    discount_amount: doc.discount.discount_amount,
                }
                : null,

            totals: {
                subtotal: totals.subtotal,
                discount_amount: totals.discount_amount,
                total: totals.total,
                item_count: doc.items?.length || 0,
                items_total_units: this.calculateTotalUnits(doc.items || []),
            },

            status: doc.status,
            created_at: doc.created_at,
            updated_at: doc.updated_at,
            expired_at: doc.expired_at,

            days_since_creation: this.getDaysSince(doc.created_at),
            days_since_update: this.getDaysSince(doc.updated_at),
            is_expired: new Date() > new Date(doc.expired_at),
        };
    }

    static toResponseDTOList(carts) {
        if (!Array.isArray(carts)) {
            return [];
        }
        return carts.map((cart) => this.toResponseDTO(cart));
    }

    static toSummaryDTOList(carts) {
        if (!Array.isArray(carts)) {
            return [];
        }
        return carts.map((cart) => this.toSummaryDTO(cart));
    }

    // ===== HELPERS =====
    static transformItems(items) {
        if (!Array.isArray(items) || items.length === 0) {
            return [];
        }

        return items.map((item) => ({
            id: item._id?.toString?.() || item.id,

            product_id: item.product_id?.toString(),
            variant_id: item.variant_id?.toString(),
            unit_id: item.unit_id?.toString(),
            category_id: item.category_id?.toString(),

            sku: item.sku,
            variant_label: item.variant_label,
            product_name: item.product_name,
            product_image: item.product_image,
            display_name: item.display_name,
            pack_size: item.pack_size,

            price_at_added: item.price_at_added,
            quantity: item.quantity,

            line_total: item.price_at_added * item.quantity,

            added_at: item.added_at,
        }));
    }

    static transformItemsDetailed(items) {
        if (!Array.isArray(items) || items.length === 0) {
            return [];
        }

        return items.map((item) => ({
            id: item._id?.toString?.() || item.id,

            product_id: item.product_id?.toString(),
            variant_id: item.variant_id?.toString(),
            unit_id: item.unit_id?.toString(),
            category_id: item.category_id?.toString(),

            sku: item.sku,
            variant_label: item.variant_label,
            product_name: item.product_name,
            product_image: item.product_image,
            display_name: item.display_name,

            pack_size: item.pack_size,
            quantity_packs: item.quantity,
            total_items: item.quantity * item.pack_size,

            price_at_added: item.price_at_added,
            line_total: item.price_at_added * item.quantity,
            price_per_item: Math.round(
                item.price_at_added / item.pack_size
            ),

            added_at: item.added_at,
        }));
    }

    static transformDiscount(discount) {
        if (!discount) {
            return null;
        }

        return {
            discount_id: discount.discount_id?.toString?.() || null,
            code: discount.code,
            type: discount.type,
            value: discount.value,
            discount_amount: discount.discount_amount,
            applied_at: discount.applied_at,
            expires_at: discount.expires_at,
        };
    }

    static calculateCartTotals(items, discount) {
        let subtotal = 0;
        if (Array.isArray(items)) {
            subtotal = items.reduce(
                (sum, item) => sum + item.price_at_added * item.quantity,
                0
            );
        }

        const discountAmount = discount?.discount_amount || 0;

        const total = Math.max(subtotal - discountAmount, 0);

        return {
            subtotal: Math.round(subtotal * 100) / 100, // Round to 2 decimals
            discount_amount: Math.round(discountAmount * 100) / 100,
            total: Math.round(total * 100) / 100,
        };
    }

    static calculateTotalUnits(items) {
        if (!Array.isArray(items)) {
            return 0;
        }

        return items.reduce(
            (total, item) => total + (item.quantity * item.pack_size || 0),
            0
        );
    }

    static getAbandonedDuration(updatedAt) {
        if (!updatedAt) {
            return null;
        }

        const now = new Date();
        const updated = new Date(updatedAt);
        const diffMs = now - updated;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor(
            (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
        );

        if (diffDays > 0) {
            return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        }
        if (diffHours > 0) {
            return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        }

        return 'Just now';
    }

    static getDaysSince(date) {
        if (!date) {
            return 0;
        }

        const now = new Date();
        const past = new Date(date);
        const diffMs = now - past;
        return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    }

    static formatPrice(price, format = 'full') {
        if (format === 'short') {
            if (price >= 1000000) {
                return `${(price / 1000000).toFixed(1)}M`;
            }
            if (price >= 1000) {
                return `${(price / 1000).toFixed(0)}k`;
            }
            return price.toString();
        }

        return `${price.toLocaleString('vi-VN')} ₫`;
    }

    static validateCartTotals(cart) {
        const errors = [];

        if (!cart.items || cart.items.length === 0) {
            errors.push('Cart is empty');
        }

        const totals = this.calculateCartTotals(cart.items, cart.discount);
        if (totals.total <= 0) {
            errors.push('Cart total must be greater than 0');
        }

        return {
            isValid: errors.length === 0,
            errors,
            totals,
        };
    }
}

module.exports = CartMapper;
