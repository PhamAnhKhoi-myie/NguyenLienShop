/**
 * Cart DTO Mapper
 * Transform between MongoDB documents and API responses
 * 
 * ✅ Hide internal fields (_id, __v, expired_at, includeExpired)
 * ✅ Expose: id, items, discount, totals, status
 * ✅ Calculate: line_total, subtotal, discount_amount, total (runtime)
 * ✅ Nested: items with denormalized product info + pricing
 */

class CartMapper {
    /**
     * ✅ Convert Mongoose document → API Response DTO (basic)
     * 
     * Dùng cho: Get cart, add/update item returns
     * Include: cart info + items + discount + calculated totals
     * Calculate: line_total per item, subtotal, total
     */
    static toResponseDTO(cart) {
        if (!cart) {
            return null;
        }

        const doc = cart.toObject ? cart.toObject() : cart;

        // ✅ FIX #1: Calculate totals at response time (no stored line_total)
        const totals = this.calculateCartTotals(doc.items, doc.discount);

        return {
            id: doc._id?.toString(),

            // ✅ Identity (hide user_id/session_key from basic response)
            // Include only for authenticated context
            user_id: doc.user_id ? doc.user_id.toString() : null,
            session_key: doc.session_key || null,

            // ✅ Items with line_total calculated
            items: this.transformItems(doc.items || []),

            // ✅ Discount info (if applied)
            discount: doc.discount ? this.transformDiscount(doc.discount) : null,

            // ✅ FIX #2: Totals calculated at response time
            totals: totals,

            // ✅ Status & timestamps
            status: doc.status,
            created_at: doc.created_at,
            updated_at: doc.updated_at,
        };
    }

    /**
     * ✅ Convert to Lightweight DTO (for cart icon/badge)
     * 
     * Dùng cho: Navbar cart badge, quick view
     * Include: minimal info only (item count, total)
     */
    static toSummaryDTO(cart) {
        if (!cart) {
            return null;
        }

        const doc = cart.toObject ? cart.toObject() : cart;

        const totals = this.calculateCartTotals(doc.items, doc.discount);

        return {
            id: doc._id?.toString(),

            // ✅ Summary stats
            item_count: doc.items?.length || 0,
            items_total_units: this.calculateTotalUnits(doc.items || []),

            // ✅ Price summary
            subtotal: totals.subtotal,
            discount_amount: totals.discount_amount,
            total: totals.total,

            // ✅ Status
            status: doc.status,
        };
    }

