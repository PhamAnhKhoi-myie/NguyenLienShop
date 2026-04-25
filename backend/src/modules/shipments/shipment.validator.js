const { z } = require('zod');
const mongoose = require('mongoose');

/**
 * ============================================
 * SHIPMENT VALIDATORS (Zod Schemas)
 * ============================================
 * 
 * ✅ Validate request bodies before controller logic
 * ✅ Follow project conventions (snake_case fields)
 * ✅ Provide clear error messages (EN + VI)
 * ✅ Use custom refine() for cross-field validation
 * ✅ Financial/numeric fields MUST be validated
 */

// ===== CUSTOM VALIDATORS =====

/**
 * ✅ MongoDB ObjectId validator
 * Consistent pattern with order.validator.js & payment.validator.js
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
 * ✅ Vietnamese phone validator
 * Format: 0XXXXXXXXXX (10-11 digits)
 * Matches: 0xxx 9 digits OR 0xxx 10 digits
 */
const vietnamesePhoneSchema = z
    .string()
    .regex(
        /^(?:0[1-9]\d{8}|0[1-9]\d{9})$/,
        'Phone must be valid Vietnamese format (10-11 digits starting with 0)'
    )
    .trim();

/**
 * ✅ Carrier validator
 * Standard Vietnamese logistics providers
 */
const carrierSchema = z
    .enum(['GHN', 'GHTK', 'JT', 'GRAB', 'BEST', 'OTHER'])
    .default('GHN');

/**
 * ✅ Tracking code validator
 * Format: carrier-dependent (alphanumeric + hyphen/underscore)
 */
const trackingCodeSchema = z
    .string()
    .min(5, 'Tracking code must be at least 5 characters')
    .max(100, 'Tracking code must not exceed 100 characters')
    .regex(
        /^[A-Z0-9\-_]+$/i,
        'Tracking code must be alphanumeric (with hyphens/underscores)'
    )
    .trim()
    .toUpperCase();

/**
 * ✅ Shipment status validator
 * State machine: pending → delivered/failed/cancelled/returned
 */
const shipmentStatusSchema = z.enum([
    'pending',        // Awaiting pickup
    'picked_up',      // Picked up by carrier
    'in_transit',     // On delivery route
    'at_destination', // At local hub
    'delivered',      // Successfully delivered
    'failed',         // Delivery failed
    'cancelled',      // Cancelled before delivery
    'returned',       // Returned to sender
]);

/**
 * ✅ Failure reason validator
 * Why delivery failed
 */
const failureReasonSchema = z.enum([
    'address_incorrect',        // Address not found/invalid
    'recipient_unavailable',    // No one at home
    'refused_delivery',         // Customer refused
    'damaged_package',          // Package damaged
    'lost',                     // Package lost
    'weather_delay',            // Weather prevented delivery
    'carrier_error',            // Carrier error
    'other',                    // Other reason

]);

/**
 * ✅ Shipping address schema
 * Snapshot from order, immutable
 */
const shippingAddressSchema = z.object({
    recipient_name: z
        .string()
        .min(2, 'Recipient name must be at least 2 characters')
        .max(100, 'Recipient name must not exceed 100 characters')
        .trim(),

    phone: vietnamesePhoneSchema,

    address: z
        .string()
        .min(5, 'Address must be at least 5 characters')
        .max(200, 'Address must not exceed 200 characters')
        .trim(),

    ward: z
        .string()
        .min(2, 'Ward must be at least 2 characters')
        .max(100, 'Ward must not exceed 100 characters')
        .trim(),

    district: z
        .string()
        .min(2, 'District must be at least 2 characters')
        .max(100, 'District must not exceed 100 characters')
        .trim(),

    province: z
        .string()
        .min(2, 'Province must be at least 2 characters')
        .max(100, 'Province must not exceed 100 characters')
        .trim(),

    postal_code: z
        .string()
        .max(20, 'Postal code must not exceed 20 characters')
        .optional(),

    country: z
        .string()
        .default('Vietnam')
        .optional(),
});

