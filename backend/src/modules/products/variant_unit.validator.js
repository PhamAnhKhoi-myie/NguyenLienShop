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
 * ✅ FIX #1: Price tier schema (critical)
 * 
 * Rules:
 * - min_qty >= 1
 * - max_qty > min_qty (or null for unlimited)
 * - unit_price > 0
 */
const priceTierSchema = z.object({
    min_qty: z
        .number()
        .int()
        .positive('Minimum quantity must be at least 1'),

    max_qty: z
        .number()
        .int()
        .positive('Maximum quantity must be positive')
        .nullable()
        .optional(),

    unit_price: z
        .number()
        .positive('Unit price must be greater than 0'),
});

/**
 * CREATE Variant Unit Schema
 * 
 * ✅ Require:
 * - display_name (e.g., "Gói 100")
 * - pack_size (e.g., 100)
 * - price_tiers (at least 1 tier)
 * 
 * ✅ Optional:
 * - unit_type (PACK, BOX, CARTON)
 * - min_order_qty
 * - max_order_qty
 * - qty_step
 * - is_default
 * - currency
 * 
 * ⚠️ Tiers validation:
 * - NOT empty
 * - NO overlap
 * - Last tier must be unlimited (max_qty = null)
 */
const createVariantUnitSchema = z
    .object({
        unit_type: z
            .enum(['UNIT', 'PACK', 'BOX', 'CARTON'])
            .default('PACK'),

        display_name: z
            .string()
            .min(1, 'Display name is required')
            .max(100, 'Display name must not exceed 100 characters')
            .trim(),

        // ✅ FIX #5: Pack size must be unique per variant (checked in service)
        pack_size: z
            .number()
            .int()
            .positive('Pack size must be at least 1'),

        // ✅ FIX #1: Price tiers (critical validation)
        price_tiers: z
            .array(priceTierSchema)
            .min(1, 'At least one price tier is required')
            .refine(
                (tiers) => {
                    // Check: last tier has no max_qty (unlimited)
                    const lastTier = tiers[tiers.length - 1];
                    return lastTier.max_qty === null || lastTier.max_qty === undefined;
                },
                { message: 'Last tier must be unlimited (max_qty = null)' }
            )
            .refine(
                (tiers) => {
                    // Check: sorted by min_qty
                    for (let i = 1; i < tiers.length; i++) {
                        if (tiers[i].min_qty <= tiers[i - 1].min_qty) {
                            return false;
                        }
                    }
                    return true;
                },
                { message: 'Price tiers must be sorted by min_qty in ascending order' }
            )
            .refine(
                (tiers) => {
                    // Check: no overlap
                    for (let i = 1; i < tiers.length; i++) {
                        const prevMax = tiers[i - 1].max_qty;
                        const currMin = tiers[i].min_qty;

                        if (prevMax !== null && prevMax >= currMin) {
                            return false;
                        }
                    }
                    return true;
                },
                { message: 'Price tiers have overlapping quantities' }
            ),

        // ✅ Order constraints
        min_order_qty: z
            .number()
            .int()
            .positive('Minimum order must be at least 1')
            .default(1),

        max_order_qty: z
            .number()
            .int()
            .positive('Maximum order must be positive')
            .nullable()
            .optional(),

        qty_step: z
            .number()
            .int()
            .positive('Quantity step must be at least 1')
            .default(1),

        // ✅ Visibility
        is_default: z.boolean().default(false),

        currency: z
            .enum(['VND', 'USD', 'EUR'])
            .default('VND'),
    })
    .refine(
        (data) => {
            // Check: max_order_qty >= min_order_qty
            if (data.max_order_qty && data.max_order_qty < data.min_order_qty) {
                return false;
            }
            return true;
        },
        {
            message: 'max_order_qty must be >= min_order_qty',
            path: ['max_order_qty'],
        }
    );

/**
 * UPDATE Variant Unit Schema
 * 
 * ✅ All optional
 * ✅ Re-validate tiers if provided
 * ⚠️ Cannot update: pack_size (unique constraint)
 */
