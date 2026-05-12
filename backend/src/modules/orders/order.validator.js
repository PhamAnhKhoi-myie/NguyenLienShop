const { z } = require('zod');
const mongoose = require('mongoose');

/**
 * Base schemas
 */
const objectIdSchema = z.string().refine(
    (val) => mongoose.Types.ObjectId.isValid(val),
    { message: 'Invalid MongoDB ObjectId' }
);

const objectIdOptionalSchema = objectIdSchema.optional().nullable();

/**
 * Param schemas
 */
const IdParamSchema = z.object({
    order_id: objectIdSchema,
});

const OrderCodeParamSchema = z.object({
    order_code: z.string().regex(
        /^ORD-\d{8}-[A-Z0-9]{5}$/,
        'Invalid order code format'
    ),
});

/**
 * Address
 */
const addressSnapshotSchema = z.object({
    street: z.string().min(1).max(200).trim(),
    district: z.string().min(1).max(100).trim(),
    city: z.string().min(1).max(100).trim(),
    postal_code: z.string().max(20).optional(),
    country: z.string().default('Vietnam').optional(),
    phone: z.string().regex(/^(?:0[1-9]\d{8}|0[1-9]\d{9})$/).trim(),
    recipient_name: z.string().min(2).max(100).trim(),
});

/**
 * Item
 */
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

    unit_price: z.number().positive(),
    line_total: z.number().positive(),

    review_status: z.enum(['pending', 'reviewed']).default('pending'),
});

/**
 * Pricing
 */
const pricingSchema = z.object({
    subtotal: z.number().nonnegative(),
    shipping_fee: z.number().nonnegative().default(0),
    discount_amount: z.number().nonnegative().default(0),
    total_amount: z.number().nonnegative(),
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

/**
 * Discount
 */
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

/**
 * Payment
 */
const paymentSchema = z.object({
    method: z.enum(['COD', 'VNPAY', 'MOMO', 'CARD']),
    status: z.enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED']).default('PENDING'),
    paid_at: z.date().optional().nullable(),
    refunded_at: z.date().optional().nullable(),
});

/**
 * Shipment
 */
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

/**
 * Status history
 */
const statusHistoryRecordSchema = z.object({
    from: z.enum(['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'FAILED', 'CANCELED']).nullable(),
    to: z.enum(['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'FAILED', 'CANCELED']),
    changed_at: z.date(),
    changed_by: objectIdOptionalSchema,
    note: z.string().max(500).optional(),
});

/**
 * Body schemas
 */
const createOrderBodySchema = z.object({
    address_snapshot: addressSnapshotSchema,
    items: z.array(orderItemSchema).min(1),
    pricing: pricingSchema,
    discount: discountSchema.optional().nullable(),
    payment: z.object({
        method: z.enum(['COD', 'VNPAY', 'MOMO', 'CARD']),
    }),
    customer_notes: z.string().max(500).optional(),
    currency: z.enum(['VND', 'USD', 'EUR']).default('VND'),
})
    .refine(
        (order) =>
            order.items.every(
                (item) =>
                    Math.abs(item.line_total - item.quantity_ordered * item.unit_price) < 1
            ),
        { message: 'Item line total calculation is incorrect', path: ['items'] }
    )
    .refine(
        (order) => {
            const subtotal = order.items.reduce((s, i) => s + i.line_total, 0);
            return Math.abs(subtotal - order.pricing.subtotal) < 1;
        },
        { message: 'Subtotal calculation is incorrect', path: ['pricing'] }
    );

const cancelOrderBodySchema = z.object({
    reason: z.string().min(1).max(500).trim(),
});

const writeReviewBodySchema = z.object({
    item_id: objectIdSchema,
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(500).optional(),
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

/**
 * Query schemas
 */
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
    // params
    IdParamSchema,
    OrderCodeParamSchema,

    // body
    createOrderBodySchema,
    cancelOrderBodySchema,
    writeReviewBodySchema,
    updateOrderStatusBodySchema,
    fulfillItemsBodySchema,
    recordShipmentBodySchema,
    adminUpdateOrderBodySchema,

    // query
    getOrdersQuerySchema,

    // nested
    objectIdSchema,
    addressSnapshotSchema,
    orderItemSchema,
    pricingSchema,
    discountSchema,
    paymentSchema,
    shipmentSchema,
    statusHistoryRecordSchema,
};