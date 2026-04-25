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
 * ✅ Address snapshot schema (nested in order)
 * 
 * Rules:
 * - street, district, city required
 * - phone must be valid Vietnamese format (10-11 digits)
 * - recipient_name required
 */
const addressSnapshotSchema = z.object({
    street: z
        .string()
        .min(1, 'Street is required')
        .max(200, 'Street must not exceed 200 characters')
        .trim(),

    district: z
        .string()
        .min(1, 'District is required')
        .max(100, 'District must not exceed 100 characters')
        .trim(),

    city: z
        .string()
        .min(1, 'City is required')
        .max(100, 'City must not exceed 100 characters')
        .trim(),

    postal_code: z
        .string()
        .max(20, 'Postal code must not exceed 20 characters')
        .optional(),

    country: z
        .string()
        .default('Vietnam')
        .optional(),

    phone: z
        .string()
        .regex(
            /^(?:0[1-9]\d{8}|0[1-9]\d{9})$/,
            'Phone must be valid Vietnamese format (10-11 digits starting with 0)'
        )
        .trim(),

    recipient_name: z
        .string()
        .min(2, 'Recipient name must be at least 2 characters')
        .max(100, 'Recipient name must not exceed 100 characters')
        .trim(),
});

/**
 * ✅ Order item schema (nested in order items array)
 * 
 * Rules:
 * - product_id, variant_id, unit_id required
 * - quantity_ordered >= 1
 * - unit_price > 0
 * - line_total = quantity_ordered × unit_price
 */
const orderItemSchema = z.object({
    // ✅ References
    product_id: objectIdSchema,
    variant_id: objectIdSchema,
    unit_id: objectIdSchema,

    // ✅ Snapshots (immutable at order time)
    product_name: z
        .string()
        .min(1, 'Product name is required')
        .max(200, 'Product name must not exceed 200 characters')
        .trim(),

    product_image: z
        .string()
        .url('Product image must be a valid URL')
        .optional(),

    variant_label: z
        .string()
        .min(1, 'Variant label is required')
        .max(100, 'Variant label must not exceed 100 characters')
        .trim(),

    sku: z
        .string()
        .min(1, 'SKU is required')
        .max(50, 'SKU must not exceed 50 characters')
        .trim(),

    unit_label: z
        .string()
        .min(1, 'Unit label is required')
        .max(100, 'Unit label must not exceed 100 characters')
        .trim(),

    pack_size: z
        .number()
        .int()
        .positive('Pack size must be at least 1'),

    // ✅ Quantity tracking
    quantity_ordered: z
        .number()
        .int()
        .positive('Quantity ordered must be at least 1')
        .max(1000000, 'Quantity exceeds maximum'),

    quantity_fulfilled: z
        .number()
        .int()
        .nonnegative('Quantity fulfilled cannot be negative')
        .default(0),

    // ✅ Pricing snapshot (immutable)
    unit_price: z
        .number()
        .positive('Unit price must be greater than 0'),

    line_total: z
        .number()
        .positive('Line total must be greater than 0'),

    // ✅ Review status
    review_status: z
        .enum(['pending', 'reviewed'])
        .default('pending'),
});

/**
 * ✅ Pricing schema
 * 
 * Rules:
 * - subtotal >= 0
 * - discount_amount >= 0 and <= subtotal
 * - total_amount = subtotal - discount + shipping
 */
const pricingSchema = z
    .object({
        subtotal: z
            .number()
            .nonnegative('Subtotal cannot be negative'),

        shipping_fee: z
            .number()
            .nonnegative('Shipping fee cannot be negative')
            .default(0),

        discount_amount: z
            .number()
            .nonnegative('Discount amount cannot be negative')
            .default(0),

        total_amount: z
            .number()
            .nonnegative('Total amount cannot be negative'),
    })
    .refine(
        (pricing) => {
            // Discount cannot exceed subtotal
            return pricing.discount_amount <= pricing.subtotal;
        },
        {
            message: 'Discount cannot exceed subtotal',
            path: ['discount_amount'],
        }
    )
    .refine(
        (pricing) => {
            // Total should equal: subtotal - discount + shipping
            const expected = pricing.subtotal - pricing.discount_amount + pricing.shipping_fee;
            // Allow 1 cent rounding error
            return Math.abs(pricing.total_amount - expected) < 1;
        },
        {
            message: 'Total amount calculation is incorrect',
            path: ['total_amount'],
        }
    );

/**
 * ✅ Discount schema
 * 
 * Rules:
 * - type: percentage | fixed
 * - scope: ORDER | ITEM
 * - value > 0
 * - applied_amount > 0
 * - code optional (for promo tracking)
 */