/**
 * ✅ Timeline schema
 * State transition timestamps (immutable)
 */
const timelineSchema = z
    .object({
        created_at: z
            .date()
            .default(() => new Date()),

        picked_up_at: z
            .date()
            .optional()
            .nullable(),

        in_transit_at: z
            .date()
            .optional()
            .nullable(),

        at_destination_at: z
            .date()
            .optional()
            .nullable(),

        delivered_at: z
            .date()
            .optional()
            .nullable(),

        failed_at: z
            .date()
            .optional()
            .nullable(),

        cancelled_at: z
            .date()
            .optional()
            .nullable(),

        returned_at: z
            .date()
            .optional()
            .nullable(),
    })
    .refine(
        (timeline) => {
            // created_at must be before all other dates
            const dates = [
                timeline.picked_up_at,
                timeline.in_transit_at,
                timeline.at_destination_at,
                timeline.delivered_at,
                timeline.failed_at,
                timeline.cancelled_at,
                timeline.returned_at,
            ].filter(Boolean);

            return dates.every((d) => d >= timeline.created_at);
        },
        {
            message: 'All timestamps must be after created_at',
            path: ['timeline'],
        }
    );

// ===== CREATE SHIPMENT SCHEMA =====

/**
 * ✅ POST /api/v1/shipments
 * Admin creates shipment for confirmed order
 * 
 * Validates:
 * - order_id: ObjectId (order must be confirmed)
 * - carrier: logistics provider (required)
 * - tracking_code: unique per shipment (required)
 * - shipping_address: snapshot from order (required)
 * 
 * Service will:
 * - Verify order belongs to user + status = confirmed
 * - Snapshot shipping address from order
 * - Create Shipment with status = pending
 * - Update Order status → shipping
 */
const createShipmentSchema = z.object({
    order_id: objectIdSchema,

    carrier: carrierSchema,

    tracking_code: trackingCodeSchema,

    shipping_address: shippingAddressSchema,
});

// ===== GET SHIPMENT SCHEMA =====

/**
 * ✅ GET /api/v1/shipments/:shipmentId
 * Get shipment details (with ownership check)
 * 
 * Path param:
 * - shipment_id: ObjectId
 * 
 * Service will:
 * - Verify shipment belongs to user
 * - Return detailed DTO
 */
const getShipmentSchema = z.object({
    shipment_id: objectIdSchema,
});

// ===== GET SHIPMENTS FOR ORDER SCHEMA =====

/**
 * ✅ GET /api/v1/orders/:orderId/shipments
 * Get all shipments for order (user can see their own order shipments)
 * 
 * Path param:
 * - order_id: ObjectId
 * 
 * Service will:
 * - Verify order belongs to user
 * - Return all shipments for order (sorted by created_at DESC)
 */
const getShipmentsForOrderSchema = z.object({
    order_id: objectIdSchema,
});

// ===== LIST SHIPMENTS SCHEMA (Query Params) =====

/**
 * ✅ GET /api/v1/shipments
 * List shipments for logged-in user
 * 
 * Query params:
 * - page: pagination (default 1)
 * - limit: page size (default 20, max 100)
 * - status: filter by status (comma-separated)
 * - carrier: filter by carrier
 * - date_from: filter by date range start
 * - date_to: filter by date range end
 * - sort_by: sort field (default: -created_at)
 */
const listShipmentsSchema = z.object({
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
                statuses.length === 0 ||
                statuses.every((s) =>
                    [
                        'pending',
                        'picked_up',
                        'in_transit',
                        'at_destination',
                        'delivered',
                        'failed',
                        'cancelled',
                        'returned',
                    ].includes(s)
                ),
            'Invalid status value'
        )
        .default(''),

    carrier: carrierSchema.optional(),

    date_from: z
        .string()
        .transform((v) => new Date(v))
        .refine((d) => !isNaN(d.getTime()), 'Invalid date format (use ISO 8601)')
        .optional(),

    date_to: z
        .string()
        .transform((v) => new Date(v))
        .refine((d) => !isNaN(d.getTime()), 'Invalid date format (use ISO 8601)')
        .optional(),

    sort_by: z
        .string()
        .default('-created_at'),
});

