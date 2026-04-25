const { z } = require('zod');
const mongoose = require('mongoose');

/**
 * ============================================
 * PAYMENT VALIDATORS (Zod Schemas)
 * ============================================
 * 
 * ✅ Validate request bodies before controller logic
 * ✅ Follow project conventions (snake_case fields, camelCase validation)
 * ✅ Provide clear Vietnamese + English error messages
 * ✅ Use custom refine() for cross-field validation
 * ✅ Financial fields MUST be integers (no floats)
 */

// ===== CUSTOM VALIDATORS =====

/**
 * ✅ MongoDB ObjectId validator
 * Consistent pattern with order.validator.js
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
 * ✅ Amount validator (financial field)
 * MUST be integer (no floats)
 * - VND: 1000 VND = 1000 (whole numbers)
 * - USD: 10.00 USD = 1000 (in cents, as integer)
 */
const amountSchema = z
    .number()
    .int('Amount must be an integer (no decimals)')
    .positive('Amount must be greater than 0')
    .max(999999999999, 'Amount exceeds maximum limit');

/**
 * ✅ Transaction reference validator
 * VNPay: alphanumeric + underscores, max 100 chars
 * Stripe: PI_xxxx format
 * PayPal: EC-xxxx format
 */
const transactionRefSchema = z
    .string()
    .min(5, 'Transaction reference must be at least 5 characters')
    .max(100, 'Transaction reference must not exceed 100 characters')
    .regex(
        /^[A-Za-z0-9_\-]+$/,
        'Transaction reference must be alphanumeric with hyphens/underscores'
    )
    .trim()
    .toUpperCase();

/**
 * ✅ Idempotency key validator
 * Format: {userId}-{orderId}-{timestamp}
 * Must be unique per payment creation
 */
const idempotencyKeySchema = z
    .string()
    .min(10, 'Idempotency key must be at least 10 characters')
    .max(200, 'Idempotency key must not exceed 200 characters')
    .trim();

/**
 * ✅ Promo/discount code validator
 */
const promoCodeSchema = z
    .string()
    .min(3, 'Promo code must be at least 3 characters')
    .max(50, 'Promo code must not exceed 50 characters')
    .regex(/^[A-Z0-9\-]+$/, 'Promo code must be uppercase alphanumeric')
    .toUpperCase();

/**
 * ✅ Currency validator
 */
const currencySchema = z
    .enum(['VND', 'USD'])
    .default('VND');

/**
 * ✅ Provider validator
 */
const providerSchema = z
    .enum(['vnpay', 'stripe', 'paypal'])
    .default('vnpay');

/**
 * ✅ Payment status validator
 */
const paymentStatusSchema = z
    .enum(['pending', 'paid', 'failed']);

/**
 * ✅ Verification status validator
 */
const verificationStatusSchema = z
    .enum(['pending', 'verified', 'failed']);

/**
 * ✅ Bank code validator (VNPay)
 */
const bankCodeSchema = z
    .string()
    .min(2, 'Bank code must be at least 2 characters')
    .max(10, 'Bank code must not exceed 10 characters')
    .regex(/^[A-Z0-9]+$/, 'Bank code must be uppercase alphanumeric')
    .optional()
    .nullable();

// ===== CREATE PAYMENT SCHEMA =====

/**
 * ✅ POST /api/v1/payments/create
 * Create payment for order
 * 
 * Validates:
 * - order_id: ObjectId (required)
 * - provider: payment provider (default: vnpay)
 * 
 * Service will:
 * - Load order & verify user owns it
 * - Lock amount from order total (CANNOT be tampered)
 * - Create Payment record with status pending
 * - Call payment provider API
 * - Return payment URL
 * 
 * ✅ CRITICAL: Amount is NOT in request (locked to order.total_amount)
 */
const createPaymentSchema = z.object({
    order_id: objectIdSchema,

    provider: providerSchema,
});

// ===== VNPAY WEBHOOK SCHEMA =====

/**
 * ✅ POST /api/v1/payments/webhook/vnpay
 * VNPay IPN webhook notification
 * 
 * Validates VNPay response structure
 * 
 * VNPay sends (all required):
 * - vnp_Amount: amount in VND (integer)
 * - vnp_BankCode: bank code (e.g., VCB)
 * - vnp_BankTranNo: bank transaction number
 * - vnp_CardType: DEBIT or CREDIT
 * - vnp_OrderInfo: order reference
 * - vnp_PayDate: payment date (YYYYMMDDHHMISS)
 * - vnp_ResponseCode: response code ('00' = success)
 * - vnp_TmnCode: merchant code
 * - vnp_TransactionNo: VNPay transaction number
 * - vnp_TxnRef: merchant transaction reference (our payment ID)
 * - vnp_SecureHash: HMAC signature (SHA256 = 64 chars, SHA512 = 128 chars)
 * - vnp_SecureHashType: hash algorithm used (e.g. SHA256, SHA512)
 * 
 * ✅ Service validates:
 * - Signature (CRITICAL for security)
 * - Amount matches order total
 * - Transaction reference exists
 * - Status transition (pending → paid only)
 */
