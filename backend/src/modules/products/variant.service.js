const mongoose = require('mongoose');
const Variant = require('./variant.model');
const VariantUnit = require('./variant_unit.model');
const Product = require('./product.model');
const ProductService = require('./product.service');
const VariantMapper = require('./variant.mapper');
const AppError = require('../../utils/appError.util');

class VariantService {
    /**
     * CREATE: Tạo variant mới
     * 
     * ✅ FIX #4: SKU generation & validation
     * Format: {productSlug}-{size}-{fabric}
     * 
     * @param {String} productId
     * @param {Object} data - { size, fabric_type, stock, ... }
     * @returns {Object} Variant DTO
     */
    static async createVariant(productId, data) {
        const { size, fabric_type, stock, ...rest } = data;

        // ✅ Check product exists
        const product = await Product.findById(productId);
        if (!product) {
            throw new AppError(
                'Product not found',
                404,
                'PRODUCT_NOT_FOUND'
            );
        }

        // ✅ FIX #4: Generate + validate SKU
        const sku = VariantService.generateSKU(
            product.slug,
            size,
            fabric_type
        );

        // ✅ Check SKU unique
        const existingSKU = await Variant.findOne({ sku });
        if (existingSKU) {
            throw new AppError(
                'SKU already exists',
                409,
                'SKU_CONFLICT'
            );
        }

        // ✅ FIX #5: Check size + fabric combination unique
        const existingCombo = await Variant.findOne({
            product_id: productId,
            size,
            fabric_type,
        });
        if (existingCombo) {
            throw new AppError(
                'Variant (size + fabric) combination already exists',
                409,
                'VARIANT_CONFLICT'
            );
        }

        // ✅ FIX #2: Stock format validation
        const initialStock = {
            available: stock?.available || 0,
            reserved: 0,
            sold: 0,
        };

        const variant = new Variant({
            product_id: productId,
            sku,
            size,
            fabric_type,
            stock: initialStock,
            ...rest,
        });

        await variant.save();

        // ✅ FIX #3: Update product price cache (no variants yet, will be 0)
        await ProductService.recalcuatePriceCache(productId);

        return VariantMapper.toResponseDTO(variant);
    }

    /**
     * READ: Get variant by ID
     * 
     * @param {String} variantId
     * @returns {Object} Variant DTO with units
     */
    static async getVariantById(variantId) {
        const variant = await Variant.findById(variantId).lean();
        if (!variant) {
            throw new AppError(
                'Variant not found',
                404,
                'VARIANT_NOT_FOUND'
            );
        }

        const units = await VariantUnit.find({
            variant_id: variantId,
        }).lean();

        return VariantMapper.toDetailDTO(variant, units);
    }

    /**
     * READ: Get all variants for a product
     * 
     * @param {String} productId
     * @returns {Array} Variant DTOs with units
     */
    static async getVariantsByProduct(productId) {
        const variants = await Variant.find({
            product_id: productId,
        }).lean();

        const variantsWithUnits = await Promise.all(
            variants.map(async (variant) => {
                const units = await VariantUnit.find({
                    variant_id: variant._id,
                }).lean();
                return VariantMapper.toDetailDTO(variant, units);
            })
        );

        return variantsWithUnits;
    }

    /**
     * UPDATE: Update variant info
     * 
     * ✅ WARNING: Do NOT update prices here (handled by variant_unit service)
     * 
     * @param {String} variantId
     * @param {Object} updateData - { size, fabric_type, stock, status, ... }
     * @returns {Object} Updated variant DTO
     */
    static async updateVariant(variantId, updateData) {
        if (!updateData || Object.keys(updateData).length === 0) {
            throw new AppError(
                'No valid fields to update',
                400,
                'VALIDATION_ERROR'
            );
        }

        const variant = await Variant.findById(variantId);
        if (!variant) {
            throw new AppError(
                'Variant not found',
                404,
                'VARIANT_NOT_FOUND'
            );
        }

        // ✅ FIX #5: If updating size/fabric, check combo still unique
        if (
            (updateData.size || updateData.fabric_type) &&
            (updateData.size !== variant.size ||
                updateData.fabric_type !== variant.fabric_type)
        ) {
            const newSize = updateData.size || variant.size;
            const newFabric = updateData.fabric_type || variant.fabric_type;

            const existingCombo = await Variant.findOne({
                _id: { $ne: variantId },
                product_id: variant.product_id,
                size: newSize,
                fabric_type: newFabric,
            });

            if (existingCombo) {
                throw new AppError(
                    'Variant (size + fabric) combination already exists',
                    409,
                    'VARIANT_CONFLICT'
                );
            }
        }

        try {
            const updated = await Variant.findByIdAndUpdate(
                variantId,
                { $set: updateData },
                { new: true, runValidators: true }
            );

            return VariantMapper.toResponseDTO(updated);
        } catch (error) {
            throw error;
        }
    }