// ===== UPDATE SHIPMENT STATUS SCHEMA =====

/**
 * ✅ PATCH /api/v1/shipments/:shipmentId/status
 * Admin updates shipment status (carrier webhook or manual)
 * 
 * Validates:
 * - shipment_id: ObjectId (from URL)
 * - status: next status (state machine enforced by service)
 * - notes: optional notes (for admin)
 * 
 * Service will:
 * - Verify valid state transition
 * - Update status + add timestamp to timeline
 * - Update Order status if applicable (delivered → confirmed)
 */
const updateShipmentStatusSchema = z.object({
    status: shipmentStatusSchema,

    notes: z
        .string()
        .max(500, 'Notes must not exceed 500 characters')
        .optional(),
});

// ===== RECORD SHIPMENT FAILURE SCHEMA =====

/**
 * ✅ PATCH /api/v1/shipments/:shipmentId/failure
 * Record failed delivery attempt
 * 
 * Validates:
 * - shipment_id: ObjectId (from URL)
 * - failure_reason: reason for failure (required)
 * - failure_notes: additional details (optional)
 * 
 * Service will:
 * - Verify shipment status = 'failed'
 * - Increment retry_count
 * - Store failure details
 */
const recordShipmentFailureSchema = z
    .object({
        failure_reason: failureReasonSchema,

        failure_notes: z
            .string()
            .max(500, 'Failure notes must not exceed 500 characters')
            .trim()
            .optional(),
    })
    .refine(
        (data) => {
            // If failure_reason = 'other', notes should be provided
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

// ===== RETRY SHIPMENT SCHEMA =====

/**
 * ✅ POST /api/v1/shipments/:shipmentId/retry
 * Retry failed shipment
 * 
 * Validates:
 * - shipment_id: ObjectId (from URL)
 * - max_retries: fail if exceeded (default 3)
 * 
 * Service will:
 * - Verify shipment status = 'failed'
 * - Verify retry_count < max_retries
 * - Reset status → pending
 * - Clear failure info
 * - Increment retry_count
 */
const retryShipmentSchema = z.object({
    // Empty: shipment_id from URL param
    // Service checks retry_count < max_retries
});

// ===== CANCEL SHIPMENT SCHEMA =====

/**
 * ✅ PATCH /api/v1/shipments/:shipmentId/cancel
 * Cancel shipment (before delivery)
 * 
 * Validates:
 * - shipment_id: ObjectId (from URL)
 * - reason: cancellation reason (required)
 * 
 * Service will:
 * - Verify shipment is cancellable (not delivered/returned/cancelled)
 * - Set status → cancelled
 * - Add cancelled_at timestamp
 * - Revert Order status → confirmed
 */
const cancelShipmentSchema = z.object({
    reason: z
        .string()
        .min(5, 'Reason must be at least 5 characters')
        .max(500, 'Reason must not exceed 500 characters')
        .trim(),
});

// ===== CONFIRM DELIVERY SCHEMA =====

/**
 * ✅ PATCH /api/v1/shipments/:shipmentId/confirm-delivery
 * Mark shipment as delivered (admin or tracking system)
 * 
 * Validates:
 * - shipment_id: ObjectId (from URL)
 * 
 * Service will:
 * - Verify shipment status = 'at_destination'
 * - Set status → delivered
 * - Add delivered_at timestamp
 * - Update Order status → completed
 */
const confirmDeliverySchema = z.object({
    // Empty: shipment_id from URL param
    // Service handles state transition
});

// ===== TRACK SHIPMENT SCHEMA (Public) =====

/**
 * ✅ GET /api/v1/shipments/track/:trackingCode
 * Public tracking endpoint (no auth required)
 * 
 * Path param:
 * - tracking_code: carrier tracking code
 * 
 * Service will:
 * - Find shipment by tracking code
 * - Return minimal tracking info (no sensitive data)
 */
const trackShipmentSchema = z.object({
    tracking_code: trackingCodeSchema,
});

// ===== WEBHOOK SCHEMA (Carrier Updates) =====

/**
 * ✅ POST /api/v1/shipments/webhook/:carrier
 * Carrier webhook for shipment status updates
 * 
 * Validates:
 * - carrier: logistics provider
 * - tracking_code: package tracking code (required)
 * - status: new status (required)
 * 
 * Service will:
 * - Verify webhook signature (carrier-dependent)
 * - Find shipment by tracking_code
 * - Update status + timeline
 * - Update Order status if applicable
 */
const carrierWebhookSchema = z
    .object({
        tracking_code: trackingCodeSchema,

        status: z
            .string()
            .min(1, 'Status is required'),

        // Carrier-specific details
        carrier_details: z.record(z.any()).optional(),

        // Signature for verification
        signature: z
            .string()
            .min(1, 'Signature is required')
            .optional(),

        timestamp: z
            .union([z.number(), z.string().transform((v) => parseInt(v, 10))])
            .default(() => Math.floor(Date.now() / 1000)),
    })
    .refine(
        (data) => {
            // tracking_code must be uppercase
            return data.tracking_code === data.tracking_code.toUpperCase();
        },
        {
            message: 'Tracking code must be uppercase',
            path: ['tracking_code'],
        }
    );

// ===== ADMIN: UPDATE SHIPMENT SCHEMA =====

/**
 * ✅ PATCH /api/v1/admin/shipments/:shipmentId
 * Admin update shipment details
 * 
 * Validates:
 * - shipment_id: ObjectId (from URL)
 * - carrier: optional carrier update
 * - tracking_code: optional tracking code update
 * - admin_notes: optional admin notes
 */
const adminUpdateShipmentSchema = z
    .object({
        carrier: carrierSchema.optional(),

        tracking_code: trackingCodeSchema.optional(),

        admin_notes: z
            .string()
            .max(1000, 'Admin notes must not exceed 1000 characters')
            .optional(),
    })
    .refine(
        (data) => {
            // If tracking_code is updated, carrier should also be provided
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

// ===== ADMIN: LIST SHIPMENTS SCHEMA =====

/**
 * ✅ GET /api/v1/admin/shipments
 * Admin list all shipments (with filters)
 * 
 * Query params:
 * - page, limit, status, carrier, date_from, date_to (same as user list)
 * - user_id: filter by user (admin only)
 * - order_id: filter by order
 */
const adminListShipmentsSchema = z
    .object({
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
            .default(''),

        carrier: carrierSchema.optional(),

        user_id: objectIdOptionalSchema,

        order_id: objectIdOptionalSchema,

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

        sort_by: z
            .string()
            .default('-created_at'),
    });

// ===== EXPORT ALL SCHEMAS =====

module.exports = {
    // Create shipment
    createShipmentSchema,

    // Get shipment(s)
    getShipmentSchema,
    getShipmentsForOrderSchema,
    listShipmentsSchema,

    // Update shipment
    updateShipmentStatusSchema,
    recordShipmentFailureSchema,
    retryShipmentSchema,
    cancelShipmentSchema,
    confirmDeliverySchema,

    // Public tracking
    trackShipmentSchema,

    // Webhooks
    carrierWebhookSchema,

    // Admin actions
    adminUpdateShipmentSchema,
    adminListShipmentsSchema,

    // ===== CUSTOM VALIDATORS (for reuse) =====
    objectIdSchema,
    objectIdOptionalSchema,
    vietnamesePhoneSchema,
    carrierSchema,
    trackingCodeSchema,
    shipmentStatusSchema,
    failureReasonSchema,
    shippingAddressSchema,
    timelineSchema,
};