const mongoose = require('mongoose');
const Variant = require('./variant.model');
const VariantUnit = require('./variant_unit.model');
const Product = require('./product.model');
const ProductService = require('./product.service');
const VariantMapper = require('./variant.mapper');
const AppError = require('../../utils/appError.util');
const ProductAuditLogService = require('../audit_logs/product_audit_log/product_log.service');
const { AUDIT_ACTIONS } = require('../../constants/audit');

class VariantService {
    static async createVariant(productId, data, actorId = null, metadata = {}) {
        const { size, fabric_type, stock, ...rest } = data;

        const product = await Product.findById(productId);
        if (!product) {
            throw new AppError('Product not found', 404);
        }

        const sku = VariantService.generateSKU(product.slug, size, fabric_type);

        const existingSKU = await Variant.findOne({ sku });
        if (existingSKU) {
            throw new AppError('SKU exists', 409);
        }

        const existingCombo = await Variant.findOne({
            product_id: productId,
            size,
            fabric_type
        });
        if (existingCombo) {
            throw new AppError('Variant exists', 409);
        }

        const available = stock?.available || 0;
        if (available < 0) {
            throw new AppError('Stock cannot be negative', 400);
        }

        const variant = new Variant({
            product_id: productId,
            sku,
            size,
            fabric_type,
            stock: {
                available,
                reserved: 0,
                sold: 0
            },
            ...rest
        });

        await variant.save();

        await this._createProductAuditLog({
            action: AUDIT_ACTIONS.CREATE_VARIANT,
            targetType: 'VARIANT',
            variant,
            actorId,
            metadata,
            changes: {
                product_id: {
                    from: null,
                    to: variant.product_id,
                },
                sku: {
                    from: null,
                    to: variant.sku,
                },
                size: {
                    from: null,
                    to: variant.size,
                },
                fabric_type: {
                    from: null,
                    to: variant.fabric_type,
                },
                stock: {
                    from: null,
                    to: this._stockSnapshot(variant.stock),
                },
                status: {
                    from: null,
                    to: variant.status,
                },
            },
        });

        return VariantMapper.toResponseDTO(variant);
    }

    static async getVariantById(variantId) {
        const variant = await Variant.findOne({
            _id: variantId,
            is_deleted: false
        }).lean();
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

    static async getVariantsByProduct(productId) {
        const variants = await Variant.aggregate([
            {
                $match: {
                    product_id: new mongoose.Types.ObjectId(productId),
                    is_deleted: false
                }
            },
            {
                $lookup: {
                    from: 'variantunits',
                    let: { variantId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$variant_id', '$$variantId'] },
                                is_deleted: false
                            }
                        }
                    ],
                    as: 'units'
                }
            }
        ]);

