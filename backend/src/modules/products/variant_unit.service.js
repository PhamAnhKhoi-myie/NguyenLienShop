const mongoose = require('mongoose');
const VariantUnit = require('./variant_unit.model');
const Variant = require('./variant.model');
const VariantService = require('./variant.service');
const VariantUnitMapper = require('./variant_unit.mapper');
const AppError = require('../../utils/appError.util');
const ProductAuditLogService = require('../audit_logs/product_audit_log/product_log.service');
const { AUDIT_ACTIONS } = require('../../constants/audit');

class VariantUnitService {
    static async createVariantUnit(variantId, data, actorId = null, metadata = {}) {
        const { pack_size, price_tiers, is_default, ...rest } = data;

        const variant = await Variant.findById(variantId);
        if (!variant) {
            throw new AppError(
                'Variant not found',
                404,
                'VARIANT_NOT_FOUND'
            );
        }

        const existingUnit = await VariantUnit.findOne({
            variant_id: variantId,
            pack_size,
        });
        if (existingUnit) {
            throw new AppError(
                'Pack size already exists for this variant',
                409,
                'PACK_SIZE_CONFLICT'
            );
        }

        let validatedTiers;
        try {
            const validation = VariantUnit.validatePriceTiers(price_tiers);
            validatedTiers = validation.sorted;
        } catch (error) {
            throw new AppError(error.message, 400, 'INVALID_PRICE_TIERS');
        }

        let finalIsDefault = is_default;
        if (is_default) {
            await VariantUnit.updateMany(
                { variant_id: variantId },
                { is_default: false }
            );
            finalIsDefault = true;
        } else {
            const unitCount = await VariantUnit.countDocuments({
                variant_id: variantId,
            });
            finalIsDefault = unitCount === 0;
        }

        const unit = new VariantUnit({
            variant_id: variantId,
            pack_size,
            price_tiers: validatedTiers,
            is_default: finalIsDefault,
            ...rest,
        });

        await unit.save();

        await VariantService.recalculatePriceCache(variantId);

        await this._createProductAuditLog({
            action: AUDIT_ACTIONS.CREATE_VARIANT_UNIT,
            targetType: 'VARIANT_UNIT',
            unit,
            variant,
            actorId,
            metadata,
            changes: {
                variant_id: {
                    from: null,
                    to: unit.variant_id,
                },
                display_name: {
                    from: null,
                    to: unit.display_name,
                },
                pack_size: {
                    from: null,
                    to: unit.pack_size,
                },
                price_tiers: {
                    from: null,
                    to: unit.price_tiers,
                },
                is_default: {
                    from: null,
                    to: unit.is_default,
                },
            },
        });

        return VariantUnitMapper.toResponseDTO(unit);
    }

    static async getVariantUnitById(unitId) {
        const unit = await VariantUnit.findById(unitId);
        if (!unit) {
            throw new AppError(
                'Variant unit not found',
                404,
                'VARIANT_UNIT_NOT_FOUND'
            );
        }

        return VariantUnitMapper.toResponseDTO(unit);
    }

    static async getVariantUnitsByVariant(variantId) {
        const units = await VariantUnit.find({
            variant_id: variantId,
        }).sort({ pack_size: 1 });

        return units.map((unit) => VariantUnitMapper.toResponseDTO(unit));
    }

    static async getDefaultVariantUnit(variantId) {
        const unit = await VariantUnit.getDefault(variantId);
        if (!unit) return null;

        return VariantUnitMapper.toResponseDTO(unit);
    }

    static async updateVariantUnit(unitId, updateData, actorId = null, metadata = {}) {
        if (!updateData || Object.keys(updateData).length === 0) {
            throw new AppError(
                'No valid fields to update',
                400,
                'VALIDATION_ERROR'
            );
        }

        const unit = await VariantUnit.findById(unitId);
        if (!unit) {
            throw new AppError(
                'Variant unit not found',
                404,
                'VARIANT_UNIT_NOT_FOUND'
            );
        }

        const variant = await this._getVariantForAudit(unit.variant_id);
        const originalUnit = unit.toObject ? unit.toObject() : unit;

        if (updateData.price_tiers) {
            try {
                const validation = VariantUnit.validatePriceTiers(
                    updateData.price_tiers
                );
                updateData.price_tiers = validation.sorted;
            } catch (error) {
                throw new AppError(
                    error.message,
                    400,
                    'INVALID_PRICE_TIERS'
                );
            }
        }

        if (updateData.is_default) {
            await VariantUnit.updateMany(
                { variant_id: unit.variant_id },
                { is_default: false }
            );
            updateData.is_default = true;
        }

        try {
            const updated = await VariantUnit.findByIdAndUpdate(
                unitId,
                { $set: updateData },
                { new: true, runValidators: true }
            );

            if (updateData.price_tiers) {
                await VariantService.recalculatePriceCache(
                    unit.variant_id
                );
            }

            await this._createProductAuditLog({
                action: AUDIT_ACTIONS.UPDATE_VARIANT_UNIT,
                targetType: 'VARIANT_UNIT',
                unit: updated,
                variant,
                actorId,
                metadata,
                changes: {
                    ...this._buildFieldChanges(
                        originalUnit,
                        updated,
                        Object.keys(updateData)
                    ),
                    default_reset: {
                        from: false,
                        to: updateData.is_default === true,
                    },
                },
            });

            return VariantUnitMapper.toResponseDTO(updated);
        } catch (error) {
            throw error;
        }
    }

