const { z } = require('zod');
const mongoose = require('mongoose');

/**
 * Custom validators
 */
const objectIdSchema = z
    .string()
    .refine(
        (val) => mongoose.Types.ObjectId.isValid(val),
        { message: 'Invalid MongoDB ObjectId' }
    );

const objectIdOptionalSchema = z
    .string()
    .refine(
        (val) => mongoose.Types.ObjectId.isValid(val),
        { message: 'Invalid MongoDB ObjectId' }
    )
    .optional()
    .nullable();

/**
 * ✅ Stock schema (nested in variant)
 */
const stockSchema = z.object({
    available: z
        .number()
        .int()
        .nonnegative('Available stock cannot be negative')
        .default(0),
    reserved: z
        .number()
        .int()
        .nonnegative('Reserved stock cannot be negative')
        .default(0),
    sold: z
        .number()
        .int()
        .nonnegative('Sold count cannot be negative')
        .default(0),
});

/**
 * CREATE Variant Schema
 * 
 * ✅ Require:
 * - size (e.g., "20x25")
 * - fabric_type (e.g., "Vải Không Dệt")
 * 
 * ✅ Optional:
 * - stock (initial inventory)
 * - status (default ACTIVE)
 * 
 * ⚠️ SKU is auto-generated (NOT in request body)
 */
const createVariantSchema = z.object({
    // ✅ FIX #5: Size must be unique per product (checked in service)
    size: z
        .string()
        .min(1, 'Size is required')
        .max(50, 'Size must not exceed 50 characters')
        .trim(),

    // ✅ FIX #5: Fabric type must be unique per product (checked in service)
    fabric_type: z
        .string()
        .min(1, 'Fabric type is required')
        .max(100, 'Fabric type must not exceed 100 characters')
        .trim(),

    // ✅ FIX #2: Initial stock (in items, NOT packs)
    stock: stockSchema
        .optional(),

    // Status
    status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

/**
 * UPDATE Variant Schema
 * 
 * ✅ All optional (partial update)
 * ⚠️ Cannot update: sku (unique), size/fabric (need combo check)
 */
const updateVariantSchema = z.object({
    size: z
        .string()
        .min(1, 'Size is required')
        .max(50, 'Size must not exceed 50 characters')
        .trim()
        .optional(),

    fabric_type: z
        .string()
        .min(1, 'Fabric type is required')
        .max(100, 'Fabric type must not exceed 100 characters')
        .trim()
        .optional(),

    // ✅ FIX #2: Update stock available
    stock: stockSchema
        .optional(),

    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

/**
 * Reserve Stock Schema
 * 
 * @param qtyItems - Number of items (cái) to reserve
 */
const reserveStockSchema = z.object({
    qty_items: z
        .number()
        .int()
        .positive('Quantity must be at least 1')
        .max(1000000, 'Quantity exceeds maximum'),
});

/**
 * Complete Sale Schema
 * 
 * @param qtyItems - Number of items to mark as sold
 */
const completeSaleSchema = z.object({
    qty_items: z
        .number()
        .int()
        .positive('Quantity must be at least 1')
        .max(1000000, 'Quantity exceeds maximum'),
});

/**
 * Release Reserved Stock Schema
 * 
 * @param qtyItems - Number of items to release
 */
const releaseReservedStockSchema = z.object({
    qty_items: z
        .number()
        .int()
        .positive('Quantity must be at least 1')
        .max(1000000, 'Quantity exceeds maximum'),
});

/**
 * Get Max Order Qty Schema
 * 
 * @param packSize - Size of pack (default 100)
 */
const getMaxOrderQtySchema = z.object({
    pack_size: z
        .string()
        .transform((v) => parseInt(v, 10))
        .refine((v) => v > 0, 'Pack size must be > 0')
        .default('100'),
});

/**
 * Get Variants by Product Schema
 * 
 * @param productId - Product MongoDB ObjectId
 */
const getVariantsByProductSchema = z.object({
    productId: objectIdSchema,
});

/**
 * Get Variant by ID Schema
 * 
 * @param variantId - Variant MongoDB ObjectId
 */
const getVariantByIdSchema = z.object({
    variantId: objectIdSchema,
});

module.exports = {
    createVariantSchema,
    updateVariantSchema,
    reserveStockSchema,
    completeSaleSchema,
    releaseReservedStockSchema,
    getMaxOrderQtySchema,
    getVariantsByProductSchema,
    getVariantByIdSchema,
};