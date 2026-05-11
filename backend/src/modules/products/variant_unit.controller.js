const asyncHandler = require('../../utils/asyncHandler.util');
const AppError = require('../../utils/appError.util');
const { assertAuthenticated, assertRole } = require('../../utils/auth.util');
const VariantUnitService = require('./variant_unit.service');

// ===== PUBLIC =====

const getVariantUnitById = asyncHandler(async (req, res) => {
    const { unitId } = req.params;

    const unit = await VariantUnitService.getVariantUnitById(unitId);

    res.status(200).json({
        success: true,
        data: unit,
    });
});

const getVariantUnitsByVariant = asyncHandler(async (req, res) => {
    const { variantId } = req.params;

    const units = await VariantUnitService.getVariantUnitsByVariant(variantId);

    res.status(200).json({
        success: true,
        data: units,
    });
});

const getDefaultVariantUnit = asyncHandler(async (req, res) => {
    const { variantId } = req.params;

    const unit = await VariantUnitService.getDefaultVariantUnit(variantId);

    if (!unit) {
        throw new AppError(
            'No default unit found for this variant',
            404,
            'UNIT_NOT_FOUND'
        );
    }

    res.status(200).json({
        success: true,
        data: unit,
    });
});

const getPriceTierSummary = asyncHandler(async (req, res) => {
    const { unitId } = req.params;

    const tiers = await VariantUnitService.getPriceTierSummary(unitId);

    res.status(200).json({
        success: true,
        data: tiers,
    });
});

const calculatePrice = asyncHandler(async (req, res) => {
    const { unitId } = req.params;
    const { qty_packs } = req.body;

    const pricing = await VariantUnitService.calculatePrice(
        unitId,
        qty_packs
    );

    res.status(200).json({
        success: true,
        data: pricing,
    });
});

const getMaxOrderableQty = asyncHandler(async (req, res) => {
    const { unitId } = req.params;

    const maxQty = await VariantUnitService.getMaxOrderableQuantity(unitId);

    res.status(200).json({
        success: true,
        data: {
            unit_id: unitId,
            max_orderable_packs: maxQty,
        },
    });
});

// ===== ADMIN =====

const createVariantUnit = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    assertRole(user, ['MANAGER', 'ADMIN']);

    const { variantId } = req.params;

    const unit = await VariantUnitService.createVariantUnit(
        variantId,
        req.body
    );

    res.status(201).json({
        success: true,
        data: unit,
    });
});

const updateVariantUnit = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    assertRole(user, ['MANAGER', 'ADMIN']);

    const { unitId } = req.params;

    const unit = await VariantUnitService.updateVariantUnit(
        unitId,
        req.body
    );

    res.status(200).json({
        success: true,
        data: unit,
    });
});

const deleteVariantUnit = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    assertRole(user, ['MANAGER', 'ADMIN']);

    const { unitId } = req.params;

    const result = await VariantUnitService.deleteVariantUnit(unitId);

    res.status(200).json({
        success: true,
        data: result,
    });
});

const validatePriceTiers = asyncHandler(async (req, res) => {
    const { price_tiers } = req.body;

    VariantUnitService.validatePriceTiers(price_tiers);

    res.status(200).json({
        success: true,
        data: {
            valid: true,
            message: 'Price tiers are valid',
        },
    });
});

module.exports = {
    getVariantUnitById,
    getVariantUnitsByVariant,
    getDefaultVariantUnit,
    getPriceTierSummary,
    calculatePrice,
    getMaxOrderableQty,
    createVariantUnit,
    updateVariantUnit,
    deleteVariantUnit,
    validatePriceTiers,
};