const discountSchema = z
    .object({
        code: z
            .string()
            .max(50, 'Discount code must not exceed 50 characters')
            .optional(),

        type: z.enum(['percentage', 'fixed']),

        value: z
            .number()
            .positive('Discount value must be greater than 0'),

        scope: z
            .enum(['ORDER', 'ITEM'])
            .default('ORDER'),

        applied_amount: z
            .number()
            .nonnegative('Applied amount cannot be negative'),
    })
    .refine(
        (discount) => {
            // If percentage, value must be <= 100
            if (discount.type === 'percentage') {
                return discount.value <= 100;
            }
            return true;
        },
        {
            message: 'Percentage discount cannot exceed 100%',
            path: ['value'],
        }
    );

/**
 * ✅ Payment schema
 * 
 * Rules:
 * - method: COD | VNPAY | MOMO | CARD
 * - status: PENDING | PAID | FAILED | REFUNDED
 */
const paymentSchema = z.object({
    method: z.enum(['COD', 'VNPAY', 'MOMO', 'CARD']),

    status: z
        .enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED'])
        .default('PENDING'),

    paid_at: z.date().optional().nullable(),

    refunded_at: z.date().optional().nullable(),
});

/**
 * ✅ Shipment schema (lightweight)
 * 
 * Rules:
 * - carrier: GHN | GRAB | VIETTEL | etc
 * - tracking_code required if shipped
 */
const shipmentSchema = z
    .object({
        carrier: z
            .string()
            .max(50, 'Carrier name must not exceed 50 characters')
            .optional(),

        tracking_code: z
            .string()
            .max(100, 'Tracking code must not exceed 100 characters')
            .optional(),

        shipped_at: z.date().optional().nullable(),

        delivered_at: z.date().optional().nullable(),
    })
    .refine(
        (shipment) => {
            // If tracking_code exists, carrier must also exist
            if (shipment.tracking_code && !shipment.carrier) {
                return false;
            }
            return true;
        },
        {
            message: 'Carrier is required if tracking code is provided',
            path: ['carrier'],
        }
    );

/**
 * ✅ Status history record schema
 * 
 * Rules:
 * - from, to must be valid status
 * - changed_at required
 * - changed_by optional (null = system)
 */
