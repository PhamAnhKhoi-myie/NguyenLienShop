const { z } = require('zod');
const mongoose = require('mongoose');

/**
 * ObjectId
 */
const objectIdSchema = z.string().refine(
    (val) => mongoose.Types.ObjectId.isValid(val),
    { message: 'Invalid MongoDB ObjectId' }
);

const objectIdOptionalSchema = objectIdSchema.optional().nullable();

/**
 * PARAMS (BẮT BUỘC CHO ROUTES)
 */
const variantIdParamSchema = z.object({
    variantId: objectIdSchema
});

const unitIdParamSchema = z.object({
    unitId: objectIdSchema
});

/**
 * PRICE TIERS
 */
const priceTierSchema = z.object({
    min_qty: z.number().int().positive(),
    max_qty: z.number().int().positive().nullable().optional(),
    unit_price: z.number().positive(),
});

/**
 * CREATE
 */
const createVariantUnitSchema = z.object({
    unit_type: z.enum(['UNIT', 'PACK', 'BOX', 'CARTON']).default('PACK'),

    display_name: z.string().min(1).max(100).trim(),

    pack_size: z.number().int().positive(),

    price_tiers: z
        .array(priceTierSchema)
        .min(1)
        .refine(
            (tiers) => {
                const last = tiers[tiers.length - 1];
                return last.max_qty === null || last.max_qty === undefined;
            },
            { message: 'Last tier must be unlimited (max_qty = null)' }
        )
        .refine(
            (tiers) => {
                for (let i = 1; i < tiers.length; i++) {
                    if (tiers[i].min_qty <= tiers[i - 1].min_qty) return false;
                }
                return true;
            },
            { message: 'Price tiers must be sorted' }
        )
        .refine(
            (tiers) => {
                for (let i = 1; i < tiers.length; i++) {
                    const prevMax = tiers[i - 1].max_qty;
                    const currMin = tiers[i].min_qty;
                    if (prevMax !== null && prevMax >= currMin) return false;
                }
                return true;
            },
            { message: 'Price tiers overlap' }
        ),

    min_order_qty: z.number().int().positive().default(1),

    max_order_qty: z.number().int().positive().nullable().optional(),

    qty_step: z.number().int().positive().default(1),

    is_default: z.boolean().default(false),

    currency: z.enum(['VND', 'USD', 'EUR']).default('VND'),
}).refine(
    (data) => {
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
 * UPDATE
 */
const updateVariantUnitSchema = z.object({
    unit_type: z.enum(['UNIT', 'PACK', 'BOX', 'CARTON']).optional(),

    display_name: z.string().min(1).max(100).trim().optional(),

    price_tiers: z
        .array(priceTierSchema)
        .min(1)
        .refine(
            (tiers) => {
                const last = tiers[tiers.length - 1];
                return last.max_qty === null || last.max_qty === undefined;
            }
        )
        .refine(
            (tiers) => {
                for (let i = 1; i < tiers.length; i++) {
                    if (tiers[i].min_qty <= tiers[i - 1].min_qty) return false;
                }
                return true;
            }
        )
        .refine(
            (tiers) => {
                for (let i = 1; i < tiers.length; i++) {
                    const prevMax = tiers[i - 1].max_qty;
                    const currMin = tiers[i].min_qty;
                    if (prevMax !== null && prevMax >= currMin) return false;
                }
                return true;
            }
        )
        .optional(),

    min_order_qty: z.number().int().positive().optional(),

    max_order_qty: z.number().int().positive().nullable().optional(),

    qty_step: z.number().int().positive().optional(),

    is_default: z.boolean().optional(),

    currency: z.enum(['VND', 'USD', 'EUR']).optional(),
}).refine(
    (data) => {
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
 * ACTIONS
 */
const calculatePriceSchema = z.object({
    qty_packs: z.number().int().positive().max(1000000),
});

const validatePriceTiersSchema = z.object({
    price_tiers: z.array(priceTierSchema).min(1),
});

/**
 * EXPORT
 */
module.exports = {
    createVariantUnitSchema,
    updateVariantUnitSchema,
    calculatePriceSchema,
    validatePriceTiersSchema,
    variantIdParamSchema,
    unitIdParamSchema
};
