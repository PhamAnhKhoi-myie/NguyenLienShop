const mongoose = require('mongoose');
const Cart = require('./cart.model');
const CartMapper = require('./cart.mapper');
const AppError = require('../../utils/appError.util');

const Product = require('../products/product.model');
const Variant = require('../products/variant.model');
const VariantUnit = require('../products/variant_unit.model');
const VariantUnitService = require('../products/variant_unit.service');

/**
 * ============================================
 * CART SERVICE
 * ============================================
 */

class CartService {
    static async getUserCart(userId, options = {}) {
        if (!userId) {
            throw new AppError(
                'User ID is required',
                400,
                'MISSING_USER_ID'
            );
        }

        let cart = await Cart.getOrCreateUserCart(userId);

        if (options.extend) {
            cart = await Cart.extendExpiry(cart._id, 7);
        }

        return CartMapper.toResponseDTO(cart);
    }

    static async getGuestCart(sessionKey, options = {}) {
        if (!sessionKey) {
            throw new AppError(
                'Session key is required',
                400,
                'MISSING_SESSION_KEY'
            );
        }

        let cart = await Cart.getOrCreateGuestCart(sessionKey);

        if (options.extend) {
            cart = await Cart.extendExpiry(cart._id, 7);
        }

        return CartMapper.toResponseDTO(cart);
    }

    static async addItemToCart(userId, userType, itemData) {
        const {
            product_id,
            variant_id,
            unit_id,
            quantity,
            ...rest
        } = itemData;

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

    static async updateItemQuantity(cartId, itemId, newQuantity) {
        if (newQuantity < 1 || newQuantity > 999) {
            throw new AppError(
                'Quantity must be between 1 and 999',
                400,
                'INVALID_QUANTITY'
            );
        }

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

        const variant = await Variant.findById(item.variant_id);
        const itemsNeeded = newQuantity * item.pack_size;
        if (variant.stock.available < itemsNeeded) {
            throw new AppError(
                `Only ${Math.floor(variant.stock.available / item.pack_size)} packs available`,
                400,
                'INSUFFICIENT_STOCK'
            );
        }

        const updatedCart = await Cart.updateItemQuantityAtomic(
            cartId,
            itemId,
            newQuantity
        );

        return CartMapper.toResponseDTO(updatedCart);
    }

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

        const updatedCart = await Cart.removeItemAtomic(cartId, itemId);

        return CartMapper.toResponseDTO(updatedCart);
    }

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
            const guestCart = await Cart.findOne(
                { session_key: sessionKey, status: 'ACTIVE' },
                null,
                { session }
            );

            if (!guestCart || guestCart.items.length === 0) {
                const userCart = await Cart.getOrCreateUserCart(userId);
                await session.commitTransaction();
                return CartMapper.toResponseDTO(userCart);
            }

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

            for (const guestItem of guestCart.items) {
                const existingIndex = userCart.items.findIndex(
                    (i) => i.sku === guestItem.sku
                );

                if (existingIndex !== -1) {
                    userCart.items[existingIndex].quantity +=
                        guestItem.quantity;
                } else {
                    userCart.items.push(guestItem);
                }
            }

            if (!userCart.discount && guestCart.discount) {
                userCart.discount = guestCart.discount;
            }

            userCart.updated_at = new Date();
            await userCart.save({ session });

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

    static async clearCart(cartId, options = {}) {
        const cart = await Cart.findById(cartId);
        if (!cart) {
            throw new AppError('Cart not found', 404, 'CART_NOT_FOUND');
        }

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

    static async checkoutCart(cartId) {
        const cart = await Cart.findById(cartId);
        if (!cart) {
            throw new AppError('Cart not found', 404, 'CART_NOT_FOUND');
        }

        if (cart.items.length === 0) {
            throw new AppError(
                'Cannot checkout empty cart',
                400,
                'EMPTY_CART'
            );
        }

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

        if (cart.discount && cart.discount.expires_at) {
            if (new Date() > new Date(cart.discount.expires_at)) {
                throw new AppError(
                    'Applied discount has expired',
                    400,
                    'DISCOUNT_EXPIRED'
                );
            }
        }

        const snapshot = CartMapper.toOrderSnapshotDTO(cart);

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

    static async validateCart(cartId) {
        const cart = await Cart.findById(cartId);
        if (!cart) {
            throw new AppError('Cart not found', 404, 'CART_NOT_FOUND');
        }

        return CartMapper.validateCartTotals(cart);
    }
}

module.exports = CartService;