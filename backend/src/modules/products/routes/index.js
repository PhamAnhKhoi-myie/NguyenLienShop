const express = require('express');
const router = express.Router();

// ===== IMPORT ALL SUB-ROUTES =====
const productRoutes = require('./product.routes');
const variantRoutes = require('./variant.routes');
const variantUnitRoutes = require('./variant_unit.routes');

// ============================================================================
// ===== MOUNT SUB-ROUTES =====
// ============================================================================

/**
 * ✅ Product routes
 * GET /api/v1/products
 * POST /api/v1/products/:productId
 */
router.use('/products', productRoutes);

/**
 * ✅ Variant routes (nested under products)
 * GET /api/v1/products/:productId/variants
 * POST /api/v1/products/:productId/variants
 * GET /api/v1/variants/:variantId
 * PATCH /api/v1/variants/:variantId
 * DELETE /api/v1/variants/:variantId
 */
router.use('/products/:productId/variants', variantRoutes);

/**
 * ✅ Variant Unit routes
 * GET /api/v1/variant-units/:unitId
 * GET /api/v1/variants/:variantId/units
 * POST /api/v1/variants/:variantId/units
 */
router.use('/variant-units', variantUnitRoutes);
router.use('/variants/:variantId/units', variantUnitRoutes);

module.exports = router;