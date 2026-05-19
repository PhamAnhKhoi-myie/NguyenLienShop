const asyncHandler = require('../../utils/asyncHandler.util');
const AppError = require('../../utils/appError.util');
const VariantService = require('./variant.service');
const { assertAuthenticated } = require('../../utils/auth.util');
const { buildAuditMetadata } = require('../../utils/audit.util');

// ===== PUBLIC =====

const getVariantById = asyncHandler(async (req, res) => {
    const { variantId } = req.params;

    const variant = await VariantService.getVariantById(variantId);

    res.status(200).json({
        success: true,
        data: variant,
    });
});

const getVariantsByProduct = asyncHandler(async (req, res) => {
    const { productId } = req.params;

    const variants = await VariantService.getVariantsByProduct(productId);

    res.status(200).json({
        success: true,
        data: variants,
    });
});

const checkVariantStock = asyncHandler(async (req, res) => {
    const { variantId } = req.params;

    const variant = await VariantService.getVariantById(variantId);

    res.status(200).json({
        success: true,
        data: {
            variant_id: variant.id,
            sku: variant.sku,
            stock: variant.stock,
        },
    });
});

const getMaxOrderQty = asyncHandler(async (req, res) => {
    const { variantId } = req.params;
    const { pack_size } = req.query;

    const maxPacks = await VariantService.getMaxOrderQty(
        variantId,
        pack_size
    );

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

// ===== ADMIN =====

const createVariant = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    const { productId } = req.params;

    const variant = await VariantService.createVariant(
        productId,
        req.body,
        user.userId,
        buildAuditMetadata(req)
    );

    res.status(201).json({
        success: true,
        data: variant,
    });
});

const updateVariant = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    const { variantId } = req.params;

    const forbiddenFields = ['size', 'fabric_type', 'sku'];

    for (const field of forbiddenFields) {
        if (req.body[field] !== undefined) {
            throw new AppError(`${field} cannot be updated`, 400);
        }
    }

    const variant = await VariantService.updateVariant(
        variantId,
        req.body,
        user.userId,
        buildAuditMetadata(req)
    );

    res.status(200).json({
        success: true,
        data: variant,
    });
});

const deleteVariant = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    const { variantId } = req.params;

    const result = await VariantService.deleteVariant(
        variantId,
        user.userId,
        buildAuditMetadata(req)
    );

    res.status(200).json({
        success: true,
        data: result,
    });
});

// ===== INTERNAL =====

const reserveStock = asyncHandler(async (req, res) => {
    const { variantId } = req.params;
    const { qty_items } = req.body;

    const variant = await VariantService.reserveStock(
        variantId,
        qty_items,
        buildAuditMetadata(req)
    );

    res.status(200).json({
        success: true,
        data: {
            variant_id: variant._id.toString(),
            stock: variant.stock,
        },
    });
});

const completeSale = asyncHandler(async (req, res) => {
    const { variantId } = req.params;
    const { qty_items } = req.body;

    const variant = await VariantService.completeSale(
        variantId,
        qty_items,
        buildAuditMetadata(req)
    );

    res.status(200).json({
        success: true,
        data: {
            variant_id: variant._id.toString(),
            stock: variant.stock,
        },
    });
});

const releaseReservedStock = asyncHandler(async (req, res) => {
    const { variantId } = req.params;
    const { qty_items } = req.body;

    const variant = await VariantService.releaseReservedStock(
        variantId,
        qty_items,
        buildAuditMetadata(req)
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
