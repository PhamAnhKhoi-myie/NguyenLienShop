const mongoose = require('mongoose');
const Cart = require('./cart.model');
const CartMapper = require('./cart.mapper');
const AppError = require('../../utils/appError.util');

// Import dependencies
const Product = require('../products/product.model');
const Variant = require('../products/variant.model');
const VariantUnit = require('../products/variant_unit.model');
const VariantUnitService = require('../products/variant_unit.service');

/**
 * ============================================
 * CART SERVICE
 * ============================================
 * 
 * ✅ Static class pattern (consistent with Product/User services)
 * ✅ Business logic layer: validation, stock checks, pricing calculations
 * ✅ Delegates to model for DB operations (atomic updates)
 * ✅ Returns DTOs via mapper (never raw MongoDB docs)
 * ✅ Uses asyncHandler in controller (no try/catch here)
 * 
 * CRITICAL:
 * - Always use atomic operators ($push, $inc) to prevent race conditions
 * - Never read → modify in app → save pattern
 * - Snapshot price at add time (price_at_added immutable)
 * - Calculate totals at response time (no stored line_total)
 */

class CartService {
    /**
     * ✅ GET/CREATE: Get or create cart for user
     * 
     * Called on:
     * - GET /carts (fetch user cart)
     * - POST /carts/items (ensure cart exists)
     * 
     * @param {String} userId - From JWT token
     * @param {Object} options - { extend: true/false }
     * @returns {Object} Cart DTO
     */
    static async getUserCart(userId, options = {}) {
        if (!userId) {
            throw new AppError(
                'User ID is required',
                400,
                'MISSING_USER_ID'
            );
        }

        // ✅ Get or create cart
        let cart = await Cart.getOrCreateUserCart(userId);

        // ✅ Optionally extend expiry (on access)
        if (options.extend) {
            cart = await Cart.extendExpiry(cart._id, 7); // 7 more days
        }

        return CartMapper.toResponseDTO(cart);
    }

    /**
     * ✅ GET/CREATE: Get or create cart for guest (session)
     * 
     * Called on:
     * - POST /carts/guest (create session cart)
     * - GET /carts?session_key=... (fetch guest cart)
     * 
     * @param {String} sessionKey - UUID v4 (client-generated)
     * @param {Object} options - { extend: true/false }
     * @returns {Object} Cart DTO
     */
    static async getGuestCart(sessionKey, options = {}) {
        if (!sessionKey) {
            throw new AppError(
                'Session key is required',
                400,
                'MISSING_SESSION_KEY'
            );
        }

        // ✅ Get or create cart
        let cart = await Cart.getOrCreateGuestCart(sessionKey);

        // ✅ Optionally extend expiry
        if (options.extend) {
            cart = await Cart.extendExpiry(cart._id, 7);
        }

        return CartMapper.toResponseDTO(cart);
    }