const vnpayWebhookSchema = z.object({
    vnp_Amount: z
        .union([z.number(), z.string().transform(v => parseInt(v, 10))])
        .refine((v) => v > 0, 'Amount must be greater than 0'),

    vnp_BankCode: bankCodeSchema,

    vnp_BankTranNo: z
        .string()
        .max(100)
        .optional(),

    vnp_CardType: z
        .string()
        .optional(),                    // ✅ Bỏ enum DEBIT/CREDIT - VNPay có thể gửi giá trị khác

    vnp_OrderInfo: z
        .string()
        .max(200)
        .optional(),

    vnp_PayDate: z
        .string()
        .regex(/^\d{14}$/, 'Payment date must be in format YYYYMMDDHHMISS'),

    vnp_ResponseCode: z
        .string()
        .min(1, 'Response code is required'),   // ✅ Bỏ .length(2) - cho linh hoạt hơn

    vnp_TmnCode: z
        .string()
        .min(1, 'Merchant code is required'),

    vnp_TransactionNo: z
        .string()
        .max(100)
        .optional(),                    // ✅ Optional - đôi khi VNPay không gửi

    vnp_TxnRef: z
        .string()
        .min(1, 'Transaction reference is required')
        .max(100)
        .trim(),                        // ✅ Bỏ transactionRefSchema - quá strict cho webhook

    vnp_SecureHash: z
        .string()
        .regex(
            /^[a-fA-F0-9]{64}$|^[a-fA-F0-9]{128}$/,  // ✅ Thêm A-F (chữ hoa)
            'Invalid signature format (expected SHA256 or SHA512 hex)'
        ),

    vnp_SecureHashType: z
        .string()
        .optional()
        .default('SHA512'),
}).passthrough();

// ===== STRIPE WEBHOOK SCHEMA =====

/**
 * ✅ POST /api/v1/payments/webhook/stripe
 * Stripe webhook event
 * 
 * Validates Stripe webhook structure
 * 
 * Stripe sends:
 * - id: event ID
 * - object: 'event'
 * - type: event type (e.g., 'payment_intent.succeeded')
 * - data:
 *   - object:
 *     - id: payment_intent ID (PI_xxx)
 *     - object: 'payment_intent'
 *     - amount: amount in cents
 *     - currency: currency code
 *     - status: 'succeeded' | 'failed' | etc
 *     - metadata:
 *       - order_id: our order reference
 * - created: unix timestamp
 * - request: { id, idempotency_key }
 * - livemode: boolean
 * - pending_webhooks: number
 * - api_version: API version
 * - signature: x-stripe-signature header (separate from body)
 * 
 * ✅ Service validates:
 * - Signature via raw body + secret
 * - Event type (payment_intent.succeeded, etc)
 * - Amount matches payment record
 */
const stripeWebhookSchema = z.object({
    id: z
        .string()
        .min(1, 'Event ID is required'),

    object: z
        .literal('event')
        .default('event'),

    type: z
        .string()
        .min(1, 'Event type is required'),

    data: z.object({
        object: z.object({
            id: z
                .string()
                .regex(/^pi_/, 'Payment intent ID must start with pi_'),

            object: z
                .literal('payment_intent')
                .default('payment_intent'),

            amount: z
                .number()
                .int('Amount must be integer')
                .positive('Amount must be positive'),

            currency: currencySchema,

            status: z
                .enum(['succeeded', 'failed', 'canceled', 'processing', 'requires_action']),

            metadata: z
                .object({
                    order_id: objectIdSchema,
                })
                .optional(),
        }),
    }),

    created: z
        .union([z.number(), z.string().transform(v => parseInt(v, 10))]),

    request: z
        .object({
            id: z.string().optional().nullable(),
            idempotency_key: z.string().optional().nullable(),
        })
        .optional(),

    livemode: z.boolean(),

    pending_webhooks: z.number().int(),

    api_version: z.string().optional(),
});

// ===== PAYPAL WEBHOOK SCHEMA =====

/**
 * ✅ POST /api/v1/payments/webhook/paypal
 * PayPal webhook event
 * 
 * Validates PayPal webhook structure
 */