    /**
     * ✅ Convert to Detail DTO (for checkout page)
     * 
     * Dùng cho: Checkout, order preview
     * Include: full cart details + item breakdown + all pricing
     */
    static toDetailDTO(cart) {
        if (!cart) {
            return null;
        }

        const doc = cart.toObject ? cart.toObject() : cart;

        const totals = this.calculateCartTotals(doc.items, doc.discount);

        return {
            id: doc._id?.toString(),

            // ✅ Identity
            user_id: doc.user_id ? doc.user_id.toString() : null,
            session_key: doc.session_key || null,

            // ✅ Full items detail
            items: this.transformItemsDetailed(doc.items || []),

            // ✅ Discount detail
            discount: doc.discount
                ? {
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

            // ✅ Full totals breakdown
            totals: {
                subtotal: totals.subtotal,
                discount_amount: totals.discount_amount,
                total: totals.total,
                item_count: doc.items?.length || 0,
                items_total_units: this.calculateTotalUnits(doc.items || []),
            },

            // ✅ Order info
            status: doc.status,
            created_at: doc.created_at,
            updated_at: doc.updated_at,
        };
    }

    /**
     * ✅ Convert to Abandoned Cart DTO (for analytics/recovery)
     * 
     * Dùng cho: Admin panel, cart recovery emails
     * Include: full detail + timestamps for recovery logic
     */
    static toAbandonedDTO(cart) {
        if (!cart) {
            return null;
        }

        const doc = cart.toObject ? cart.toObject() : cart;

        const totals = this.calculateCartTotals(doc.items, doc.discount);

        return {
            id: doc._id?.toString(),

            // ✅ Owner info
            user_id: doc.user_id ? doc.user_id.toString() : null,
            session_key: doc.session_key || null,

            // ✅ Items
            items: this.transformItems(doc.items || []),

            // ✅ Discount
            discount: doc.discount ? this.transformDiscount(doc.discount) : null,

            // ✅ Totals
            totals: totals,

            // ✅ Timing (for recovery decision)
            created_at: doc.created_at,
            updated_at: doc.updated_at,
            expired_at: doc.expired_at,
            abandoned_since: this.getAbandonedDuration(doc.updated_at),

            // ✅ Status
            status: doc.status,
        };
    }

    /**
     * ✅ Convert for Order Creation (snapshot)
     * 
     * Dùng cho: Create order from cart
     * Include: all item details + pricing snapshot for order record
     */
    static toOrderSnapshotDTO(cart) {
        if (!cart) {
            return null;
        }

        const doc = cart.toObject ? cart.toObject() : cart;

        const totals = this.calculateCartTotals(doc.items, doc.discount);

        return {
            // ✅ Cart snapshot ID (for reference)
            source_cart_id: doc._id?.toString(),

            // ✅ Items snapshot (exactly as in cart at order time)
            items: (doc.items || []).map((item) => ({
                product_id: item.product_id?.toString(),
                variant_id: item.variant_id?.toString(),
                unit_id: item.unit_id?.toString(),

                // ✅ Denormalized product info (snapshot)
                sku: item.sku,
                variant_label: item.variant_label,
                product_name: item.product_name,
                product_image: item.product_image,
                display_name: item.display_name,
                pack_size: item.pack_size,

                // ✅ Pricing snapshot (at order time)
                price_at_added: item.price_at_added,
                quantity: item.quantity,
                line_total: item.price_at_added * item.quantity,

                // ✅ Calculated per-item info
                total_items: item.quantity * item.pack_size,
                price_per_item: Math.round(
                    (item.price_at_added * item.quantity) / (item.quantity * item.pack_size)
                ),
            })),

            // ✅ Discount snapshot
            discount: doc.discount
                ? {
                    code: doc.discount.code,
                    type: doc.discount.type,
                    value: doc.discount.value,
                    discount_amount: doc.discount.discount_amount,
                }
                : null,

            // ✅ Price snapshot
            totals: {
                subtotal: totals.subtotal,
                discount_amount: totals.discount_amount,
                total: totals.total,
            },

            // ✅ Timestamp (order creation time)
            snapshot_at: new Date(),
        };
    }

    /**
     * ✅ Convert for Admin Dashboard (cart analytics)
     * 
     * Dùng cho: Admin panel, analytics, reports
     * Include: detailed breakdown for analysis
     */
    static toAdminDTO(cart) {
        if (!cart) {
            return null;
        }

        const doc = cart.toObject ? cart.toObject() : cart;

        const totals = this.calculateCartTotals(doc.items, doc.discount);

        return {
            id: doc._id?.toString(),

            // ✅ Owner tracking
            user_id: doc.user_id ? doc.user_id.toString() : null,
            session_key: doc.session_key || null,
            is_guest: !doc.user_id,

            // ✅ Items breakdown
            items: this.transformItemsDetailed(doc.items || []),

            // ✅ Discount info
            discount: doc.discount
                ? {
                    code: doc.discount.code,
                    type: doc.discount.type,
                    value: doc.discount.value,
                    discount_amount: doc.discount.discount_amount,
                }
                : null,

            // ✅ Totals
            totals: {
                subtotal: totals.subtotal,
                discount_amount: totals.discount_amount,
                total: totals.total,
                item_count: doc.items?.length || 0,
                items_total_units: this.calculateTotalUnits(doc.items || []),
            },

            // ✅ Status & lifecycle
            status: doc.status,
            created_at: doc.created_at,
            updated_at: doc.updated_at,
            expired_at: doc.expired_at,

            // ✅ Analytics
            days_since_creation: this.getDaysSince(doc.created_at),
            days_since_update: this.getDaysSince(doc.updated_at),
            is_expired: new Date() > new Date(doc.expired_at),
        };
    }

    /**
     * ✅ Convert array of carts → array of DTOs
     * 
     * Dùng cho: List carts (admin), user carts history
     */
    static toResponseDTOList(carts) {
        if (!Array.isArray(carts)) {
            return [];
        }
        return carts.map((cart) => this.toResponseDTO(cart));
    }

    /**
     * ✅ Convert array of carts → summary DTOs
     * 
     * Dùng cho: User dashboard, cart list view
     */
    static toSummaryDTOList(carts) {
        if (!Array.isArray(carts)) {
            return [];
        }
        return carts.map((cart) => this.toSummaryDTO(cart));
    }

    // ===== HELPERS =====

    /**
     * ✅ Helper: Transform items array (with line_total calculated)
     * 
     * Basic version (for listing)
     */
    static transformItems(items) {
        if (!Array.isArray(items) || items.length === 0) {
            return [];
        }

        return items.map((item) => ({
            id: item._id?.toString(),

            // ✅ Product relationship
            product_id: item.product_id?.toString(),
            variant_id: item.variant_id?.toString(),
            unit_id: item.unit_id?.toString(),

            // ✅ Denormalized product info (snapshot at add time)
            sku: item.sku,
            variant_label: item.variant_label,
            product_name: item.product_name,
            product_image: item.product_image,
            display_name: item.display_name,
            pack_size: item.pack_size,

            // ✅ Pricing snapshot
            price_at_added: item.price_at_added,
            quantity: item.quantity,

            // ✅ FIX #1: Calculate line_total (NOT stored)
            line_total: item.price_at_added * item.quantity,

            // ✅ Timestamp
            added_at: item.added_at,
        }));
    }

    /**
     * ✅ Helper: Transform items array (detailed version)
     * 
     * Detailed version (with calculated per-item info)
     */
    static transformItemsDetailed(items) {
        if (!Array.isArray(items) || items.length === 0) {
            return [];
        }

        return items.map((item) => ({
            id: item._id?.toString(),

            // ✅ Product relationship
            product_id: item.product_id?.toString(),
            variant_id: item.variant_id?.toString(),
            unit_id: item.unit_id?.toString(),

            // ✅ Denormalized info
            sku: item.sku,
            variant_label: item.variant_label,
            product_name: item.product_name,
            product_image: item.product_image,
            display_name: item.display_name,

            // ✅ Quantity breakdown
            pack_size: item.pack_size,
            quantity_packs: item.quantity,
            total_items: item.quantity * item.pack_size,

            // ✅ Pricing breakdown
            price_at_added: item.price_at_added,
            line_total: item.price_at_added * item.quantity,
            price_per_item: Math.round(
                item.price_at_added / item.pack_size
            ),

            // ✅ Timestamp
            added_at: item.added_at,
        }));
    }

    /**
     * ✅ Helper: Transform discount object
     */
    static transformDiscount(discount) {
        if (!discount) {
            return null;
        }

        return {
            code: discount.code,
            type: discount.type,
            value: discount.value,
            discount_amount: discount.discount_amount,
            applied_at: discount.applied_at,
            expires_at: discount.expires_at,
        };
    }

    /**
     * ✅ Helper: Calculate cart totals (subtotal, discount_amount, total)
     * 
     * CRITICAL: This is the ONLY place totals are calculated
     * Always called at response time (no stored totals in DB)
     */
    static calculateCartTotals(items, discount) {
        // ✅ FIX #2: Calculate subtotal from items
        let subtotal = 0;
        if (Array.isArray(items)) {
            subtotal = items.reduce(
                (sum, item) => sum + item.price_at_added * item.quantity,
                0
            );
        }

        // ✅ FIX #3: Get discount amount
        const discountAmount = discount?.discount_amount || 0;

        // ✅ FIX #4: Calculate final total
        const total = Math.max(subtotal - discountAmount, 0);

        return {
            subtotal: Math.round(subtotal * 100) / 100, // Round to 2 decimals
            discount_amount: Math.round(discountAmount * 100) / 100,
            total: Math.round(total * 100) / 100,
        };
    }

    /**
     * ✅ Helper: Calculate total units (cái) in cart
     * 
     * total_units = sum(quantity × pack_size)
     */
    static calculateTotalUnits(items) {
        if (!Array.isArray(items)) {
            return 0;
        }

        return items.reduce(
            (total, item) => total + (item.quantity * item.pack_size || 0),
            0
        );
    }

    /**
     * ✅ Helper: Get abandoned cart duration (for recovery logic)
     * 
     * Example: "Abandoned 2 days ago"
     */
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

    /**
     * ✅ Helper: Get days since date
     * 
     * Used for analytics
     */
    static getDaysSince(date) {
        if (!date) {
            return 0;
        }

        const now = new Date();
        const past = new Date(date);
        const diffMs = now - past;
        return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    }

    /**
     * ✅ Helper: Format price for display
     * 
     * Example: 180000 → "180,000 ₫" or "180k"
     */
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

        // Full format: "180,000 ₫"
        return `${price.toLocaleString('vi-VN')} ₫`;
    }

    /**
     * ✅ Helper: Validate cart totals (for checkout)
     * 
     * Returns: { isValid: boolean, errors: [] }
     */
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