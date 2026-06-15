const { z } = require('zod');
const mongoose = require('mongoose');





const objectIdSchema = z.string().refine(
    (val) => mongoose.Types.ObjectId.isValid(val),
    { message: 'Invalid MongoDB ObjectId' }
);

const objectIdOptionalSchema = objectIdSchema.optional().nullable();

const IdParamSchema = z.object({
    payment_id: objectIdSchema,
});

const OrderIdParamSchema = z.object({
    order_id: objectIdSchema,
});





const providerSchema = z.enum(['vnpay', 'stripe', 'paypal', 'payos']).default('vnpay');
const createPaymentProviderSchema = z.enum(['vnpay', 'paypal', 'payos']).default('vnpay');

const paymentStatusSchema = z.enum(['pending', 'paid', 'failed']);

const currencySchema = z.enum(['VND', 'USD']).default('VND');

const bankCodeSchema = z
    .string()
    .min(2)
    .max(10)
    .regex(/^[A-Z0-9]+$/)
    .optional()
    .nullable();





const createPaymentBodySchema = z.object({
    order_id: objectIdSchema,
    provider: createPaymentProviderSchema,
});

const cancelPaymentBodySchema = z.object({
    reason: z.string().max(500).optional(),
});

const validateDiscountBodySchema = z.object({
    code: z.string().min(1).transform((v) => v.toUpperCase().trim()),
    cartSubtotal: z.number().positive(),
    cartItems: z.array(
        z.object({
            _id: z.string(),
            product_id: objectIdSchema,
            variant_id: objectIdSchema,
            unit_id: objectIdSchema,
            category_id: objectIdSchema.optional(),
            sku: z.string(),
            quantity: z.number().min(1),
            pack_size: z.number().min(1),
            price_at_added: z.number().min(0),
            line_total: z.number().min(0),
        })
    ).optional().default([]),
});





const vnpayWebhookBodySchema = z.object({
    vnp_Amount: z.union([z.number(), z.string().transform(v => parseInt(v, 10))])
        .refine((v) => v > 0),

    vnp_BankCode: bankCodeSchema,
    vnp_BankTranNo: z.string().max(100).optional(),
    vnp_CardType: z.string().optional(),
    vnp_OrderInfo: z.string().max(200).optional(),

    vnp_PayDate: z.string().regex(/^\d{14}$/),

    vnp_ResponseCode: z.string().regex(/^\d{2}$/),
    vnp_TransactionStatus: z.string().regex(/^\d{2}$/),
    vnp_TmnCode: z.string().min(1),

    vnp_TransactionNo: z.string().max(100).optional(),

    vnp_TxnRef: z.string().min(1).max(100).trim(),

    vnp_SecureHash: z.string().regex(/^[a-fA-F0-9]{64}$|^[a-fA-F0-9]{128}$/),

    vnp_SecureHashType: z.string().optional().default('SHA512'),
}).passthrough();

const stripeWebhookBodySchema = z.object({
    id: z.string().min(1),
    object: z.literal('event').default('event'),
    type: z.string().min(1),

    data: z.object({
        object: z.object({
            id: z.string().regex(/^pi_/),
            object: z.literal('payment_intent').default('payment_intent'),
            amount: z.number().int().positive(),
            currency: currencySchema,
            status: z.enum(['succeeded', 'failed', 'canceled', 'processing', 'requires_action']),
            metadata: z.object({
                order_id: objectIdSchema,
            }).optional(),
        }),
    }),

    created: z.union([z.number(), z.string().transform(v => parseInt(v, 10))]),

    request: z.object({
        id: z.string().optional().nullable(),
        idempotency_key: z.string().optional().nullable(),
    }).optional(),

    livemode: z.boolean(),
    pending_webhooks: z.number().int(),
    api_version: z.string().optional(),
});

const paypalWebhookBodySchema = z.object({
    id: z.string().min(1),
    event_type: z.string().min(1),

    resource: z.object({
        id: z.string().min(1),
        status: z.string().min(1).optional(),

        amount: z.object({
            value: z.string().regex(/^\d+(\.\d{2})?$/),
            currency_code: currencySchema,
        }).optional(),

        payer: z.object({
            email_address: z.string().email(),
            payer_id: z.string().optional(),
        }).optional(),
    }).passthrough(),

    create_time: z.string().datetime(),

    links: z.array(
        z.object({
            rel: z.string(),
            href: z.string().url(),
        })
    ).optional(),
}).passthrough();

const payosWebhookBodySchema = z.object({
    code: z.string().min(1),
    desc: z.string().min(1),
    success: z.boolean(),
    data: z.object({
        orderCode: z.coerce.number().int().nonnegative(),
        amount: z.coerce.number().int().positive(),
        description: z.string().min(1),
        accountNumber: z.string().optional().nullable(),
        reference: z.string().optional().nullable(),
        transactionDateTime: z.string().optional().nullable(),
        currency: z.string().optional().default('VND'),
        paymentLinkId: z.string().min(1),
        code: z.string().min(1),
        desc: z.string().min(1),
        counterAccountBankId: z.string().optional().nullable(),
        counterAccountBankName: z.string().optional().nullable(),
        counterAccountName: z.string().optional().nullable(),
        counterAccountNumber: z.string().optional().nullable(),
        virtualAccountName: z.string().optional().nullable(),
        virtualAccountNumber: z.string().optional().nullable(),
    }).passthrough(),
    signature: z.string().min(1),
}).passthrough();





const listPaymentsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),

    status: z.string()
        .transform((v) => v.split(',').filter(Boolean))
        .refine(
            (arr) =>
                arr.length === 0 ||
                arr.every((s) => ['pending', 'paid', 'failed'].includes(s))
        )
        .optional(),

    provider: providerSchema.optional(),

    date_from: z.string().transform((v) => new Date(v))
        .refine((d) => !isNaN(d.getTime()))
        .optional(),

    date_to: z.string().transform((v) => new Date(v))
        .refine((d) => !isNaN(d.getTime()))
        .optional(),
});





module.exports = {

    IdParamSchema,
    OrderIdParamSchema,


    createPaymentBodySchema,
    cancelPaymentBodySchema,
    vnpayWebhookBodySchema,
    stripeWebhookBodySchema,
    paypalWebhookBodySchema,
    payosWebhookBodySchema,


    listPaymentsQuerySchema,


    objectIdSchema,
    objectIdOptionalSchema,
    providerSchema,
    createPaymentProviderSchema,
    paymentStatusSchema,
    currencySchema,
    bankCodeSchema,
};
