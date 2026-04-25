const asyncHandler = require('../../utils/asyncHandler.util');
const AppError = require('../../utils/appError.util');
const { assertAuthenticated, assertRole } = require('../../utils/auth.util');
const { validateObjectId } = require('../../utils/validator.util');
const VariantService = require('./variant.service');
const VariantMapper = require('./variant.mapper');
const {
    createVariantSchema,
    updateVariantSchema,
    reserveStockSchema,
    completeSaleSchema,
    releaseReservedStockSchema,
    getMaxOrderQtySchema,
    getVariantsByProductSchema,
    getVariantByIdSchema,
} = require('./variant.validator');

// ===== PUBLIC ENDPOINTS =====

/**
 * GET /api/v1/variants/:variantId
 * Get variant by ID (with units)
 * 
 * Path params:
 * - variantId (MongoDB ObjectId)
 */
const getVariantById = asyncHandler(async (req, res) => {
    const { variantId } = getVariantByIdSchema.parse({
        variantId: req.params.variantId,
    });

    const variant = await VariantService.getVariantById(variantId);

    res.status(200).json({
        success: true,
        data: variant,
    });
});

/**
 * GET /api/v1/products/:productId/variants
 * Get all variants for a product
 * 
 * Path params:
 * - productId (MongoDB ObjectId)
 */
const getVariantsByProduct = asyncHandler(async (req, res) => {
    const { productId } = getVariantsByProductSchema.parse({
        productId: req.params.productId,
    });

    const variants = await VariantService.getVariantsByProduct(productId);

    res.status(200).json({
        success: true,
        data: variants,
    });
});

/**
 * GET /api/v1/variants/:variantId/stock
 * Check available stock for variant
 * 
 * ✅ FIX #2: Returns stock in items (cái), NOT packs
 * 
 * Path params:
 * - variantId (MongoDB ObjectId)
 * 
 * Response: { available: 500, reserved: 50, sold: 1000 }
 */
const checkVariantStock = asyncHandler(async (req, res) => {
    validateObjectId(req.params.variantId);

    const variant = await VariantService.getVariantById(
        req.params.variantId
    );

    res.status(200).json({
        success: true,
        data: {
            variant_id: variant.id,
            sku: variant.sku,
            stock: variant.stock,
        },
    });
});

/**
 * GET /api/v1/variants/:variantId/max-order-qty
 * Get maximum orderable quantity for variant
 * 
 * ✅ Dùng để limit UI max input
 * ✅ FIX #2: Calculated từ available stock / pack_size
 * 
 * Path params:
 * - variantId (MongoDB ObjectId)
 * 
 * Query params:
 * - pack_size (optional, default 100)
 * 
 * Response: { max_packs: 5, max_items: 500 }
 */
const getMaxOrderQty = asyncHandler(async (req, res) => {
    const { variantId } = getVariantByIdSchema.parse({
        variantId: req.params.variantId,
    });

    const { pack_size } = getMaxOrderQtySchema.parse({
        pack_size: req.query.pack_size,
    });

    const maxPacks = await VariantService.getMaxOrderQty(variantId, pack_size);

    res.status(200).json({
        success: true,
        data: {
            variant_id: variantId,
            max_packs: maxPacks,
            max_items: maxPacks * pack_size,
            pack_size,
        },
    });
});

// ===== ADMIN ENDPOINTS =====

/**
 * POST /api/v1/products/:productId/variants
 * Create new variant (manager+ only)
 * 
 * ✅ Authorization: MANAGER or ADMIN
 * ✅ FIX #4: SKU auto-generated
 * ✅ FIX #5: Size + fabric combination unique per product
 * 
 * Path params:
 * - productId (MongoDB ObjectId)
 * 
 * Body:
 * - size (required)
 * - fabric_type (required)
 * - stock (optional, initial inventory)
 * - status (optional, default ACTIVE)
 */
const createVariant = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    assertRole(user, ['MANAGER', 'ADMIN']);

    validateObjectId(req.params.productId);

    // req.body already validated by validate middleware
    const variant = await VariantService.createVariant(
        req.params.productId,
        req.body
    );

    res.status(201).json({
        success: true,
        data: variant,
    });
});

