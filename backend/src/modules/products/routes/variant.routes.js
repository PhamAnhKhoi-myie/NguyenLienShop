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
const { authenticate } = require('../../../middlewares/auth.middleware');
const { authorize } = require('../../../middlewares/authorize.middleware');
const { requireInternal } = require('../../../middlewares/internal.middleware');
const { validateObjectId } = require('../../../utils/validator.util');


// helper
const validateVariantId = (req, res, next) => {
    validateObjectId(req.params.variantId);
    next();
};

const validateProductId = (req, res, next) => {
    validateObjectId(req.params.productId);
    next();
};
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
    validateProductId,
    variantController.getVariantsByProduct
);

/**
 * GET /api/v1/variants/:variantId
 * Get variant by ID (with units)
 */
router.get(
    '/id/:variantId',
    validateVariantId,
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
    validateVariantId,
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
    validateVariantId,
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
    authenticate,
    authorize(['ADMIN', 'MANAGER']),
    validateProductId,
    validate({ body: createVariantSchema }),
    variantController.createVariant
);

/**
 * PATCH /api/v1/variants/:variantId
 * Update variant (manager+ only)
 */
router.patch(
    '/id/:variantId',
    authenticate,
    authorize(['ADMIN', 'MANAGER']),
    validate({ body: updateVariantSchema }),
    variantController.updateVariant
);

/**
 * DELETE /api/v1/variants/:variantId
 * Soft delete variant (manager+ only)
 */
router.delete(
    '/id/:variantId',
    authenticate,
    authorize(['ADMIN', 'MANAGER']),
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
    requireInternal,
    validateVariantId,
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
    requireInternal,
    validateVariantId,
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
    requireInternal,
    validateVariantId,
    validate({ body: releaseReservedStockSchema }),
    variantController.releaseReservedStock
);

module.exports = router;