const statusHistoryRecordSchema = z.object({
    from: z
        .enum(['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'FAILED', 'CANCELED'])
        .nullable(),

    to: z.enum(['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'FAILED', 'CANCELED']),

    changed_at: z.date(),

    changed_by: objectIdOptionalSchema,

    note: z
        .string()
        .max(500, 'Note must not exceed 500 characters')
        .optional(),
});

/**
 * CREATE Order Schema (from cart checkout)
 * 
 * ✅ Require:
 * - address_snapshot
 * - items (at least 1)
 * - pricing
 * - payment method
 * 
 * ✅ Optional:
 * - discount
 * - customer_notes
 * - currency (default VND)
 * 
 * ⚠️ Order code generated automatically (NOT in request)
 * ⚠️ user_id from JWT token (NOT in request)
 */
const createOrderSchema = z
    .object({
        address_snapshot: addressSnapshotSchema,

        items: z
            .array(orderItemSchema)
            .min(1, 'Order must contain at least one item'),

        pricing: pricingSchema,

        discount: discountSchema.optional().nullable(),

        payment: z.object({
            method: z.enum(['COD', 'VNPAY', 'MOMO', 'CARD']),
        }),

        customer_notes: z
            .string()
            .max(500, 'Customer notes must not exceed 500 characters')
            .optional(),

        currency: z
            .enum(['VND', 'USD', 'EUR'])
            .default('VND'),
    })
    .refine(
        (order) => {
            // Verify items pricing: line_total = quantity × unit_price
            for (const item of order.items) {
                const expected = item.quantity_ordered * item.unit_price;
                // Allow 1 cent rounding error
                if (Math.abs(item.line_total - expected) >= 1) {
                    return false;
                }
            }
            return true;
        },
        {
            message: 'Item line total calculation is incorrect',
            path: ['items'],
        }
    )
    .refine(
        (order) => {
            // Verify subtotal: sum of all line_totals
            const subtotal = order.items.reduce(
                (sum, item) => sum + item.line_total,
                0
            );
            // Allow 1 cent rounding error
            return Math.abs(subtotal - order.pricing.subtotal) < 1;
        },
        {
            message: 'Subtotal calculation is incorrect',
            path: ['pricing'],
        }
    );

/**
 * GET Orders Query Schema (for pagination + filtering)
 * 
 * ✅ Pagination:
 * - page (1-indexed)
 * - limit (max 100)
 * 
 * ✅ Filtering:
 * - status (single or multiple)
 * - payment_status
 * - date_from, date_to
 */
const getOrdersSchema = z.object({
    page: z
        .string()
        .transform((v) => parseInt(v, 10))
        .refine((v) => v >= 1, 'Page must be >= 1')
        .default('1'),

    limit: z
        .string()
        .transform((v) => parseInt(v, 10))
        .refine((v) => v > 0 && v <= 100, 'Limit must be between 1-100')
        .default('20'),

    status: z
        .string()
        .transform((v) => v.split(',').filter(Boolean))
        .refine(
            (statuses) =>
                statuses.every((s) =>
                    ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'FAILED', 'CANCELED'].includes(s)
                ),
            'Invalid status value'
        )
        .optional(),

    payment_status: z
        .enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED'])
        .optional(),

    date_from: z
        .string()
        .transform((v) => new Date(v))
        .refine((d) => !isNaN(d.getTime()), 'Invalid date format')
        .optional(),

    date_to: z
        .string()
        .transform((v) => new Date(v))
        .refine((d) => !isNaN(d.getTime()), 'Invalid date format')
        .optional(),
});

/**
 * Update Order Status Schema (admin action)
 * 
 * ✅ Admin can transition status + add note
 */
const updateOrderStatusSchema = z.object({
    status: z.enum(['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'FAILED', 'CANCELED']),

    note: z
        .string()
        .max(500, 'Note must not exceed 500 characters')
        .optional(),
});

/**
 * Fulfill Items Schema (admin/warehouse action)
 * 
 * ✅ Mark items as fulfilled (quantity tracking)
 */
const fulfillItemsSchema = z.object({
    item_id: objectIdSchema,

    quantity_fulfilled: z
        .number()
        .int()
        .positive('Quantity fulfilled must be at least 1')
        .max(1000000, 'Quantity exceeds maximum'),
});

/**
 * Record Shipment Schema (admin/warehouse action)
 * 
 * ✅ Add shipment details (carrier + tracking code)
 */
const recordShipmentSchema = z.object({
    carrier: z
        .string()
        .min(1, 'Carrier is required')
        .max(50, 'Carrier name must not exceed 50 characters')
        .trim(),

    tracking_code: z
        .string()
        .min(1, 'Tracking code is required')
        .max(100, 'Tracking code must not exceed 100 characters')
        .trim(),
});

/**
 * Confirm Delivery Schema (system/tracking action)
 * 
 * ✅ Mark order as delivered
 */
const confirmDeliverySchema = z.object({
    // Empty: triggered by tracking system or admin confirmation
});

/**
 * Cancel Order Schema (customer/admin action)
 * 
 * ✅ Require reason for cancellation
 */
const cancelOrderSchema = z.object({
    reason: z
        .string()
        .min(1, 'Cancellation reason is required')
        .max(500, 'Reason must not exceed 500 characters')
        .trim(),
});

/**
 * Get Order by Code Schema (public tracking)
 * 
 * ✅ order_code format: ORD-YYYYMMDD-XXXXX
 */
const getOrderByCodeSchema = z.object({
    order_code: z
        .string()
        .regex(
            /^ORD-\d{8}-[A-Z0-9]{5}$/,
            'Invalid order code format'
        ),
});

/**
 * Get Order by ID Schema
 * 
 * ✅ Customer can only get their own order
 * ✅ Admin can get any order
 */
const getOrderByIdSchema = z.object({
    order_id: objectIdSchema,
});

/**
 * Admin Update Order Schema
 * 
 * ✅ Admin can update:
 * - status
 * - admin_notes
 */
const adminUpdateOrderSchema = z.object({
    status: z
        .enum(['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'FAILED', 'CANCELED'])
        .optional(),

    admin_notes: z
        .string()
        .max(1000, 'Admin notes must not exceed 1000 characters')
        .optional(),
});

/**
 * Write Review for Order Item Schema
 * 
 * ✅ Customer can review items after delivery
 * ✅ max 5 stars, max 500 chars
 */
const writeReviewSchema = z.object({
    item_id: objectIdSchema,

    rating: z
        .number()
        .int()
        .min(1, 'Rating must be at least 1')
        .max(5, 'Rating cannot exceed 5'),

    comment: z
        .string()
        .max(500, 'Comment must not exceed 500 characters')
        .optional(),
});

module.exports = {
    // Main schemas
    createOrderSchema,
    getOrdersSchema,
    updateOrderStatusSchema,

    // Action schemas
    fulfillItemsSchema,
    recordShipmentSchema,
    confirmDeliverySchema,
    cancelOrderSchema,

    // Lookup schemas
    getOrderByCodeSchema,
    getOrderByIdSchema,

    // Admin schemas
    adminUpdateOrderSchema,
    writeReviewSchema,

    // Nested schemas (for reuse)
    addressSnapshotSchema,
    orderItemSchema,
    pricingSchema,
    discountSchema,
    paymentSchema,
    shipmentSchema,
    statusHistoryRecordSchema,
};