    /**
     * ✅ ADD ITEM: Add item to cart (or update quantity if exists)
     * 
     * CRITICAL: Uses atomic $push/$inc to prevent race conditions
     * 
     * Flow:
     * 1. Validate product/variant/unit exist
     * 2. Verify stock available
     * 3. Snapshot product info + price
     * 4. Call Cart.addItemAtomic() (atomic update)
     * 5. Return updated cart
     * 
     * @param {String} userId - User ID or session key (one of)
     * @param {String} userType - 'user' | 'guest'
     * @param {Object} itemData - { product_id, variant_id, unit_id, sku, quantity, ... }
     * @returns {Object} Updated cart DTO
     */
    static async addItemToCart(userId, userType, itemData) {
        const {
            product_id,
            variant_id,
            unit_id,
            quantity,
            ...rest
        } = itemData;

        // ✅ FIX #1: Validate all required IDs
        if (!product_id || !variant_id || !unit_id) {
            throw new AppError(
                'Product ID, variant ID, and unit ID are required',
                400,
                'MISSING_REQUIRED_IDS'
            );
        }

        if (quantity < 1 || quantity > 999) {
            throw new AppError(
                'Quantity must be between 1 and 999',
                400,
                'INVALID_QUANTITY'
            );
        }

        // ✅ FIX #2: Fetch and validate product/variant/unit exist
        const product = await Product.findById(product_id);
        if (!product) {
            throw new AppError(
                'Product not found',
                404,
                'PRODUCT_NOT_FOUND'
            );
        }

        const variant = await Variant.findById(variant_id);
        if (!variant || variant.product_id.toString() !== product_id) {
            throw new AppError(
                'Variant not found or does not belong to product',
                404,
                'VARIANT_NOT_FOUND'
            );
        }

        const unit = await VariantUnit.findById(unit_id);
        if (!unit || unit.variant_id.toString() !== variant_id) {
            throw new AppError(
                'Unit not found or does not belong to variant',
                404,
                'UNIT_NOT_FOUND'
            );
        }

        // ✅ FIX #3: Check product status
        if (product.status !== 'ACTIVE') {
            throw new AppError(
                'Product is not available for purchase',
                400,
                'PRODUCT_UNAVAILABLE'
            );
        }

        if (variant.status !== 'ACTIVE') {
            throw new AppError(
                'Variant is not available',
                400,
                'VARIANT_UNAVAILABLE'
            );
        }

        // ✅ FIX #4: Check stock availability
        // quantity = number of packs
        const itemsNeeded = quantity * unit.pack_size;
        if (variant.stock.available < itemsNeeded) {
            throw new AppError(
                `Only ${Math.floor(variant.stock.available / unit.pack_size)} packs available`,
                400,
                'INSUFFICIENT_STOCK'
            );
        }

        // ✅ FIX #5: Check order quantity constraints
        if (quantity < unit.min_order_qty) {
            throw new AppError(
                `Minimum order quantity is ${unit.min_order_qty} packs`,
                400,
                'MIN_ORDER_NOT_MET'
            );
        }

        if (unit.max_order_qty && quantity > unit.max_order_qty) {
            throw new AppError(
                `Maximum order quantity is ${unit.max_order_qty} packs`,
                400,
                'MAX_ORDER_EXCEEDED'
            );
        }

        // ✅ FIX #6: Get cart
        let cart;
        if (userType === 'user') {
            cart = await Cart.getOrCreateUserCart(userId);
        } else if (userType === 'guest') {
            cart = await Cart.getOrCreateGuestCart(userId);
        } else {
            throw new AppError('Invalid user type', 400, 'INVALID_USER_TYPE');
        }

        // ✅ FIX #7: Calculate price from unit's price tiers
        // Get price for this quantity
        const priceCalculation = VariantUnit.calculatePrice(
            quantity,
            unit.price_tiers,
            unit.pack_size
        );

        // ✅ FIX #8: Prepare item data for snapshot
        const cartItemData = {
            product_id,
            variant_id,
            unit_id,

            // Denormalized snapshot
            sku: variant.sku,
            variant_label: rest.variant_label || `${variant.size} - ${variant.fabric_type}`,
            product_name: product.name,
            product_image: product.images?.[0]?.url || null,
            display_name: rest.display_name || unit.display_name,
            pack_size: unit.pack_size,

            // Price snapshot at add time
            price_at_added: priceCalculation.unit_price,

            // Quantity
            quantity,
        };

        // ✅ FIX #9: Use atomic update to prevent race conditions
        const updatedCart = await Cart.addItemAtomic(cart._id, cartItemData);

        return CartMapper.toResponseDTO(updatedCart);
    }

    /**
     * ✅ UPDATE ITEM: Update item quantity only
     * 
     * ⚠️ Cannot update price (snapshot is immutable)
     * 
     * @param {String} cartId
     * @param {String} itemId
     * @param {Number} newQuantity
     * @returns {Object} Updated cart DTO
     */
    static async updateItemQuantity(cartId, itemId, newQuantity) {
        if (newQuantity < 1 || newQuantity > 999) {
            throw new AppError(
                'Quantity must be between 1 and 999',
                400,
                'INVALID_QUANTITY'
            );
        }

        // ✅ Get current item to verify it exists
        const cart = await Cart.findById(cartId);
        if (!cart) {
            throw new AppError('Cart not found', 404, 'CART_NOT_FOUND');
        }

        const item = cart.items.id(itemId);
        if (!item) {
            throw new AppError(
                'Item not found in cart',
                404,
                'ITEM_NOT_FOUND'
            );
        }

        // ✅ Verify stock for new quantity
        const variant = await Variant.findById(item.variant_id);
        const itemsNeeded = newQuantity * item.pack_size;
        if (variant.stock.available < itemsNeeded) {
            throw new AppError(
                `Only ${Math.floor(variant.stock.available / item.pack_size)} packs available`,
                400,
                'INSUFFICIENT_STOCK'
            );
        }

        // ✅ Atomic update
        const updatedCart = await Cart.updateItemQuantityAtomic(
            cartId,
            itemId,
            newQuantity
        );

        return CartMapper.toResponseDTO(updatedCart);
    }

