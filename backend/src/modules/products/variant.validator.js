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

const productIdParamSchema = z.object({
    productId: objectIdSchema
});




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




const createVariantSchema = z.object({
    size: z
        .string()
        .min(1, 'Size is required')
        .max(50)
        .trim(),

    fabric_type: z
        .string()
        .min(1, 'Fabric type is required')
        .max(100)
        .trim(),

    stock: stockSchema.optional(),

    status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});




const updateVariantSchema = z.object({
    size: z
        .string()
        .min(1)
        .max(50)
        .trim()
        .optional(),

    fabric_type: z
        .string()
        .min(1)
        .max(100)
        .trim()
        .optional(),

    stock: stockSchema.optional(),

    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});




const reserveStockSchema = z.object({
    qty_items: z
        .number()
        .int()
        .positive()
        .max(1000000),
});

const completeSaleSchema = z.object({
    qty_items: z
        .number()
        .int()
        .positive()
        .max(1000000),
});

const releaseReservedStockSchema = z.object({
    qty_items: z
        .number()
        .int()
        .positive()
        .max(1000000),
});




const getMaxOrderQtySchema = z.object({
    pack_size: z
        .string()
        .transform((v) => parseInt(v, 10))
        .refine((v) => v > 0, 'Pack size must be > 0')
        .default('100'),
});

module.exports = {
    createVariantSchema,
    updateVariantSchema,
    reserveStockSchema,
    completeSaleSchema,
    releaseReservedStockSchema,
    getMaxOrderQtySchema,
    variantIdParamSchema,
    productIdParamSchema
};