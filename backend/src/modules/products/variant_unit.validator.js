const { z } = require('zod');
const mongoose = require('mongoose');




const objectIdSchema = z.string().refine(
    (val) => mongoose.Types.ObjectId.isValid(val),
    { message: 'Invalid MongoDB ObjectId' }
);

const objectIdOptionalSchema = objectIdSchema.optional().nullable();




const variantIdParamSchema = z.object({
    variantId: objectIdSchema
});

const unitIdParamSchema = z.object({
    unitId: objectIdSchema
});




const priceTierSchema = z.object({
    min_qty: z.number().int().positive(),
    max_qty: z.number().int().positive().nullable().optional(),
    unit_price: z.number().int().positive(),
});

const promotionSchema = z
    .object({
        enabled: z.boolean().default(false),
        type: z.enum(['FIXED', 'PERCENT']).default('FIXED'),
        value: z.number().int().nonnegative().default(0),
        starts_at: z.coerce.date().nullable().optional(),
        ends_at: z.coerce.date().nullable().optional(),
        allow_voucher: z.boolean().default(true),
    })
    .refine(
        (promotion) =>
            !promotion.enabled ||
            (promotion.value > 0 &&
                (promotion.type !== 'PERCENT' ||
                    promotion.value < 100)),
        {
            message:
                'Enabled promotion requires a positive value; percent must be less than 100',
            path: ['value'],
        }
    )
    .refine(
        (promotion) =>
            !promotion.starts_at ||
            !promotion.ends_at ||
            promotion.ends_at > promotion.starts_at,
        {
            message: 'Promotion end time must be after start time',
            path: ['ends_at'],
        }
    );




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

    promotion: promotionSchema.default({
        enabled: false,
        type: 'FIXED',
        value: 0,
        starts_at: null,
        ends_at: null,
        allow_voucher: true,
    }),

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

    promotion: promotionSchema.optional(),

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




const calculatePriceSchema = z.object({
    qty_packs: z.number().int().positive().max(1000000),
});

const validatePriceTiersSchema = z.object({
    price_tiers: z.array(priceTierSchema).min(1),
});




module.exports = {
    createVariantUnitSchema,
    updateVariantUnitSchema,
    calculatePriceSchema,
    validatePriceTiersSchema,
    variantIdParamSchema,
    unitIdParamSchema
};
