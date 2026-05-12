const mongoose = require('mongoose');
const VariantUnit = require('./variant_unit.model');
const Variant = require('./variant.model');
const VariantService = require('./variant.service');
const VariantUnitMapper = require('./variant_unit.mapper');
const AppError = require('../../utils/appError.util');

class VariantUnitService {
    static async createVariantUnit(variantId, data) {
        const { pack_size, price_tiers, is_default, ...rest } = data;

        // ✅ Check variant exists
        const variant = await Variant.findById(variantId);
        if (!variant) {
            throw new AppError(
                'Variant not found',
                404,
                'VARIANT_NOT_FOUND'
            );
        }

        // ✅ FIX #5: Check pack_size unique per variant
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

        // ✅ FIX #1: Validate price tiers (critical)
        let validatedTiers;
        try {
            const validation = VariantUnit.validatePriceTiers(price_tiers);
            validatedTiers = validation.sorted;
        } catch (error) {
            throw new AppError(error.message, 400, 'INVALID_PRICE_TIERS');
        }

        // ✅ If this is first unit OR is_default=true, set as default
        let finalIsDefault = is_default;
        if (is_default) {
            // Clear other defaults
            await VariantUnit.updateMany(
                { variant_id: variantId },
                { is_default: false }
            );
            finalIsDefault = true;
        } else {
            // If first unit, auto-set as default
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

        // ✅ FIX #3: Update variant + product price cache
        await VariantService.recalculatePriceCache(variantId);

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

        return units.map(VariantUnitMapper.toResponseDTO);
    }

    static async getDefaultVariantUnit(variantId) {
        const unit = await VariantUnit.getDefault(variantId);
        if (!unit) return null;

        return VariantUnitMapper.toResponseDTO(unit);
    }

    static async updateVariantUnit(unitId, updateData) {
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

        // ✅ FIX #1: If updating price tiers, validate
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

        // ✅ If setting as default, clear others
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

            // ✅ FIX #3: Recalc if tiers changed
            if (updateData.price_tiers) {
                await VariantService.recalculatePriceCache(
                    unit.variant_id
                );
            }

            return VariantUnitMapper.toResponseDTO(updated);
        } catch (error) {
            throw error;
        }
    }

    static async deleteVariantUnit(unitId) {
        const unit = await VariantUnit.findById(unitId);
        if (!unit) {
            throw new AppError(
                'Variant unit not found',
                404,
                'VARIANT_UNIT_NOT_FOUND'
            );
        }

        // ✅ Check: cannot delete last unit (need at least 1)
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

        // ✅ FIX #3: Recalc prices
        await VariantService.recalculatePriceCache(unit.variant_id);

        // ✅ If deleted unit was default, set next as default
        if (unit.is_default) {
            const nextUnit = await VariantUnit.findOne({
                variant_id: unit.variant_id,
            }).sort({ pack_size: 1 });

            if (nextUnit) {
                await VariantUnit.findByIdAndUpdate(nextUnit._id, {
                    is_default: true,
                });
            }
        }

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

        // ✅ Check order qty constraints
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

        // ✅ FIX #1: Get price từ tier
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
}

module.exports = VariantUnitService;