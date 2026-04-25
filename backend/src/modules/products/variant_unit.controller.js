const asyncHandler = require('../../utils/asyncHandler.util');
const AppError = require('../../utils/appError.util');
const { assertAuthenticated, assertRole } = require('../../utils/auth.util');
const { validateObjectId } = require('../../utils/validator.util');
const VariantUnitService = require('./variant_unit.service');
const VariantUnitMapper = require('./variant_unit.mapper');
const {
    createVariantUnitSchema,
    updateVariantUnitSchema,
    calculatePriceSchema,
    validatePriceTiersSchema,
    getPriceTierSummarySchema,
    getMaxOrderableQtySchema,
    getVariantUnitsByVariantSchema,
    getVariantUnitByIdSchema,
    getDefaultVariantUnitSchema,
} = require('./variant_unit.validator');

// ===== PUBLIC ENDPOINTS =====

/**
 * GET /api/v1/variant-units/:unitId
 * Get variant unit by ID
 * 
 * Path params:
 * - unitId (MongoDB ObjectId)
 */
const getVariantUnitById = asyncHandler(async (req, res) => {
    const { unitId } = getVariantUnitByIdSchema.parse({
        unitId: req.params.unitId,
    });

    const unit = await VariantUnitService.getVariantUnitById(unitId);

    res.status(200).json({
        success: true,
        data: unit,
    });
});

/**
 * GET /api/v1/variants/:variantId/units
 * Get all units for a variant
 * 
 * Path params:
 * - variantId (MongoDB ObjectId)
 */
const getVariantUnitsByVariant = asyncHandler(async (req, res) => {
    const { variantId } = getVariantUnitsByVariantSchema.parse({
        variantId: req.params.variantId,
    });

    const units = await VariantUnitService.getVariantUnitsByVariant(
        variantId
    );

    res.status(200).json({
        success: true,
        data: units,
    });
});

/**
 * GET /api/v1/variants/:variantId/units/default
 * Get default unit for variant
 * 
 * Path params:
 * - variantId (MongoDB ObjectId)
 */
const getDefaultVariantUnit = asyncHandler(async (req, res) => {
    const { variantId } = getDefaultVariantUnitSchema.parse({
        variantId: req.params.variantId,
    });

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

/**
 * GET /api/v1/variant-units/:unitId/price-tiers
 * Get price tier summary (for frontend display)
 * 
 * ✅ FIX #1: Returns formatted tier list with price per unit
 * 
 * Path params:
 * - unitId (MongoDB ObjectId)
 * 
 * Response:
 * [
 *   { tier_number: 1, min_qty: 1, max_qty: 10, price: 180000, price_per_unit: 1800 },
 *   { tier_number: 2, min_qty: 11, max_qty: 50, price: 170000, price_per_unit: 1700 },
 *   ...
 * ]
 */
const getPriceTierSummary = asyncHandler(async (req, res) => {
    const { unitId } = getPriceTierSummarySchema.parse({
        unitId: req.params.unitId,
    });

    const tiers = await VariantUnitService.getPriceTierSummary(unitId);

    res.status(200).json({
        success: true,
        data: tiers,
    });
});

/**
 * POST /api/v1/variant-units/:unitId/calculate-price
 * Calculate final price for given quantity
 * 
 * ✅ FIX #1: Get price tier based on qty, calculate total
 * 
 * Path params:
 * - unitId (MongoDB ObjectId)
 * 
 * Body:
 * - qty_packs (required, positive integer)
 * 
 * Response:
 * {
 *   qty_packs: 3,
 *   unit_price: 180000,
 *   total_price: 540000,
 *   total_items: 300,
 *   price_per_unit: 1800,
 *   currency: "VND",
 *   pack_size: 100,
 *   unit_display: "Gói 100"
 * }
 */
const calculatePrice = asyncHandler(async (req, res) => {
    validateObjectId(req.params.unitId);

    // req.body already validated by validate middleware
    const { qty_packs } = calculatePriceSchema.parse(req.body);

    const pricing = await VariantUnitService.calculatePrice(
        req.params.unitId,
        qty_packs
    );

    res.status(200).json({
        success: true,
        data: pricing,
    });
});

/**
 * GET /api/v1/variant-units/:unitId/max-orderable-qty
 * Get maximum orderable quantity for unit
 * 
 * ✅ Dùng để limit UI max input
 * 
 * Path params:
 * - unitId (MongoDB ObjectId)
 * 
 * Response: { max_packs: 999 }
 */
const getMaxOrderableQty = asyncHandler(async (req, res) => {
    const { unitId } = getMaxOrderableQtySchema.parse({
        unitId: req.params.unitId,
    });

    const maxQty = await VariantUnitService.getMaxOrderableQuantity(unitId);

    res.status(200).json({
        success: true,
        data: {
            unit_id: unitId,
            max_orderable_packs: maxQty,
        },
    });
});

// ===== ADMIN ENDPOINTS =====

/**
 * POST /api/v1/variants/:variantId/units
 * Create new variant unit (manager+ only)
 * 
 * ✅ Authorization: MANAGER or ADMIN
 * ✅ FIX #1: Validate price tiers (no overlap, sorted, last unlimited)
 * ✅ FIX #5: pack_size must be unique per variant
 * 
 * Path params:
 * - variantId (MongoDB ObjectId)
 * 
 * Body:
 * - unit_type (optional, default PACK)
 * - display_name (required)
 * - pack_size (required, unique per variant)
 * - price_tiers (required, non-empty array)
 *   [
 *     { min_qty: 1, max_qty: 10, unit_price: 180000 },
 *     { min_qty: 11, max_qty: 50, unit_price: 170000 },
 *     { min_qty: 51, max_qty: null, unit_price: 160000 }
 *   ]
 * - min_order_qty (optional, default 1)
 * - max_order_qty (optional, null = unlimited)
 * - qty_step (optional, default 1)
 * - is_default (optional, default false)
 * - currency (optional, default VND)
 */
const createVariantUnit = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    assertRole(user, ['MANAGER', 'ADMIN']);

    validateObjectId(req.params.variantId);

    // req.body already validated by validate middleware
    const unit = await VariantUnitService.createVariantUnit(
        req.params.variantId,
        req.body
    );

    res.status(201).json({
        success: true,
        data: unit,
    });
});