const updateVariantUnitSchema = z
    .object({
        unit_type: z
            .enum(['UNIT', 'PACK', 'BOX', 'CARTON'])
            .optional(),

        display_name: z
            .string()
            .min(1, 'Display name is required')
            .max(100, 'Display name must not exceed 100 characters')
            .trim()
            .optional(),

        price_tiers: z
            .array(priceTierSchema)
            .min(1, 'At least one price tier is required')
            .refine(
                (tiers) => {
                    const lastTier = tiers[tiers.length - 1];
                    return lastTier.max_qty === null || lastTier.max_qty === undefined;
                },
                { message: 'Last tier must be unlimited (max_qty = null)' }
            )
            .refine(
                (tiers) => {
                    for (let i = 1; i < tiers.length; i++) {
                        if (tiers[i].min_qty <= tiers[i - 1].min_qty) {
                            return false;
                        }
                    }
                    return true;
                },
                { message: 'Price tiers must be sorted by min_qty in ascending order' }
            )
            .refine(
                (tiers) => {
                    for (let i = 1; i < tiers.length; i++) {
                        const prevMax = tiers[i - 1].max_qty;
                        const currMin = tiers[i].min_qty;

                        if (prevMax !== null && prevMax >= currMin) {
                            return false;
                        }
                    }
                    return true;
                },
                { message: 'Price tiers have overlapping quantities' }
            )
            .optional(),

        min_order_qty: z
            .number()
            .int()
            .positive('Minimum order must be at least 1')
            .optional(),

        max_order_qty: z
            .number()
            .int()
            .positive('Maximum order must be positive')
            .nullable()
            .optional(),

        qty_step: z
            .number()
            .int()
            .positive('Quantity step must be at least 1')
            .optional(),

        is_default: z.boolean().optional(),

        currency: z.enum(['VND', 'USD', 'EUR']).optional(),
    })
    .refine(
        (data) => {
            // Check: max_order_qty >= min_order_qty (if both provided)
            if (
                data.max_order_qty &&
                data.min_order_qty &&
                data.max_order_qty < data.min_order_qty
            ) {
                return false;
            }
            return true;
        },
        {
            message: 'max_order_qty must be >= min_order_qty',
            path: ['max_order_qty'],
        }
    );

/**
 * Calculate Price Schema
 * 
 * ✅ Input: qty_packs (number of packs user wants)
 * ✅ Output: unit_price, total_price, total_items, price_per_unit
 */
const calculatePriceSchema = z.object({
    qty_packs: z
        .number()
        .int()
        .positive('Quantity must be at least 1')
        .max(1000000, 'Quantity exceeds maximum'),
});

/**
 * Validate Price Tiers Schema
 * 
 * ✅ Standalone validation (useful for bulk operations)
 */
const validatePriceTiersSchema = z
    .array(priceTierSchema)
    .min(1, 'At least one price tier is required')
    .refine(
        (tiers) => {
            const lastTier = tiers[tiers.length - 1];
            return lastTier.max_qty === null || lastTier.max_qty === undefined;
        },
        { message: 'Last tier must be unlimited (max_qty = null)' }
    )
    .refine(
        (tiers) => {
            for (let i = 1; i < tiers.length; i++) {
                if (tiers[i].min_qty <= tiers[i - 1].min_qty) {
                    return false;
                }
            }
            return true;
        },
        { message: 'Price tiers must be sorted by min_qty in ascending order' }
    )
    .refine(
        (tiers) => {
            for (let i = 1; i < tiers.length; i++) {
                const prevMax = tiers[i - 1].max_qty;
                const currMin = tiers[i].min_qty;

                if (prevMax !== null && prevMax >= currMin) {
                    return false;
                }
            }
            return true;
        },
        { message: 'Price tiers have overlapping quantities' }
    );

/**
 * Get Price Tier Summary Schema
 * 
 * @param unitId - Unit MongoDB ObjectId
 */
const getPriceTierSummarySchema = z.object({
    unitId: objectIdSchema,
});

/**
 * Get Max Orderable Quantity Schema
 * 
 * @param unitId - Unit MongoDB ObjectId
 */
const getMaxOrderableQtySchema = z.object({
    unitId: objectIdSchema,
});

/**
 * Get Variant Units by Variant Schema
 * 
 * @param variantId - Variant MongoDB ObjectId
 */
const getVariantUnitsByVariantSchema = z.object({
    variantId: objectIdSchema,
});

/**
 * Get Variant Unit by ID Schema
 * 
 * @param unitId - Unit MongoDB ObjectId
 */
const getVariantUnitByIdSchema = z.object({
    unitId: objectIdSchema,
});

/**
 * Get Default Variant Unit Schema
 * 
 * @param variantId - Variant MongoDB ObjectId
 */
const getDefaultVariantUnitSchema = z.object({
    variantId: objectIdSchema,
});

module.exports = {
    createVariantUnitSchema,
    updateVariantUnitSchema,
    calculatePriceSchema,
    validatePriceTiersSchema,
    getPriceTierSummarySchema,
    getMaxOrderableQtySchema,
    getVariantUnitsByVariantSchema,
    getVariantUnitByIdSchema,
    getDefaultVariantUnitSchema,
};