const paypalWebhookSchema = z.object({
    id: z
        .string()
        .min(1, 'Event ID is required'),

    event_type: z
        .string()
        .min(1, 'Event type is required'),

    resource: z.object({
        id: z
            .string()
            .regex(/^EC-/, 'Order ID must start with EC-'),

        status: z
            .enum(['APPROVED', 'CAPTURED', 'DECLINED', 'EXPIRED', 'VOIDED']),

        amount: z.object({
            value: z
                .string()
                .regex(/^\d+(\.\d{2})?$/, 'Amount must be valid decimal'),

            currency_code: currencySchema,
        }),

        payer: z
            .object({
                email_address: z.string().email('Invalid email'),
                payer_id: z.string().optional(),
            })
            .optional(),
    }),

    create_time: z.string().datetime(),

    links: z
        .array(
            z.object({
                rel: z.string(),
                href: z.string().url(),
            })
        )
        .optional(),
});

// ===== RETRY PAYMENT SCHEMA =====

/**
 * ✅ POST /api/v1/payments/:paymentId/retry
 * Retry a failed payment
 * 
 * Validates:
 * - payment_id: ObjectId (required)
 * 
 * Service will:
 * - Load payment & verify status = 'failed'
 * - Verify order still exists
 * - Increment retry_count
 * - Call payment provider API again
 * - Return new payment URL
 */
const retryPaymentSchema = z.object({
    // Empty: payment_id comes from URL param
});

// ===== CANCEL PAYMENT SCHEMA =====

/**
 * ✅ POST /api/v1/payments/:paymentId/cancel
 * Cancel a pending payment
 * 
 * Validates:
 * - payment_id: ObjectId (required)
 * - reason: cancellation reason (optional)
 * 
 * Service will:
 * - Load payment & verify status = 'pending'
 * - Set status = 'failed'
 * - Rollback order + stock
 * - Log cancellation reason
 */
const cancelPaymentSchema = z.object({
    reason: z
        .string()
        .max(500, 'Reason must not exceed 500 characters')
        .optional(),
});

// ===== GET PAYMENT SCHEMA =====

/**
 * ✅ GET /api/v1/payments/:paymentId
 * Get payment details
 * 
 * Path param:
 * - payment_id: ObjectId
 * 
 * Query params:
 * - format: 'summary' | 'detail' | 'admin' (default 'summary')
 */
const getPaymentSchema = z.object({
    payment_id: objectIdSchema,
});

const getPaymentQuerySchema = z.object({
    format: z
        .enum(['summary', 'detail', 'admin'])
        .default('summary'),
});

// ===== LIST PAYMENTS SCHEMA (Query Params) =====

/**
 * ✅ GET /api/v1/payments
 * List payments for user or admin
 * 
 * Query params:
 * - page: pagination (default 1)
 * - limit: page size (default 20, max 100)
 * - status: filter by status (comma-separated)
 * - provider: filter by provider
 * - date_from: filter by date range start
 * - date_to: filter by date range end
 * - sort_by: sort field (default: -created_at)
 */
const listPaymentsSchema = z.object({
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
                statuses.every((s) => ['pending', 'paid', 'failed'].includes(s)),
            'Invalid status value'
        )
        .default(''),

    provider: z
        .enum(['vnpay', 'stripe', 'paypal'])
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

    sort_by: z
        .string()
        .default('-created_at'),
});

// ===== PAYMENT VERIFICATION SCHEMA (Admin) =====

/**
 * ✅ POST /api/v1/payments/:paymentId/verify
 * Manually verify payment webhook signature (admin)
 * 
 * Used for debugging failed webhooks
 */
const verifyPaymentSchema = z.object({
    // Empty: payment_id from URL param
    // Service will reload from DB and re-verify signature
});

// ===== EXPORT ALL SCHEMAS =====

module.exports = {
    // Create payment
    createPaymentSchema,

    // Webhooks (provider-specific)
    vnpayWebhookSchema,
    stripeWebhookSchema,
    paypalWebhookSchema,

    // Payment actions
    retryPaymentSchema,
    cancelPaymentSchema,
    verifyPaymentSchema,

    // Get payment
    getPaymentSchema,
    getPaymentQuerySchema,

    // List payments
    listPaymentsSchema,

    // ===== CUSTOM VALIDATORS (for reuse) =====
    objectIdSchema,
    objectIdOptionalSchema,
    amountSchema,
    transactionRefSchema,
    idempotencyKeySchema,
    promoCodeSchema,
    currencySchema,
    providerSchema,
    paymentStatusSchema,
    verificationStatusSchema,
    bankCodeSchema,
};