    /**
     * DELETE: Soft-delete variant
     * 
     * @param {String} variantId
     * @returns {Object} Deletion confirmation
     */
    static async deleteVariant(variantId) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const variant = await Variant.findById(variantId).session(
                session
            );
            if (!variant) {
                throw new AppError(
                    'Variant not found',
                    404,
                    'VARIANT_NOT_FOUND'
                );
            }

            // ✅ Soft-delete variant
            await Variant.updateOne(
                { _id: variantId },
                {
                    is_deleted: true,
                    deleted_at: new Date(),
                },
                { session }
            );

            // ✅ Update product price cache
            await session.commitTransaction();
            await ProductService.recalcuatePriceCache(variant.product_id);

            return {
                message: 'Variant deleted successfully (soft delete)',
                variantId,
            };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * STOCK: Check available stock
     * 
     * ✅ FIX #2: Stock checked theo cái, NOT pack
     * 
     * @param {String} variantId
     * @param {Number} qtyItems - Số cái cần check
     * @returns {Boolean} True if stock available
     */
    static async hasStock(variantId, qtyItems) {
        return await Variant.hasStock(
            variantId,
            Math.ceil(qtyItems / 100), // Convert to packs (rough estimate)
            100 // assuming 100 items per pack
        );
    }

    /**
     * STOCK: Reserve stock (add to cart)
     * 
     * @param {String} variantId
     * @param {Number} qtyItems - Số cái
     * @returns {Object} Updated stock
     */
    static async reserveStock(variantId, qtyItems) {
        return await Variant.reserveStock(variantId, qtyItems);
    }

    /**
     * STOCK: Complete sale (order confirmed)
     * 
     * @param {String} variantId
     * @param {Number} qtyItems
     * @returns {Object} Updated stock
     */
    static async completeSale(variantId, qtyItems) {
        return await Variant.completeSale(variantId, qtyItems);
    }

    /**
     * STOCK: Release reserved stock (cancel order)
     * 
     * @param {String} variantId
     * @param {Number} qtyItems
     * @returns {Object} Updated stock
     */
    static async releaseReservedStock(variantId, qtyItems) {
        return await Variant.releaseReservedStock(variantId, qtyItems);
    }

    /**
     * INTERNAL: Update price cache (called từ variant_unit service)
     * 
     * ✅ FIX #3: When units change, recalc variant + product prices
     */
    static async recalculatePriceCache(variantId) {
        const variant = await Variant.findById(variantId);
        if (!variant) return;

        try {
            await Variant.updatePriceCache(variantId);
            // Also update product cache
            await ProductService.recalcuatePriceCache(variant.product_id);
        } catch (error) {
            console.error(
                `Failed to update price cache for variant ${variantId}:`,
                error
            );
        }
    }

    /**
     * HELPER: Generate SKU
     * 
     * Format: {productSlug}-{size}-{fabric}
     * Example: TUBAO-NA-20x25-NOTDYET
     * 
     * @param {String} productSlug
     * @param {String} size
     * @param {String} fabricType
     * @returns {String} Generated SKU
     */
    static generateSKU(productSlug, size, fabricType) {
        const slugify = (str) => str.toUpperCase().replace(/\s+/g, '');

        return `${slugify(productSlug)}-${slugify(size)}-${slugify(fabricType)}`;
    }

    /**
     * GET max order qty for variant (based on stock + pack size)
     * 
     * ✅ Dùng này để limit UI max input
     * 
     * @param {String} variantId
     * @param {Number} packSize
     * @returns {Number} Max quantity of packs user can order
     */
    static async getMaxOrderQty(variantId, packSize = 100) {
        const variant = await Variant.findById(variantId, 'stock');
        if (!variant) {
            throw new AppError(
                'Variant not found',
                404,
                'VARIANT_NOT_FOUND'
            );
        }

        return Math.floor(variant.stock.available / packSize);
    }
}

module.exports = VariantService;