    static async deleteVariantUnit(unitId, actorId = null, metadata = {}) {
        const unit = await VariantUnit.findById(unitId);
        if (!unit) {
            throw new AppError(
                'Variant unit not found',
                404,
                'VARIANT_UNIT_NOT_FOUND'
            );
        }

        const variant = await this._getVariantForAudit(unit.variant_id);
        const unitCount = await VariantUnit.countDocuments({
            variant_id: unit.variant_id,
        });

        if (unitCount === 1) {
            throw new AppError(
                'Cannot delete the only unit for this variant',
                409,
                'CANNOT_DELETE_LAST_UNIT'
            );
        }

        await VariantUnit.findByIdAndDelete(unitId);

        await VariantService.recalculatePriceCache(unit.variant_id);

        let nextDefaultUnitId = null;

        if (unit.is_default) {
            const nextUnit = await VariantUnit.findOne({
                variant_id: unit.variant_id,
            }).sort({ pack_size: 1 });

            if (nextUnit) {
                await VariantUnit.findByIdAndUpdate(nextUnit._id, {
                    is_default: true,
                });
                nextDefaultUnitId = nextUnit._id;
            }
        }

        await this._createProductAuditLog({
            action: AUDIT_ACTIONS.DELETE_VARIANT_UNIT,
            targetType: 'VARIANT_UNIT',
            unit,
            variant,
            actorId,
            metadata,
            changes: {
                deleted_unit: {
                    from: this._toAuditValue(unit),
                    to: null,
                },
                reassigned_default_unit_id: {
                    from: null,
                    to: nextDefaultUnitId,
                },
            },
        });

        return {
            message: 'Variant unit deleted successfully',
            unitId,
        };
    }

    static async calculatePrice(unitId, qtyPacks) {
        if (!qtyPacks || qtyPacks < 1) {
            throw new AppError(
                'Quantity must be at least 1',
                400,
                'INVALID_QUANTITY'
            );
        }

        const unit = await VariantUnit.findById(unitId);
        if (!unit) {
            throw new AppError(
                'Variant unit not found',
                404,
                'VARIANT_UNIT_NOT_FOUND'
            );
        }

        if (qtyPacks < unit.min_order_qty) {
            throw new AppError(
                `Minimum order quantity is ${unit.min_order_qty} packs`,
                400,
                'MIN_ORDER_NOT_MET'
            );
        }

        if (unit.max_order_qty && qtyPacks > unit.max_order_qty) {
            throw new AppError(
                `Maximum order quantity is ${unit.max_order_qty} packs`,
                400,
                'MAX_ORDER_EXCEEDED'
            );
        }

        const calculation = VariantUnit.calculatePrice(
            qtyPacks,
            unit.price_tiers,
            unit.pack_size
        );

        return {
            ...calculation,
            currency: unit.currency,
            pack_size: unit.pack_size,
            unit_display: unit.display_name,
        };
    }

    static validatePriceTiers(priceTiers) {
        try {
            return VariantUnit.validatePriceTiers(priceTiers);
        } catch (error) {
            throw new AppError(error.message, 400, 'INVALID_PRICE_TIERS');
        }
    }

    static async getMaxOrderableQuantity(unitId) {
        const unit = await VariantUnit.findById(
            unitId,
            'max_order_qty'
        );
        if (!unit) {
            throw new AppError(
                'Variant unit not found',
                404,
                'VARIANT_UNIT_NOT_FOUND'
            );
        }

        return unit.max_order_qty || 999; // Default unlimited
    }

    static async getPriceTierSummary(unitId) {
        const unit = await VariantUnit.findById(
            unitId,
            'price_tiers pack_size currency'
        );
        if (!unit) {
            throw new AppError(
                'Variant unit not found',
                404,
                'VARIANT_UNIT_NOT_FOUND'
            );
        }

        return unit.price_tiers.map((tier) => ({
            min_qty: tier.min_qty,
            max_qty: tier.max_qty,
            price: tier.unit_price,
            price_per_unit: Math.round(
                tier.unit_price / unit.pack_size
            ),
            currency: unit.currency,
        }));
    }

    static async _getVariantForAudit(variantId) {
        return Variant.findById(variantId, 'product_id sku').lean();
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
        unit,
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
            variant_id: unit?.variant_id || variant?._id || null,
            unit_id: unit?._id || null,
            sku: variant?.sku || null,
            changes,
            ip_address: metadata.ip || null,
            user_agent: metadata.userAgent || null,
        });
    }
}

module.exports = VariantUnitService;