/**
 * PATCH /api/v1/variants/:variantId
 * Update variant (manager+ only)
 * 
 * ✅ Authorization: MANAGER or ADMIN
 * ⚠️ Cannot update: SKU, size, fabric_type (use service for combo check)
 * 
 * Path params:
 * - variantId (MongoDB ObjectId)
 * 
 * Body: Same as create, all optional
 */
const updateVariant = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    assertRole(user, ['MANAGER', 'ADMIN']);

    validateObjectId(req.params.variantId);

    // req.body already validated by validate middleware
    const variant = await VariantService.updateVariant(
        req.params.variantId,
        req.body
    );

    res.status(200).json({
        success: true,
        data: variant,
    });
});

/**
 * DELETE /api/v1/variants/:variantId
 * Soft delete variant (manager+ only)
 * 
 * ✅ Authorization: MANAGER or ADMIN
 * ✅ Updates product price cache
 * 
 * Path params:
 * - variantId (MongoDB ObjectId)
 */
const deleteVariant = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    assertRole(user, ['MANAGER', 'ADMIN']);

    validateObjectId(req.params.variantId);

    const result = await VariantService.deleteVariant(req.params.variantId);

    res.status(200).json({
        success: true,
        data: result,
    });
});

// ===== STOCK MANAGEMENT (Internal/Cart Service) =====

/**
 * POST /api/v1/variants/:variantId/reserve-stock
 * Reserve stock when item added to cart
 * 
 * ✅ FIX #2: qty_items in items (cái), NOT packs
 * 
 * Path params:
 * - variantId (MongoDB ObjectId)
 * 
 * Body:
 * - qty_items (required, positive integer)
 * 
 * Response: Updated stock { available, reserved, sold }
 * 
 * ⚠️ Internal endpoint - should be called from cart service only
 */
const reserveStock = asyncHandler(async (req, res) => {
    validateObjectId(req.params.variantId);

    // req.body already validated by validate middleware
    const { qty_items } = reserveStockSchema.parse(req.body);

    const variant = await VariantService.reserveStock(
        req.params.variantId,
        qty_items
    );

    res.status(200).json({
        success: true,
        data: {
            variant_id: variant._id.toString(),
            stock: variant.stock,
        },
    });
});

/**
 * POST /api/v1/variants/:variantId/complete-sale
 * Mark reserved stock as sold (order confirmed)
 * 
 * Path params:
 * - variantId (MongoDB ObjectId)
 * 
 * Body:
 * - qty_items (required, positive integer)
 * 
 * ⚠️ Internal endpoint - called from order service
 */
const completeSale = asyncHandler(async (req, res) => {
    validateObjectId(req.params.variantId);

    const { qty_items } = completeSaleSchema.parse(req.body);

    const variant = await VariantService.completeSale(
        req.params.variantId,
        qty_items
    );

    res.status(200).json({
        success: true,
        data: {
            variant_id: variant._id.toString(),
            stock: variant.stock,
        },
    });
});

/**
 * POST /api/v1/variants/:variantId/release-stock
 * Release reserved stock (order cancelled)
 * 
 * Path params:
 * - variantId (MongoDB ObjectId)
 * 
 * Body:
 * - qty_items (required, positive integer)
 * 
 * ⚠️ Internal endpoint - called from order service
 */
const releaseReservedStock = asyncHandler(async (req, res) => {
    validateObjectId(req.params.variantId);

    const { qty_items } = releaseReservedStockSchema.parse(req.body);

    const variant = await VariantService.releaseReservedStock(
        req.params.variantId,
        qty_items
    );

    res.status(200).json({
        success: true,
        data: {
            variant_id: variant._id.toString(),
            stock: variant.stock,
        },
    });
});

module.exports = {
    getVariantById,
    getVariantsByProduct,
    checkVariantStock,
    getMaxOrderQty,
    createVariant,
    updateVariant,
    deleteVariant,
    reserveStock,
    completeSale,
    releaseReservedStock,
};