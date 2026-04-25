const express = require('express');
const router = express.Router({ mergeParams: true });
const validate = require('../../../middlewares/validate.middleware');
const variantUnitController = require('../variant_unit.controller');
const {
    createVariantUnitSchema,
    updateVariantUnitSchema,
    calculatePriceSchema,
    validatePriceTiersSchema,
} = require('../variant_unit.validator');

// ============================================================================
// ===== VARIANT UNIT ROUTES =====
// ============================================================================

// ===== PUBLIC ENDPOINTS =====

/**
 * GET /api/v1/variants/:variantId/units
 * Get all units for a variant
 */
router.get(
    '/',
    variantUnitController.getVariantUnitsByVariant
);

/**
 * GET /api/v1/variant-units/default/:variantId
 * Get default unit for variant
 * 
 * ⚠️ IMPORTANT: This route MUST come before /:unitId
 */
router.get(
    '/default/:variantId',
    variantUnitController.getDefaultVariantUnit
);

/**
 * GET /api/v1/variant-units/:unitId
 * Get variant unit by ID
 */
router.get(
    '/:unitId',
    variantUnitController.getVariantUnitById
);

/**
 * GET /api/v1/variant-units/:unitId/price-tiers
 * Get price tier summary
 * 
 * ✅ FIX #1: Returns formatted tier list
 */
router.get(
    '/:unitId/price-tiers',
    variantUnitController.getPriceTierSummary
);

/**
 * GET /api/v1/variant-units/:unitId/max-orderable-qty
 * Get maximum orderable quantity for unit
 */
router.get(
    '/:unitId/max-orderable-qty',
    variantUnitController.getMaxOrderableQty
);

/**
 * POST /api/v1/variant-units/:unitId/calculate-price
 * Calculate final price for given quantity
 * 
 * ✅ FIX #1: Get price tier based on qty, calculate total
 * 
 * Body:
 * - qty_packs (required)
 */
router.post(
    '/:unitId/calculate-price',
    validate({ body: calculatePriceSchema }),
    variantUnitController.calculatePrice
);

// ===== ADMIN ENDPOINTS =====

/**
 * POST /api/v1/variant-units/validate-tiers
 * Validate price tiers (standalone)
 * 
 * ✅ FIX #1: Useful for bulk operations, admin UI validation
 * 
 * Body:
 * - price_tiers (required array)
 * 
 * ⚠️ IMPORTANT: This route MUST come before POST /:variantId/units
 */
router.post(
    '/validate-tiers',
    validate({ body: validatePriceTiersSchema }),
    variantUnitController.validatePriceTiers
);

/**
 * POST /api/v1/variants/:variantId/units
 * Create new variant unit (manager+ only)
 * 
 * Body:
 * - unit_type (optional)
 * - display_name (required)
 * - pack_size (required)
 * - price_tiers (required)
 * - min_order_qty (optional)
 * - max_order_qty (optional)
 * - qty_step (optional)
 * - is_default (optional)
 * - currency (optional)
 */
router.post(
    '/',
    validate({ body: createVariantUnitSchema }),
    variantUnitController.createVariantUnit
);

/**
 * PATCH /api/v1/variant-units/:unitId
 * Update variant unit (manager+ only)
 */
router.patch(
    '/:unitId',
    validate({ body: updateVariantUnitSchema }),
    variantUnitController.updateVariantUnit
);

/**
 * DELETE /api/v1/variant-units/:unitId
 * Delete variant unit (manager+ only)
 */
router.delete(
    '/:unitId',
    variantUnitController.deleteVariantUnit
);

module.exports = router;