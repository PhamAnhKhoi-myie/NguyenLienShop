const mongoose = require('mongoose');
const Cart = require('./cart.model');
const CartMapper = require('./cart.mapper');
const AppError = require('../../utils/appError.util');

const Product = require('../products/product.model');
const Variant = require('../products/variant.model');
const VariantUnit = require('../products/variant_unit.model');
const VariantUnitService = require('../products/variant_unit.service');
const DiscountService = require('../discounts/discount.service');

/**
 * ============================================
 * CART SERVICE
 * ============================================
 */

class CartService {
    static toDiscountItems(items = []) {
        return items.map((item) => ({
            _id: item._id,
            product_id: item.product_id,
            variant_id: item.variant_id,
            unit_id: item.unit_id,
            category_id: item.category_id,
            sku: item.sku,
            quantity: item.quantity,
            pack_size: item.pack_size,
            price_at_added: item.price_at_added,
            line_total: item.price_at_added * item.quantity,
        }));
    }

    static toCartDiscountSnapshot(validation, itemCount) {
        const type = validation.type === 'percent' ? 'PERCENT' : 'FIXED';
        const applicableCount = validation.applicable_item_ids?.length || 0;

        return {
            discount_id: validation.discount_id,
            code: validation.code,
            type,
            value: validation.original_value,
            discount_amount: Math.round(validation.discount_amount),
            min_purchase: validation.min_order_value || 0,
            max_discount:
                validation.max_discount_amount ||
                validation.original_value ||
                validation.discount_amount,
            apply_scope: applicableCount === itemCount ? 'CART' : 'ITEM',
            applied_at: new Date(),
            expires_at: validation.expires_at,
        };
    }

    static async refreshAppliedDiscount(cart, userId, options = {}) {
        if (!cart?.discount) {
            return cart;
        }

        if (!cart.items || cart.items.length === 0) {
            return await Cart.findByIdAndUpdate(
                cart._id,
                { discount: null, updated_at: new Date() },
                { new: true }
            );
        }

        const totals = CartMapper.calculateCartTotals(cart.items, null);

        try {
            const validation = await DiscountService.validateForCart(
                cart.discount.code,
                totals.subtotal,
                userId,
                this.toDiscountItems(cart.items)
            );

            return await Cart.findByIdAndUpdate(
                cart._id,
                {
                    discount: this.toCartDiscountSnapshot(
                        validation,
                        cart.items.length
                    ),
                    updated_at: new Date(),
                },
                { new: true }
            );
        } catch (error) {
            if (!(error instanceof AppError)) {
                throw error;
            }

            if (options.throwOnInvalid) {
                throw error;
            }

            return await Cart.findByIdAndUpdate(
                cart._id,
                { discount: null, updated_at: new Date() },
                { new: true }
            );
        }
    }

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
            quantity
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

        let cart;
        if (userType === 'user') {
            cart = await Cart.getOrCreateUserCart(userId);
        } else if (userType === 'guest') {
            cart = await Cart.getOrCreateGuestCart(userId);
        } else {
            throw new AppError('Invalid user type', 400, 'INVALID_USER_TYPE');
        }

        const existingItem = cart.items.find(
            (item) => item.unit_id?.toString() === unit_id
        );
        const existingQuantity = existingItem?.quantity || 0;
        const totalQuantity = existingQuantity + quantity;

        if (totalQuantity > 999) {
            throw new AppError(
                'Total quantity cannot exceed 999',
                400,
                'INVALID_QUANTITY'
            );
        }

        const availablePacks = Math.floor(
            variant.stock.available / unit.pack_size
        );

        const itemsNeeded = totalQuantity * unit.pack_size;
        if (variant.stock.available < itemsNeeded) {
            throw new AppError(
                `Only ${availablePacks} packs available`,
                400,
                'INSUFFICIENT_STOCK'
            );
        }

        if (totalQuantity < unit.min_order_qty) {
            throw new AppError(
                `Minimum order quantity is ${unit.min_order_qty} packs`,
                400,
                'MIN_ORDER_NOT_MET'
            );
        }

        if (unit.max_order_qty && totalQuantity > unit.max_order_qty) {
            throw new AppError(
                `Maximum order quantity is ${unit.max_order_qty} packs`,
                400,
                'MAX_ORDER_EXCEEDED'
            );
        }

        const priceCalculation = VariantUnit.calculatePrice(
            quantity,
            unit.price_tiers,
            unit.pack_size
        );

        const maxQuantity = Math.min(
            999,
            availablePacks,
            unit.max_order_qty || 999
        );