/**
 * PATCH /api/v1/variant-units/:unitId
 * Update variant unit (manager+ only)
 * 
 * ✅ Authorization: MANAGER or ADMIN
 * ✅ FIX #1: Re-validate price tiers if provided
 * ✅ FIX #3: Recalculates variant + product prices if tiers changed
 * 
 * Path params:
 * - unitId (MongoDB ObjectId)
 * 
 * Body: Same as create, all optional
 * ⚠️ Cannot update: pack_size (unique constraint)
 */
const updateVariantUnit = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    assertRole(user, ['MANAGER', 'ADMIN']);

    validateObjectId(req.params.unitId);

    // req.body already validated by validate middleware
    const unit = await VariantUnitService.updateVariantUnit(
        req.params.unitId,
        req.body
    );

    res.status(200).json({
        success: true,
        data: unit,
    });
});

/**
 * DELETE /api/v1/variant-units/:unitId
 * Delete variant unit (manager+ only)
 * 
 * ✅ Authorization: MANAGER or ADMIN
 * ⚠️ Hard delete (NOT soft delete)
 * ✅ Cannot delete last unit for a variant
 * ✅ If deleted unit was default, sets next as default
 * ✅ Updates variant + product prices
 * 
 * Path params:
 * - unitId (MongoDB ObjectId)
 */
const deleteVariantUnit = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    assertRole(user, ['MANAGER', 'ADMIN']);

    validateObjectId(req.params.unitId);

    const result = await VariantUnitService.deleteVariantUnit(
        req.params.unitId
    );

    res.status(200).json({
        success: true,
        data: result,
    });
});

/**
 * POST /api/v1/variant-units/validate-tiers
 * Validate price tiers (standalone)
 * 
 * ✅ FIX #1: Useful for bulk operations, admin UI validation
 * 
 * Body:
 * - price_tiers (required array)
 * 
 * Response:
 * {
 *   valid: true,
 *   message: "Price tiers are valid"
 * }
 */
const validatePriceTiers = asyncHandler(async (req, res) => {
    // req.body already validated by validate middleware
    const { price_tiers } = req.body;

    try {
        VariantUnitService.validatePriceTiers(price_tiers);

        res.status(200).json({
            success: true,
            data: {
                valid: true,
                message: 'Price tiers are valid',
            },
        });
    } catch (error) {
        // Service throws AppError with validation message
        throw error;
    }
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