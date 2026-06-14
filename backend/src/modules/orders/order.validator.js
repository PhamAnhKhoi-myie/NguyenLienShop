const { z } = require('zod');
const mongoose = require('mongoose');




const objectIdSchema = z.string().refine(
    (val) => mongoose.Types.ObjectId.isValid(val),
    { message: 'Invalid MongoDB ObjectId' }
);

const objectIdOptionalSchema = objectIdSchema.optional().nullable();




const IdParamSchema = z.object({
    order_id: objectIdSchema,
});

const OrderCodeParamSchema = z.object({
    order_code: z.string().regex(
        /^ORD-\d{8}-[A-Z0-9]{5}$/,
        'Invalid order code format'
    ),
});




const addressSnapshotSchema = z.object({
    receiver_name: z.string().min(1).max(100).trim(),
    phone: z.string().regex(/^(0|\+84)[0-9]{9}$/).trim(),
    province_code: z.string().trim().regex(/^\d{2}$/),
    ward_code: z.string().trim().regex(/^\d{5}$/),
    detail: z.string().min(5).max(255).trim(),
    note: z.string().trim().max(500).nullable().optional(),
}).strict();




const orderItemSchema = z.object({
    product_id: objectIdSchema,
    variant_id: objectIdSchema,
    unit_id: objectIdSchema,

    product_name: z.string().min(1).max(200).trim(),
    product_image: z.string().url().optional(),
    variant_label: z.string().min(1).max(100).trim(),
    sku: z.string().min(1).max(50).trim(),
    unit_label: z.string().min(1).max(100).trim(),

    pack_size: z.number().int().positive(),

    quantity_ordered: z.number().int().positive().max(1000000),
    quantity_fulfilled: z.number().int().nonnegative().default(0),

    original_unit_price: z.number().int().positive().optional(),
    unit_price: z.number().int().positive(),
    promotion_discount_amount:
        z.number().int().nonnegative().default(0),
    promotion_discount_percent:
        z.number().int().min(0).max(99).default(0),
    is_on_sale: z.boolean().default(false),
    original_line_total: z.number().int().positive().optional(),
    line_total: z.number().int().positive(),

    review_status: z.enum(['pending', 'reviewed']).default('pending'),
});




const pricingSchema = z.object({
    original_subtotal: z.number().int().nonnegative().optional(),
    promotion_discount_amount:
        z.number().int().nonnegative().default(0),
    subtotal: z.number().int().nonnegative(),
    shipping_fee: z.number().int().nonnegative().default(0),
    discount_amount: z.number().int().nonnegative().default(0),
    total_amount: z.number().int().nonnegative(),
})
    .refine(
        (p) => p.discount_amount <= p.subtotal,
        { message: 'Discount cannot exceed subtotal', path: ['discount_amount'] }
    )
    .refine(
        (p) => {
            const expected = p.subtotal - p.discount_amount + p.shipping_fee;
            return Math.abs(p.total_amount - expected) < 1;
        },
        { message: 'Total amount calculation is incorrect', path: ['total_amount'] }
    );




const discountSchema = z.object({
    code: z.string().max(50).optional(),
    type: z.enum(['percentage', 'fixed']),
    value: z.number().positive(),
    scope: z.enum(['ORDER', 'ITEM']).default('ORDER'),
    applied_amount: z.number().nonnegative(),
})
    .refine(
        (d) => d.type !== 'percentage' || d.value <= 100,
        { message: 'Percentage discount cannot exceed 100%', path: ['value'] }
    );




const paymentSchema = z.object({
    method: z.enum(['COD', 'VNPAY', 'PAYOS', 'MOMO', 'CARD']),
    status: z.enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED']).default('PENDING'),
    paid_at: z.date().optional().nullable(),
    refunded_at: z.date().optional().nullable(),
});




const shipmentSchema = z.object({
    carrier: z.string().max(50).optional(),
    tracking_code: z.string().max(100).optional(),
    shipped_at: z.date().optional().nullable(),
    delivered_at: z.date().optional().nullable(),
})
    .refine(
        (s) => !(s.tracking_code && !s.carrier),
        { message: 'Carrier is required if tracking code is provided', path: ['carrier'] }
    );




const statusHistoryRecordSchema = z.object({
    from: z.enum(['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'FAILED', 'CANCELED']).nullable(),
    to: z.enum(['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'FAILED', 'CANCELED']),
    changed_at: z.date(),
    changed_by: objectIdOptionalSchema,
    note: z.string().max(500).optional(),
});




const createOrderBodySchema = z.object({
    cart_id: objectIdSchema,

    address_snapshot: addressSnapshotSchema,

    payment_method: z
        .enum(['COD', 'VNPAY', 'PAYOS', 'MOMO', 'CARD'])
        .default('COD'),

    customer_notes: z
        .string()
        .max(500, 'customer_notes cannot exceed 500 characters')
        .optional(),

}).strict();

const cancelOrderBodySchema = z.object({
    reason: z.string().min(1).max(500).trim(),
});

const writeReviewBodySchema = z.object({
    item_id: objectIdSchema,
    rating: z.number().int().min(1).max(5),
    title: z.string().trim().max(200).optional().nullable(),
    comment: z.string().trim().min(10).max(500),
});

const updateOrderStatusBodySchema = z.object({
    status: z.enum(['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'FAILED', 'CANCELED']),
    note: z.string().max(500).optional(),
});

const fulfillItemsBodySchema = z.object({
    item_id: objectIdSchema,
    quantity_fulfilled: z.number().int().positive().max(1000000),
});

const recordShipmentBodySchema = z.object({
    carrier: z.string().min(1).max(50).trim(),
    tracking_code: z.string().min(1).max(100).trim(),
});

const adminUpdateOrderBodySchema = z.object({
    status: z.enum(['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'FAILED', 'CANCELED']).optional(),
    admin_notes: z.string().max(1000).optional(),
});




const getOrdersQuerySchema = z.object({
    page: z.string().transform((v) => parseInt(v, 10)).refine((v) => v >= 1).default('1'),
    limit: z.string().transform((v) => parseInt(v, 10)).refine((v) => v > 0 && v <= 100).default('20'),

    status: z.string()
        .transform((v) => v.split(',').filter(Boolean))
        .refine(
            (arr) => arr.every((s) =>
                ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'FAILED', 'CANCELED'].includes(s)
            )
        )
        .optional(),

    payment_status: z.enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED']).optional(),

    date_from: z.string().transform((v) => new Date(v)).refine((d) => !isNaN(d.getTime())).optional(),
    date_to: z.string().transform((v) => new Date(v)).refine((d) => !isNaN(d.getTime())).optional(),
});

module.exports = {

    IdParamSchema,
    OrderCodeParamSchema,


    createOrderBodySchema,
    cancelOrderBodySchema,
    writeReviewBodySchema,
    updateOrderStatusBodySchema,
    fulfillItemsBodySchema,
    recordShipmentBodySchema,
    adminUpdateOrderBodySchema,


    getOrdersQuerySchema,


    objectIdSchema,
    addressSnapshotSchema,
    orderItemSchema,
    pricingSchema,
    discountSchema,
    paymentSchema,
    shipmentSchema,
    statusHistoryRecordSchema,
};