        const cartItemData = {
            product_id,
            variant_id,
            unit_id,
            category_id: product.category_id,

            sku: variant.sku,
            variant_label: `${variant.size} - ${variant.fabric_type}`,
            product_name: product.name,
            product_image: product.images?.[0]?.url || null,
            display_name: unit.display_name,
            pack_size: unit.pack_size,

            price_at_added: priceCalculation.unit_price,

            quantity,
            max_quantity: maxQuantity,
        };

        const updatedCart = await Cart.addItemAtomic(cart._id, cartItemData);
        if (!updatedCart) {
            throw new AppError(
                'Cart quantity changed. Please refresh cart and try again',
                409,
                'CART_QUANTITY_CONFLICT'
            );
        }

        const discountAdjustedCart = await this.refreshAppliedDiscount(
            updatedCart,
            userType === 'user' ? userId : null
        );

        return CartMapper.toResponseDTO(discountAdjustedCart);
    }

    static async updateItemQuantity(cartId, itemId, newQuantity, userId) {
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

        const product = await Product.findById(item.product_id);
        if (!product || product.status !== 'ACTIVE') {
            throw new AppError(
                'Product is not available for purchase',
                400,
                'PRODUCT_UNAVAILABLE'
            );
        }

        const variant = await Variant.findById(item.variant_id);
        if (
            !variant ||
            variant.product_id.toString() !== item.product_id.toString()
        ) {
            throw new AppError(
                'Variant is no longer available',
                400,
                'VARIANT_UNAVAILABLE'
            );
        }

        if (variant.status !== 'ACTIVE') {
            throw new AppError(
                'Variant is not available',
                400,
                'VARIANT_UNAVAILABLE'
            );
        }

        const unit = await VariantUnit.findById(item.unit_id);
        if (!unit || unit.variant_id.toString() !== item.variant_id.toString()) {
            throw new AppError(
                'Unit is no longer available',
                400,
                'UNIT_UNAVAILABLE'
            );
        }

        if (newQuantity < unit.min_order_qty) {
            throw new AppError(
                `Minimum order quantity is ${unit.min_order_qty} packs`,
                400,
                'MIN_ORDER_NOT_MET'
            );
        }

        if (unit.max_order_qty && newQuantity > unit.max_order_qty) {
            throw new AppError(
                `Maximum order quantity is ${unit.max_order_qty} packs`,
                400,
                'MAX_ORDER_EXCEEDED'
            );
        }

        const qtyStep = unit.qty_step || 1;
        if (
            qtyStep > 1 &&
            (newQuantity - unit.min_order_qty) % qtyStep !== 0
        ) {
            throw new AppError(
                `Quantity must increase by ${qtyStep} packs`,
                400,
                'QTY_STEP_INVALID'
            );
        }

        const itemsNeeded = newQuantity * unit.pack_size;
        if (variant.stock.available < itemsNeeded) {
            throw new AppError(
                `Only ${Math.floor(variant.stock.available / unit.pack_size)} packs available`,
                400,
                'INSUFFICIENT_STOCK'
            );
        }

        const updatedCart = await Cart.updateItemQuantityAtomic(
            cartId,
            itemId,
            newQuantity
        );

        const discountAdjustedCart = await this.refreshAppliedDiscount(
            updatedCart,
            userId
        );

        return CartMapper.toResponseDTO(discountAdjustedCart);
    }

    static async removeItemFromCart(cartId, itemId, userId) {
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

        const discountAdjustedCart = await this.refreshAppliedDiscount(
            updatedCart,
            userId
        );

        return CartMapper.toResponseDTO(discountAdjustedCart);
    }

    static async applyDiscount(cartId, code, userId) {
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

        const totals = CartMapper.calculateCartTotals(cart.items, null);
        const validation = await DiscountService.validateForCart(
            code,
            totals.subtotal,
            userId,
            this.toDiscountItems(cart.items)
        );

        const updatedCart = await Cart.findByIdAndUpdate(
            cartId,
            {
                discount: this.toCartDiscountSnapshot(
                    validation,
                    cart.items.length
                ),
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
                    (i) =>
                        i.unit_id?.toString() ===
                        guestItem.unit_id?.toString()
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

            const discountAdjustedCart = await this.refreshAppliedDiscount(
                userCart,
                userId
            );

            return CartMapper.toResponseDTO(discountAdjustedCart);
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    static async clearCart(cartId, options = {}, userId) {
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

        if (options.keep_discount) {
            const discountAdjustedCart = await this.refreshAppliedDiscount(
                clearedCart,
                userId
            );

            return CartMapper.toResponseDTO(discountAdjustedCart);
        }

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

    static async checkoutCart(cartId, userId) {
        let cart = await Cart.findById(cartId);
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

        cart = await this.refreshAppliedDiscount(
            cart,
            userId,
            { throwOnInvalid: true }
        );

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