    /**
     * ✅ REMOVE ITEM: Remove item from cart
     * 
     * @param {String} cartId
     * @param {String} itemId
     * @returns {Object} Updated cart DTO
     */
    static async removeItemFromCart(cartId, itemId) {
        const cart = await Cart.findById(cartId);
        if (!cart) {
            throw new AppError('Cart not found', 404, 'CART_NOT_FOUND');
        }

        const item = cart.items.id(itemId);
        if (!item) {
            throw new AppError(
                'Item not found in cart',
                404,
                'ITEM_NOT_FOUND'
            );
        }

        // ✅ Atomic remove
        const updatedCart = await Cart.removeItemAtomic(cartId, itemId);

        return CartMapper.toResponseDTO(updatedCart);
    }

    /**
     * ✅ APPLY DISCOUNT: Apply promo code to cart
     * 
     * Flow:
     * 1. Validate promo code format
     * 2. Fetch promo code from DB
     * 3. Verify: not expired, min_purchase met, not already applied
     * 4. Calculate discount_amount
     * 5. Update cart.discount
     * 
     * ⚠️ NOTE: PromoCode model not yet implemented
     * For now, assume promo validation done in separate service
     * 
     * @param {String} cartId
     * @param {String} code - Promo code
     * @returns {Object} Updated cart DTO
     */
    static async applyDiscount(cartId, code) {
        const cart = await Cart.findById(cartId);
        if (!cart) {
            throw new AppError('Cart not found', 404, 'CART_NOT_FOUND');
        }

        if (cart.items.length === 0) {
            throw new AppError(
                'Cannot apply discount to empty cart',
                400,
                'EMPTY_CART'
            );
        }

        // ✅ TODO: Fetch PromoCode from DB
        // const promo = await PromoCode.findOne({ code: code.toUpperCase() });
        // if (!promo) {
        //     throw new AppError('Invalid promo code', 400, 'INVALID_PROMO');
        // }
        // if (new Date() > promo.expires_at) {
        //     throw new AppError('Promo code expired', 400, 'PROMO_EXPIRED');
        // }

        // Temporary mock for demonstration
        const promo = {
            code: code.toUpperCase(),
            type: 'PERCENT',
            value: 10,
            min_purchase: 500000,
            max_discount: 100000,
            apply_scope: 'CART',
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        };

        // ✅ Calculate subtotal
        const totals = CartMapper.calculateCartTotals(cart.items, null);
        const subtotal = totals.subtotal;

        // ✅ Verify minimum purchase
        if (subtotal < promo.min_purchase) {
            throw new AppError(
                `Minimum purchase ${promo.min_purchase} VND required`,
                400,
                'MIN_PURCHASE_NOT_MET'
            );
        }

        // ✅ Calculate discount amount
        let discountAmount =
            promo.type === 'PERCENT'
                ? (subtotal * promo.value) / 100
                : promo.value;

        // Cap by max_discount
        discountAmount = Math.min(discountAmount, promo.max_discount);

        // ✅ Update cart with discount
        const updatedCart = await Cart.findByIdAndUpdate(
            cartId,
            {
                discount: {
                    code: promo.code,
                    type: promo.type,
                    value: promo.value,
                    discount_amount: Math.round(discountAmount),
                    min_purchase: promo.min_purchase,
                    max_discount: promo.max_discount,
                    apply_scope: promo.apply_scope,
                    applied_at: new Date(),
                    expires_at: promo.expires_at,
                },
                updated_at: new Date(),
            },
            { new: true }
        );

        return CartMapper.toResponseDTO(updatedCart);
    }

