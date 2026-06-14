const mongoose = require('mongoose');
const Cart = require('./cart.model');
const CartMapper = require('./cart.mapper');
const AppError = require('../../utils/appError.util');

const Product = require('../products/product.model');
const Variant = require('../products/variant.model');
const VariantUnit = require('../products/variant_unit.model');
const VariantUnitService = require('../products/variant_unit.service');
const DiscountService = require('../discounts/discount.service');
const CartAuditLogService = require('../audit_logs/cart_audit_log/cart_log.service');
const { AUDIT_ACTIONS } = require('../../constants/audit');







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
            voucher_allowed: item.voucher_allowed !== false,
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
                {
                    new: true,
                    session: options.session,
                    includeExpired: true,
                }
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
                {
                    new: true,
                    session: options.session,
                    includeExpired: true,
                }
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
                {
                    new: true,
                    session: options.session,
                    includeExpired: true,
                }
            );
        }
    }

    static async repriceCart(cart, options = {}) {
        if (!cart?.items?.length) {
            return cart;
        }

        const unitIds = [
            ...new Set(cart.items.map((item) => item.unit_id.toString())),
        ];
        const query = VariantUnit.find({ _id: { $in: unitIds } });
        if (options.session) {
            query.session(options.session);
        }

        const units = await query;
        const unitsById = new Map(
            units.map((unit) => [unit._id.toString(), unit])
        );

        let pricingChanged = false;

        for (const item of cart.items) {
            const unit = unitsById.get(item.unit_id.toString());
            if (
                !unit ||
                unit.variant_id.toString() !== item.variant_id.toString()
            ) {
                throw new AppError(
                    `Unit is no longer available for ${item.product_name}`,
                    400,
                    'UNIT_UNAVAILABLE'
                );
            }

            if (
                item.quantity < 1 ||
                item.quantity > 999 ||
                item.quantity < unit.min_order_qty ||
                (unit.max_order_qty &&
                    item.quantity > unit.max_order_qty)
            ) {
                throw new AppError(
                    `Quantity is no longer valid for ${item.product_name}`,
                    400,
                    'INVALID_QUANTITY'
                );
            }

            const qtyStep = unit.qty_step || 1;
            if (
                qtyStep > 1 &&
                (item.quantity - unit.min_order_qty) % qtyStep !== 0
            ) {
                throw new AppError(
                    `Quantity step is no longer valid for ${item.product_name}`,
                    400,
                    'QTY_STEP_INVALID'
                );
            }

            const pricing = VariantUnit.calculatePrice(
                item.quantity,
                unit.price_tiers,
                unit.pack_size,
                unit.promotion
            );

            if (
                item.price_at_added !== pricing.unit_price ||
                item.original_price_at_added !==
                    pricing.original_unit_price ||
                item.promotion_discount_amount !==
                    pricing.promotion_discount_amount ||
                item.promotion_discount_percent !==
                    pricing.promotion_discount_percent ||
                item.is_on_sale !== pricing.is_on_sale ||
                item.voucher_allowed !== pricing.voucher_allowed ||
                item.pack_size !== unit.pack_size ||
                item.display_name !== unit.display_name
            ) {
                pricingChanged = true;
                item.price_at_added = pricing.unit_price;
                item.original_price_at_added =
                    pricing.original_unit_price;
                item.promotion_discount_amount =
                    pricing.promotion_discount_amount;
                item.promotion_discount_percent =
                    pricing.promotion_discount_percent;
                item.is_on_sale = pricing.is_on_sale;
                item.voucher_allowed = pricing.voucher_allowed;
                item.pack_size = unit.pack_size;
                item.display_name = unit.display_name;
            }
        }

        if (pricingChanged) {
            cart.updated_at = new Date();
            await cart.save({ session: options.session });
        }

        return cart;
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

        cart = await this.repriceCart(cart);
        cart = await this.refreshAppliedDiscount(cart, userId);

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

        cart = await this.repriceCart(cart);
        cart = await this.refreshAppliedDiscount(cart, null);

        return CartMapper.toResponseDTO(cart);
    }

    static async getExistingGuestCart(sessionKey, options = {}) {
        if (!sessionKey) {
            throw new AppError(
                'Session key is required',
                400,
                'MISSING_SESSION_KEY'
            );
        }

        let cart = await Cart.findOne(
            { session_key: sessionKey, status: 'ACTIVE' },
            null,
            { includeExpired: true }
        );

        if (!cart) {
            throw new AppError('Cart not found', 404, 'CART_NOT_FOUND');
        }

        if (options.extend) {
            cart = await Cart.extendExpiry(cart._id, 7);
        }

        cart = await this.repriceCart(cart);
        cart = await this.refreshAppliedDiscount(cart, null);

        return CartMapper.toResponseDTO(cart);
    }

    static async addItemToCart(userId, userType, itemData, metadata = {}) {
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
        const beforeCart = cart.toObject();

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
            totalQuantity,
            unit.price_tiers,
            unit.pack_size,
            unit.promotion
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
            original_price_at_added:
                priceCalculation.original_unit_price,
            promotion_discount_amount:
                priceCalculation.promotion_discount_amount,
            promotion_discount_percent:
                priceCalculation.promotion_discount_percent,
            is_on_sale: priceCalculation.is_on_sale,
            voucher_allowed: priceCalculation.voucher_allowed,

            quantity,
            max_quantity: maxQuantity,
            expected_quantity: existingQuantity,
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
        const afterItem = discountAdjustedCart.items.find(
            (item) => item.unit_id?.toString() === unit_id
        );

        await this._createCartAuditLog({
            action: AUDIT_ACTIONS.ADD_CART_ITEM,
            cart: discountAdjustedCart,
            actorId: userType === 'user' ? userId : null,
            actorType: userType === 'user' ? 'USER' : 'GUEST',
            metadata,
            changes: {
                item: {
                    from: this._summarizeCartItem(existingItem),
                    to: this._summarizeCartItem(afterItem),
                },
                quantity: {
                    from: existingQuantity,
                    to: afterItem?.quantity || totalQuantity,
                },
                item_count: {
                    from: beforeCart.items?.length || 0,
                    to: discountAdjustedCart.items?.length || 0,
                },
                discount: {
                    from: this._summarizeDiscount(beforeCart.discount),
                    to: this._summarizeDiscount(discountAdjustedCart.discount),
                },
                totals: {
                    from: this._summarizeTotals(beforeCart),
                    to: this._summarizeTotals(discountAdjustedCart),
                },
            },
        });

        return CartMapper.toResponseDTO(discountAdjustedCart);
    }

    static async updateItemQuantity(
        cartId,
        itemId,
        newQuantity,
        userId,
        metadata = {},
        actorType = userId ? 'USER' : 'GUEST'
    ) {
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
        const beforeCart = cart.toObject();
        const beforeItem = item.toObject ? item.toObject() : item;

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

        const priceCalculation = VariantUnit.calculatePrice(
            newQuantity,
            unit.price_tiers,
            unit.pack_size,
            unit.promotion
        );

        const updatedCart = await Cart.updateItemQuantityAtomic(
            cartId,
            itemId,
            newQuantity,
            priceCalculation.unit_price,
            item.quantity,
            priceCalculation
        );
        if (!updatedCart) {
            throw new AppError(
                'Cart quantity changed. Please refresh cart and try again',
                409,
                'CART_QUANTITY_CONFLICT'
            );
        }

        const discountAdjustedCart = await this.refreshAppliedDiscount(
            updatedCart,
            userId
        );
        const afterItem = discountAdjustedCart.items.id(itemId);

        await this._createCartAuditLog({
            action: AUDIT_ACTIONS.UPDATE_CART_ITEM_QUANTITY,
            cart: discountAdjustedCart,
            actorId: userId,
            actorType,
            metadata,
            changes: {
                item: {
                    from: this._summarizeCartItem(beforeItem),
                    to: this._summarizeCartItem(afterItem),
                },
                quantity: {
                    from: beforeItem.quantity,
                    to: afterItem?.quantity || newQuantity,
                },
                discount: {
                    from: this._summarizeDiscount(beforeCart.discount),
                    to: this._summarizeDiscount(discountAdjustedCart.discount),
                },
                totals: {
                    from: this._summarizeTotals(beforeCart),
                    to: this._summarizeTotals(discountAdjustedCart),
                },
            },
        });

        return CartMapper.toResponseDTO(discountAdjustedCart);
    }

    static async removeItemFromCart(
        cartId,
        itemId,
        userId,
        metadata = {},
        actorType = userId ? 'USER' : 'GUEST'
    ) {
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
        const beforeCart = cart.toObject();
        const removedItem = item.toObject ? item.toObject() : item;

        const updatedCart = await Cart.removeItemAtomic(cartId, itemId);

        const discountAdjustedCart = await this.refreshAppliedDiscount(
            updatedCart,
            userId
        );

        await this._createCartAuditLog({
            action: AUDIT_ACTIONS.REMOVE_CART_ITEM,
            cart: discountAdjustedCart,
            actorId: userId,
            actorType,
            metadata,
            changes: {
                item: {
                    from: this._summarizeCartItem(removedItem),
                    to: null,
                },
                quantity: {
                    from: removedItem.quantity,
                    to: 0,
                },
                item_count: {
                    from: beforeCart.items?.length || 0,
                    to: discountAdjustedCart.items?.length || 0,
                },
                discount: {
                    from: this._summarizeDiscount(beforeCart.discount),
                    to: this._summarizeDiscount(discountAdjustedCart.discount),
                },
                totals: {
                    from: this._summarizeTotals(beforeCart),
                    to: this._summarizeTotals(discountAdjustedCart),
                },
            },
        });

        return CartMapper.toResponseDTO(discountAdjustedCart);
    }

    static async applyDiscount(cartId, code, userId, metadata = {}) {
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

        await this._createCartAuditLog({
            action: AUDIT_ACTIONS.APPLY_CART_DISCOUNT,
            cart: updatedCart,
            actorId: userId,
            metadata,
            changes: {
                discount: {
                    from: this._summarizeDiscount(cart.discount),
                    to: this._summarizeDiscount(updatedCart.discount),
                },
                totals: {
                    from: this._summarizeTotals(cart),
                    to: this._summarizeTotals(updatedCart),
                },
            },
        });

        return CartMapper.toResponseDTO(updatedCart);

    }

    static async removeDiscount(cartId, userId = null, metadata = {}) {
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

        await this._createCartAuditLog({
            action: AUDIT_ACTIONS.REMOVE_CART_DISCOUNT,
            cart: updatedCart,
            actorId: userId,
            metadata,
            changes: {
                discount: {
                    from: this._summarizeDiscount(cart.discount),
                    to: null,
                },
                totals: {
                    from: this._summarizeTotals(cart),
                    to: this._summarizeTotals(updatedCart),
                },
            },
        });

        return CartMapper.toResponseDTO(updatedCart);
    }

    static async mergeGuestCartToUser(sessionKey, userId, metadata = {}) {
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
            let mergeAuditContext = null;
            const guestCart = await Cart.findOne(
                { session_key: sessionKey, status: 'ACTIVE' },
                null,
                { session }
            );

            if (!guestCart || guestCart.items.length === 0) {
                const userCart = await Cart.getOrCreateUserCart(userId);
                mergeAuditContext = {
                    sourceCart: guestCart,
                    sourceSessionKey: sessionKey,
                    sourceStatusFrom: guestCart?.status || null,
                    sourceStatusTo: guestCart?.status || null,
                    beforeUserCart: userCart.toObject(),
                    mergedItemsCount: 0,
                };
                await session.commitTransaction();
                await this._createCartAuditLog({
                    action: AUDIT_ACTIONS.MERGE_CART,
                    cart: userCart,
                    actorId: userId,
                    sourceCart: mergeAuditContext.sourceCart,
                    sourceSessionKey: mergeAuditContext.sourceSessionKey,
                    metadata,
                    changes: this._buildMergeChanges(
                        mergeAuditContext,
                        userCart
                    ),
                });
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

            const beforeUserCart = userCart.toObject();

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
            userCart = await this.repriceCart(userCart, { session });

            await Cart.updateOne(
                { _id: guestCart._id },
                { status: 'ABANDONED' },
                { session }
            );

            mergeAuditContext = {
                sourceCart: {
                    ...guestCart.toObject(),
                    status: 'ABANDONED',
                },
                sourceSessionKey: sessionKey,
                sourceStatusFrom: guestCart.status,
                sourceStatusTo: 'ABANDONED',
                beforeUserCart,
                mergedItemsCount: guestCart.items.length,
            };

            await session.commitTransaction();

            const discountAdjustedCart = await this.refreshAppliedDiscount(
                userCart,
                userId
            );

            await this._createCartAuditLog({
                action: AUDIT_ACTIONS.MERGE_CART,
                cart: discountAdjustedCart,
                actorId: userId,
                sourceCart: mergeAuditContext.sourceCart,
                sourceSessionKey: mergeAuditContext.sourceSessionKey,
                metadata,
                changes: this._buildMergeChanges(
                    mergeAuditContext,
                    discountAdjustedCart
                ),
            });

            return CartMapper.toResponseDTO(discountAdjustedCart);
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    static async clearCart(
        cartId,
        options = {},
        userId,
        metadata = {},
        actorType = userId ? 'USER' : 'GUEST'
    ) {
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

            await this._createCartAuditLog({
                action: AUDIT_ACTIONS.CLEAR_CART,
                cart: discountAdjustedCart,
                actorId: userId,
                actorType,
                metadata,
                changes: this._buildClearChanges(
                    cart,
                    discountAdjustedCart,
                    options
                ),
            });

            return CartMapper.toResponseDTO(discountAdjustedCart);
        }

        await this._createCartAuditLog({
            action: AUDIT_ACTIONS.CLEAR_CART,
            cart: clearedCart,
            actorId: userId,
            actorType,
            metadata,
            changes: this._buildClearChanges(cart, clearedCart, options),
        });

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

    static async checkoutCart(cartId, userId, metadata = {}) {
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

        cart = await this.repriceCart(cart);
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

        const before = cart.toObject();
        const snapshot = CartMapper.toOrderSnapshotDTO(cart);

        const checkedOutCart = await Cart.findByIdAndUpdate(
            cartId,
            {
                status: 'CHECKED_OUT',
                checked_out_at: new Date(),
                updated_at: new Date(),
            },
            { new: true, includeExpired: true }
        );

        await this._createCartAuditLog({
            action: AUDIT_ACTIONS.CHECKOUT_CART,
            cart: checkedOutCart,
            actorId: userId,
            metadata,
            changes: {
                status: {
                    from: before.status,
                    to: checkedOutCart.status,
                },
                checked_out_at: {
                    from: before.checked_out_at || null,
                    to: checkedOutCart.checked_out_at || null,
                },
                totals: {
                    from: this._summarizeTotals(before),
                    to: this._summarizeTotals(checkedOutCart),
                },
                discount: {
                    from: this._summarizeDiscount(before.discount),
                    to: this._summarizeDiscount(checkedOutCart.discount),
                },
            },
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

    static _summarizeDiscount(discount) {
        if (!discount) {
            return null;
        }

        return {
            discount_id: discount.discount_id || null,
            code: discount.code || null,
            type: discount.type || null,
            value: discount.value || 0,
            discount_amount: discount.discount_amount || 0,
            apply_scope: discount.apply_scope || null,
            applied_at: discount.applied_at || null,
            expires_at: discount.expires_at || null,
        };
    }

    static _summarizeTotals(cart) {
        const totals = CartMapper.calculateCartTotals(
            cart?.items || [],
            cart?.discount || null
        );

        return {
            ...totals,
            item_count: cart?.items?.length || 0,
            items_total_units: CartMapper.calculateTotalUnits(cart?.items || []),
        };
    }

    static _summarizeCartItem(item) {
        if (!item) {
            return null;
        }

        return {
            item_id: item._id || null,
            product_id: item.product_id || null,
            variant_id: item.variant_id || null,
            unit_id: item.unit_id || null,
            category_id: item.category_id || null,
            sku: item.sku || null,
            product_name: item.product_name || null,
            variant_label: item.variant_label || null,
            display_name: item.display_name || null,
            pack_size: item.pack_size || 0,
            price_at_added: item.price_at_added || 0,
            original_price_at_added:
                item.original_price_at_added ||
                item.price_at_added ||
                0,
            promotion_discount_amount:
                item.promotion_discount_amount || 0,
            promotion_discount_percent:
                item.promotion_discount_percent || 0,
            is_on_sale: Boolean(item.is_on_sale),
            quantity: item.quantity || 0,
        };
    }

    static _buildMergeChanges(context, afterCart) {
        const beforeCart = context.beforeUserCart || null;

        return {
            source_session_key: {
                from: null,
                to: context.sourceSessionKey || null,
            },
            source_cart_status: {
                from: context.sourceStatusFrom || null,
                to: context.sourceStatusTo || null,
            },
            merged_items_count: {
                from: 0,
                to: context.mergedItemsCount || 0,
            },
            target_item_count: {
                from: beforeCart?.items?.length || 0,
                to: afterCart?.items?.length || 0,
            },
            target_totals: {
                from: this._summarizeTotals(beforeCart),
                to: this._summarizeTotals(afterCart),
            },
            discount: {
                from: this._summarizeDiscount(beforeCart?.discount),
                to: this._summarizeDiscount(afterCart?.discount),
            },
        };
    }

    static _buildClearChanges(beforeCart, afterCart, options = {}) {
        return {
            keep_discount: {
                from: null,
                to: Boolean(options.keep_discount),
            },
            item_count: {
                from: beforeCart?.items?.length || 0,
                to: afterCart?.items?.length || 0,
            },
            items_total_units: {
                from: CartMapper.calculateTotalUnits(beforeCart?.items || []),
                to: CartMapper.calculateTotalUnits(afterCart?.items || []),
            },
            discount: {
                from: this._summarizeDiscount(beforeCart?.discount),
                to: this._summarizeDiscount(afterCart?.discount),
            },
            totals: {
                from: this._summarizeTotals(beforeCart),
                to: this._summarizeTotals(afterCart),
            },
        };
    }

    static _toAuditValue(value) {
        if (value === undefined || value === null) {
            return null;
        }
        if (value instanceof Date) {
            return value.toISOString();
        }
        if (value instanceof mongoose.Types.ObjectId) {
            return value.toString();
        }
        if (Array.isArray(value)) {
            return value.map((item) => this._toAuditValue(item));
        }
        if (value?.toObject) {
            return this._toAuditValue(value.toObject());
        }
        if (typeof value === 'object') {
            return Object.fromEntries(
                Object.entries(value).map(([key, item]) => [
                    key,
                    this._toAuditValue(item),
                ])
            );
        }

        return value;
    }

    static async _createCartAuditLog({
        action,
        cart,
        actorId = null,
        actorType = 'USER',
        sourceCart = null,
        sourceSessionKey = null,
        metadata = {},
        changes = {},
    }) {
        await CartAuditLogService.createLog({
            actor_id: actorId,
            actor_type: actorType,
            action,
            cart_id: cart._id,
            source_cart_id: sourceCart?._id || null,
            user_id: cart.user_id || actorId || null,
            session_key: cart.session_key || null,
            source_session_key: sourceSessionKey || sourceCart?.session_key || null,
            status: cart.status || null,
            discount_code: cart.discount?.code || null,
            changes: this._toAuditValue(changes),
            ip_address: metadata.ip || null,
            user_agent: metadata.userAgent || null,
        });
    }
}

module.exports = CartService;
