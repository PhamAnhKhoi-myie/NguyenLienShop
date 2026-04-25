const express = require('express');
const router = express.Router({ mergeParams: true });
const validate = require('../../../middlewares/validate.middleware');
const variantController = require('../variant.controller');
const {
    createVariantSchema,
    updateVariantSchema,
    reserveStockSchema,
    completeSaleSchema,
    releaseReservedStockSchema,
    getMaxOrderQtySchema,
} = require('../variant.validator');

// ============================================================================
// ===== VARIANT ROUTES =====
// ============================================================================

// ===== PUBLIC ENDPOINTS =====

/**
 * GET /api/v1/products/:productId/variants
 * Get all variants for a product
 */
router.get(
    '/',
    variantController.getVariantsByProduct
);

/**
 * GET /api/v1/variants/:variantId
 * Get variant by ID (with units)
 */
router.get(
    '/id/:variantId',
    variantController.getVariantById
);

/**
 * GET /api/v1/variants/:variantId/stock
 * Check available stock for variant
 * 
 * ✅ FIX #2: Returns stock in items (cái), NOT packs
 */
router.get(
    '/id/:variantId/stock',
    variantController.checkVariantStock
);

/**
 * GET /api/v1/variants/:variantId/max-order-qty
 * Get maximum orderable quantity for variant
 * 
 * Query params:
 * - pack_size (optional, default 100)
 */
router.get(
    '/id/:variantId/max-order-qty',
    validate({ query: getMaxOrderQtySchema }),
    variantController.getMaxOrderQty
);

// ===== ADMIN ENDPOINTS =====

/**
 * POST /api/v1/products/:productId/variants
 * Create new variant (manager+ only)
 * 
 * Body:
 * - size (required)
 * - fabric_type (required)
 * - stock (optional)
 * - status (optional)
 */
router.post(
    '/',
    validate({ body: createVariantSchema }),
    variantController.createVariant
);

/**
 * PATCH /api/v1/variants/:variantId
 * Update variant (manager+ only)
 */
router.patch(
    '/id/:variantId',
    validate({ body: updateVariantSchema }),
    variantController.updateVariant
);

/**
 * DELETE /api/v1/variants/:variantId
 * Soft delete variant (manager+ only)
 */
router.delete(
    '/id/:variantId',
    variantController.deleteVariant
);

// ===== STOCK MANAGEMENT (Internal) =====

/**
 * POST /api/v1/variants/:variantId/reserve-stock
 * Reserve stock when item added to cart
 * 
 * Body:
 * - qty_items (required)
 * 
 * ⚠️ Internal endpoint - called from cart service
 */
router.post(
    '/id/:variantId/reserve-stock',
    validate({ body: reserveStockSchema }),
    variantController.reserveStock
);

/**
 * POST /api/v1/variants/:variantId/complete-sale
 * Mark reserved stock as sold (order confirmed)
 * 
 * Body:
 * - qty_items (required)
 */
router.post(
    '/id/:variantId/complete-sale',
    validate({ body: completeSaleSchema }),
    variantController.completeSale
);

/**
 * POST /api/v1/variants/:variantId/release-stock
 * Release reserved stock (order cancelled)
 * 
 * Body:
 * - qty_items (required)
 */
router.post(
    '/id/:variantId/release-stock',
    validate({ body: releaseReservedStockSchema }),
    variantController.releaseReservedStock
);

module.exports = router;