    /**
     * ✅ REMOVE DISCOUNT: Remove applied discount from cart
     * 
     * @param {String} cartId
     * @returns {Object} Updated cart DTO
     */
    static async removeDiscount(cartId) {
        const cart = await Cart.findById(cartId);
        if (!cart) {
            throw new AppError('Cart not found', 404, 'CART_NOT_FOUND');
        }

        if (!cart.discount) {
            throw new AppError(
                'No discount applied to this cart',
                400,
                'NO_DISCOUNT'
            );
        }

        // ✅ Remove discount
        const updatedCart = await Cart.findByIdAndUpdate(
            cartId,
            {
                discount: null,
                updated_at: new Date(),
            },
            { new: true }
        );

        return CartMapper.toResponseDTO(updatedCart);
    }

    /**
     * ✅ MERGE CART: Merge guest cart to user cart (on login)
     * 
     * Flow:
     * 1. Fetch guest cart (by session_key)
     * 2. Fetch or create user cart
     * 3. Merge items (upsert by SKU)
     * 4. Inherit discount if user cart empty
     * 5. Delete guest cart (or mark ABANDONED)
     * 
     * CRITICAL: Use MongoDB transaction for atomicity
     * 
     * @param {String} sessionKey - UUID (guest cart identifier)
     * @param {String} userId - User ID (after login)
     * @returns {Object} Merged cart DTO
     */
    static async mergeGuestCartToUser(sessionKey, userId) {
        if (!sessionKey || !userId) {
            throw new AppError(
                'Session key and user ID required',
                400,
                'MISSING_REQUIRED_PARAMS'
            );
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // ✅ 1. Fetch guest cart
            const guestCart = await Cart.findOne(
                { session_key: sessionKey, status: 'ACTIVE' },
                null,
                { session }
            );

            // If no guest cart or empty, just return user cart
            if (!guestCart || guestCart.items.length === 0) {
                const userCart = await Cart.getOrCreateUserCart(userId);
                await session.commitTransaction();
                return CartMapper.toResponseDTO(userCart);
            }

            // ✅ 2. Get or create user cart
            let userCart = await Cart.findOne(
                { user_id: userId, status: 'ACTIVE' },
                null,
                { session }
            );

            if (!userCart) {
                userCart = new Cart({
                    user_id: userId,
                    items: [],
                    status: 'ACTIVE',
                    expired_at: new Date(
                        Date.now() + 7 * 24 * 60 * 60 * 1000
                    ),
                });
                await userCart.save({ session });
            }

            // ✅ 3. Merge items (upsert by SKU)
            for (const guestItem of guestCart.items) {
                const existingIndex = userCart.items.findIndex(
                    (i) => i.sku === guestItem.sku
                );

                if (existingIndex !== -1) {
                    // Update existing item quantity
                    userCart.items[existingIndex].quantity +=
                        guestItem.quantity;
                } else {
                    // Add new item
                    userCart.items.push(guestItem);
                }
            }

            // ✅ 4. Inherit guest discount if user cart has none
            if (!userCart.discount && guestCart.discount) {
                userCart.discount = guestCart.discount;
            }

            // ✅ 5. Save merged user cart
            userCart.updated_at = new Date();
            await userCart.save({ session });

            // ✅ 6. Mark guest cart as abandoned (or delete)
            await Cart.updateOne(
                { _id: guestCart._id },
                { status: 'ABANDONED' },
                { session }
            );

            await session.commitTransaction();
            return CartMapper.toResponseDTO(userCart);
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * ✅ CLEAR CART: Remove all items from cart
     * 
     * @param {String} cartId
     * @param {Object} options - { keep_discount: false }
     * @returns {Object} Cleared cart DTO
     */
    static async clearCart(cartId, options = {}) {
        const cart = await Cart.findById(cartId);
        if (!cart) {
            throw new AppError('Cart not found', 404, 'CART_NOT_FOUND');
        }

        // ✅ Clear items, optionally keep discount
        const updateData = {
            items: [],
            updated_at: new Date(),
        };

        if (!options.keep_discount) {
            updateData.discount = null;
        }

        const clearedCart = await Cart.findByIdAndUpdate(
            cartId,
            updateData,
            { new: true }
        );

        return CartMapper.toResponseDTO(clearedCart);
    }

    /**
     * ✅ ABANDON CART: Explicitly mark cart as abandoned
     * 
     * Called when user clears cart or navigates away
     * 
     * @param {String} cartId
     * @returns {Object} Abandoned cart info
     */
    static async abandonCart(cartId) {
        const cart = await Cart.findById(cartId);
        if (!cart) {
            throw new AppError('Cart not found', 404, 'CART_NOT_FOUND');
        }

        const abandonedCart = await Cart.findByIdAndUpdate(
            cartId,
            { status: 'ABANDONED', updated_at: new Date() },
            { new: true }
        );

        return CartMapper.toAbandonedDTO(abandonedCart);
    }

    /**
     * ✅ CHECKOUT: Validate cart + create order snapshot
     * 
     * Flow:
     * 1. Validate cart not empty
     * 2. Validate all items have stock
     * 3. Verify no expired discounts
     * 4. Create order snapshot
     * 5. Lock cart (mark CHECKED_OUT)
     * 
     * @param {String} cartId
     * @returns {Object} Checkout snapshot (for order creation)
     */
    static async checkoutCart(cartId) {
        const cart = await Cart.findById(cartId);
        if (!cart) {
            throw new AppError('Cart not found', 404, 'CART_NOT_FOUND');
        }

        // ✅ Validate not empty
        if (cart.items.length === 0) {
            throw new AppError(
                'Cannot checkout empty cart',
                400,
                'EMPTY_CART'
            );
        }

        // ✅ Validate all items have stock (re-check before checkout)
        for (const item of cart.items) {
            const variant = await Variant.findById(item.variant_id);
            if (!variant) {
                throw new AppError(
                    `Product no longer available`,
                    400,
                    'PRODUCT_UNAVAILABLE'
                );
            }

            const itemsNeeded = item.quantity * item.pack_size;
            if (variant.stock.available < itemsNeeded) {
                throw new AppError(
                    `Stock changed for ${item.product_name}. Only ${Math.floor(variant.stock.available / item.pack_size)} packs available.`,
                    400,
                    'STOCK_CHANGED'
                );
            }
        }

        // ✅ Validate discount not expired
        if (cart.discount && cart.discount.expires_at) {
            if (new Date() > new Date(cart.discount.expires_at)) {
                throw new AppError(
                    'Applied discount has expired',
                    400,
                    'DISCOUNT_EXPIRED'
                );
            }
        }

        // ✅ Create snapshot for order
        const snapshot = CartMapper.toOrderSnapshotDTO(cart);

        // ✅ Mark cart as checked out
        await Cart.findByIdAndUpdate(cartId, {
            status: 'CHECKED_OUT',
            checked_out_at: new Date(),
            updated_at: new Date(),
        });

        return {
            ...snapshot,
            cart_id: cartId,
        };
    }

    /**
     * ✅ GET ABANDONED CARTS: For admin/recovery emails
     * 
     * @param {Number} daysAgo - Abandoned for > N days
     * @param {Number} limit
     * @returns {Array} Abandoned carts
     */
    static async getAbandonedCarts(daysAgo = 7, limit = 100) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

        const carts = await Cart.find({
            status: 'ABANDONED',
            updated_at: { $lt: cutoffDate },
        })
            .limit(limit)
            .sort({ updated_at: -1 });

        return carts.map(CartMapper.toAbandonedDTO);
    }

    /**
     * ✅ VALIDATE CART: For checkout validation
     * 
     * Returns detailed validation errors
     * 
     * @param {String} cartId
     * @returns {Object} { isValid, errors, totals }
     */
    static async validateCart(cartId) {
        const cart = await Cart.findById(cartId);
        if (!cart) {
            throw new AppError('Cart not found', 404, 'CART_NOT_FOUND');
        }

        return CartMapper.validateCartTotals(cart);
    }
}

module.exports = CartService;