        return variants.map(v =>
            VariantMapper.toDetailDTO(v, v.units)
        );
    }

    static async updateVariant(variantId, updateData, actorId = null, metadata = {}) {
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

        const allowedFields = ['status'];

        const sanitizedUpdate = {};

        for (const key of Object.keys(updateData)) {
            if (!allowedFields.includes(key)) {
                throw new AppError(`Field ${key} is not allowed to update`, 400);
            }
            sanitizedUpdate[key] = updateData[key];
        }

        try {
            const updated = await Variant.findByIdAndUpdate(
                variantId,
                { $set: sanitizedUpdate },
                { new: true, runValidators: true }
            );

            await this._createProductAuditLog({
                action: AUDIT_ACTIONS.UPDATE_VARIANT,
                targetType: 'VARIANT',
                variant: updated,
                actorId,
                metadata,
                changes: this._buildFieldChanges(
                    variant,
                    updated,
                    Object.keys(sanitizedUpdate)
                ),
            });

            return VariantMapper.toResponseDTO(updated);
        } catch (error) {
            throw error;
        }
    }

    static async deleteVariant(variantId, actorId = null, metadata = {}) {
        const session = await mongoose.startSession();
        let variant = null;

        try {
            let productId = null;

            await session.withTransaction(async () => {
                variant = await Variant.findById(variantId).session(session);

                if (!variant) {
                    throw new AppError('Variant not found', 404);
                }

                productId = variant.product_id;

                await Variant.updateOne(
                    { _id: variantId },
                    {
                        is_deleted: true,
                        deleted_at: new Date()
                    },
                    { session }
                );
            });

            await ProductService.recalcuatePriceCache(productId);

            await this._createProductAuditLog({
                action: AUDIT_ACTIONS.DELETE_VARIANT_SOFT,
                targetType: 'VARIANT',
                variant,
                actorId,
                metadata,
                changes: {
                    is_deleted: {
                        from: false,
                        to: true,
                    },
                    deleted_at: {
                        from: null,
                        to: new Date(),
                    },
                },
            });

        } catch (err) {
            console.error('Delete variant failed:', err);
            throw err;
        } finally {
            session.endSession();
        }
        return {
            message: 'Variant deleted successfully',
            variantId
        };
    }

    static async hasStock(variantId, qtyItems) {
        const variant = await Variant.findById(variantId, 'stock');

        if (!variant) {
            throw new AppError('Variant not found', 404);
        }

        return variant.stock.available >= qtyItems;
    }

    static async reserveStock(variantId, qty_items, metadata = {}) {
        if (qty_items <= 0) {
            throw new AppError('Quantity must be > 0', 400);
        }
        const variant = await Variant.findOneAndUpdate(
            {
                _id: variantId,
                'stock.available': { $gte: qty_items },
            },
            {
                $inc: {
                    'stock.available': -qty_items,
                    'stock.reserved': qty_items,
                },
            },
            { new: true }
        );



        if (!variant) {
            throw new AppError('Not enough stock', 400);
        }

        await this._createProductAuditLog({
            action: AUDIT_ACTIONS.RESERVE_VARIANT_STOCK,
            targetType: 'STOCK',
            variant,
            actorId: null,
            actorType: 'INTERNAL',
            metadata,
            changes: {
                qty_items: {
                    from: null,
                    to: qty_items,
                },
                stock: {
                    from: this._stockSnapshot({
                        available: variant.stock.available + qty_items,
                        reserved: variant.stock.reserved - qty_items,
                        sold: variant.stock.sold,
                    }),
                    to: this._stockSnapshot(variant.stock),
                },
            },
        });

        return variant;
    }

    static async completeSale(variantId, qty_items, metadata = {}) {
        if (qty_items <= 0) {
            throw new AppError('Quantity must be > 0', 400);
        }
        const variant = await Variant.findOneAndUpdate(
            {
                _id: variantId,
                'stock.reserved': { $gte: qty_items }
            },
            {
                $inc: {
                    'stock.reserved': -qty_items,
                    'stock.sold': qty_items,
                },
            },
            { new: true }
        );

        if (!variant) {
            throw new AppError('Invalid reserved stock', 400);
        }

        await this._createProductAuditLog({
            action: AUDIT_ACTIONS.COMPLETE_VARIANT_SALE,
            targetType: 'STOCK',
            variant,
            actorId: null,
            actorType: 'INTERNAL',
            metadata,
            changes: {
                qty_items: {
                    from: null,
                    to: qty_items,
                },
                stock: {
                    from: this._stockSnapshot({
                        available: variant.stock.available,
                        reserved: variant.stock.reserved + qty_items,
                        sold: variant.stock.sold - qty_items,
                    }),
                    to: this._stockSnapshot(variant.stock),
                },
            },
        });

        return variant;
    }

    static async releaseReservedStock(variantId, qty_items, metadata = {}) {
        if (qty_items <= 0) {
            throw new AppError('Quantity must be > 0', 400);
        }
        const variant = await Variant.findOneAndUpdate(
            {
                _id: variantId,
                'stock.reserved': { $gte: qty_items }
            },
            {
                $inc: {
                    'stock.reserved': -qty_items,
                    'stock.available': qty_items,
                },
            },
            { new: true }
        );

        if (!variant) {
            throw new AppError('Invalid reserved stock', 400);
        }

        await this._createProductAuditLog({
            action: AUDIT_ACTIONS.RELEASE_VARIANT_STOCK,
            targetType: 'STOCK',
            variant,
            actorId: null,
            actorType: 'INTERNAL',
            metadata,
            changes: {
                qty_items: {
                    from: null,
                    to: qty_items,
                },
                stock: {
                    from: this._stockSnapshot({
                        available: variant.stock.available - qty_items,
                        reserved: variant.stock.reserved + qty_items,
                        sold: variant.stock.sold,
                    }),
                    to: this._stockSnapshot(variant.stock),
                },
            },
        });

        return variant;
    }

    static async recalculatePriceCache(variantId) {
        const variant = await Variant.findById(variantId);
        if (!variant) return;

        try {
            await Variant.updatePriceCache(variantId);

            await ProductService.recalcuatePriceCache(variant.product_id);
        } catch (error) {
            console.error(
                `Failed to update price cache for variant ${variantId}:`,
                error
            );
        }
    }

    static generateSKU(productSlug, size, fabricType) {
        const slugify = (str) =>
            str
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, '')

        return `${slugify(productSlug)}-${slugify(size)}-${slugify(fabricType)}`;
    }

    static async getMaxOrderQty(variantId) {
        const variant = await Variant.findById(variantId, 'stock');
        if (!variant) return 0;

        const unit = await VariantUnit.findOne({
            variant_id: variantId,
            is_default: true
        });

        if (!unit) return 0;

        return Math.floor(variant.stock.available / unit.pack_size);
    }

    static _buildFieldChanges(before, after, fields) {
        return fields.reduce((changes, field) => {
            const fromValue = this._toAuditValue(before?.[field]);
            const toValue = this._toAuditValue(after?.[field]);

            if (JSON.stringify(fromValue) !== JSON.stringify(toValue)) {
                changes[field] = {
                    from: fromValue,
                    to: toValue,
                };
            }

            return changes;
        }, {});
    }

    static _stockSnapshot(stock = {}) {
        return {
            available: stock.available || 0,
            reserved: stock.reserved || 0,
            sold: stock.sold || 0,
        };
    }

    static _toAuditValue(value) {
        if (value === undefined || value === null) return null;
        if (value instanceof Date) return value;
        if (value?.toString && value.constructor?.name === 'ObjectId') {
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

    static async _createProductAuditLog({
        action,
        targetType,
        variant,
        actorId = null,
        actorType = 'USER',
        metadata = {},
        changes = {},
    }) {
        await ProductAuditLogService.createLog({
            actor_id: actorId,
            actor_type: actorType,
            action,
            target_type: targetType,
            product_id: variant?.product_id || null,
            variant_id: variant?._id || null,
            unit_id: null,
            sku: variant?.sku || null,
            changes,
            ip_address: metadata.ip || null,
            user_agent: metadata.userAgent || null,
        });
    }
}

module.exports = VariantService;
