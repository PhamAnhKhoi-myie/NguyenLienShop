const { z } = require('zod');

// ===== BASE =====
const objectIdSchema = z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');

const objectIdOptionalSchema = objectIdSchema.optional().nullable();

// ===== PARAMS =====
const shipmentIdParamSchema = z.object({
    shipmentId: objectIdSchema,
});

const orderIdParamSchema = z.object({
    orderId: objectIdSchema,
});

const trackingCodeParamSchema = z.object({
    tracking_code: z
        .string()
        .min(5)
        .max(100)
        .regex(/^[A-Z0-9\-_]+$/i)
        .transform((v) => v.toUpperCase()),
});

const carrierParamSchema = z.object({
    carrier: z.enum(['GHN', 'GHTK', 'JT', 'GRAB', 'BEST', 'OTHER']),
});

// ===== COMMON =====
const vietnamesePhoneSchema = z
    .string()
    .regex(/^(?:0[1-9]\d{8}|0[1-9]\d{9})$/);

const carrierSchema = z
    .enum(['GHN', 'GHTK', 'JT', 'GRAB', 'BEST', 'OTHER'])
    .default('GHN');

const trackingCodeSchema = z
    .string()
    .min(5)
    .max(100)
    .regex(/^[A-Z0-9\-_]+$/i)
    .transform((v) => v.toUpperCase());

const shipmentStatusSchema = z.enum([
    'pending',
    'picked_up',
    'in_transit',
    'at_destination',
    'delivered',
    'failed',
    'cancelled',
    'returned',
]);

const failureReasonSchema = z.enum([
    'address_incorrect',
    'recipient_unavailable',
    'refused_delivery',
    'damaged_package',
    'lost',
    'weather_delay',
    'carrier_error',
    'other',
]);

// ===== BODY =====
const shippingAddressSchema = z.object({
    recipient_name: z.string().min(2).max(100),
    phone: vietnamesePhoneSchema,
    address: z.string().min(5).max(200),
    ward: z.string().min(2).max(100),
    district: z.string().min(2).max(100),
    province: z.string().min(2).max(100),
    postal_code: z.string().max(20).optional(),
    country: z.string().default('Vietnam').optional(),
});

const createShipmentBodySchema = z.object({
    order_id: objectIdSchema,
    carrier: carrierSchema,
    tracking_code: trackingCodeSchema,
    shipping_address: shippingAddressSchema,
});

const cancelShipmentBodySchema = z.object({
    reason: z.string().min(5).max(500),
});

const updateShipmentStatusBodySchema = z.object({
    status: shipmentStatusSchema,
    notes: z.string().max(500).optional(),
}).refine(
    (data) => data.status !== 'failed',
    {
        message: 'Use failure endpoint to record failure reason and notes',
        path: ['status'],
    }
);

const recordShipmentFailureBodySchema = z
    .object({
        failure_reason: failureReasonSchema,
        failure_notes: z.string().trim().min(1).max(500),
    })
    .refine(
        (data) => {
            if (data.failure_reason === 'other' && !data.failure_notes) {
                return false;
            }
            return true;
        },
        {
            message: 'Failure notes are required when reason is "other"',
            path: ['failure_notes'],
        }
    );

const adminUpdateShipmentBodySchema = z
    .object({
        carrier: carrierSchema.optional(),
        tracking_code: trackingCodeSchema.optional(),
        admin_notes: z.string().max(1000).optional(),
    })
    .refine(
        (data) => {
            if (data.tracking_code && !data.carrier) {
                return false;
            }
            return true;
        },
        {
            message: 'Carrier is required if updating tracking code',
            path: ['carrier'],
        }
    );

const carrierWebhookBodySchema = z
    .object({
        tracking_code: trackingCodeSchema,
        status: z.string().min(1),
        carrier_details: z.record(z.any()).optional(),
        signature: z.string().min(1),
        timestamp: z.coerce.number().default(() => Math.floor(Date.now() / 1000)),
    });

// ===== QUERY =====
const listShipmentsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z
        .string()
        .optional()
        .transform((v) => (v ? v.split(',').filter(Boolean) : [])),
    carrier: carrierSchema.optional(),
    date_from: z.coerce.date().optional(),
    date_to: z.coerce.date().optional(),
});

const adminListShipmentsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z
        .string()
        .optional()
        .transform((v) => (v ? v.split(',').filter(Boolean) : [])),
    carrier: carrierSchema.optional(),
    user_id: objectIdOptionalSchema,
    order_id: objectIdOptionalSchema,
    date_from: z.coerce.date().optional(),
    date_to: z.coerce.date().optional(),
});

module.exports = {
    objectIdSchema,
    objectIdOptionalSchema,

    shipmentIdParamSchema,
    orderIdParamSchema,
    trackingCodeParamSchema,
    carrierParamSchema,

    createShipmentBodySchema,
    cancelShipmentBodySchema,
    updateShipmentStatusBodySchema,
    recordShipmentFailureBodySchema,
    adminUpdateShipmentBodySchema,
    carrierWebhookBodySchema,

    listShipmentsQuerySchema,
    adminListShipmentsQuerySchema,
};
