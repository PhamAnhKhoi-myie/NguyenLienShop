const { z } = require('zod');
const {
    isOptionalHttpUrl,
    isSafeZaloLink
} = require('./shop_info_link.util');
const {
    isOpeningRange,
    isValidTime
} = require('./shop_info_time.util');

const dayValues = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun', 'holiday'];

const optionalTextSchema = (label, maxLength) =>
    z.string()
        .trim()
        .max(maxLength, `${label} must not exceed ${maxLength} characters`)
        .nullable()
        .optional();

const workingHourSchema = z
    .object({
        day: z.enum(dayValues),
        open: z.string().refine(
            isValidTime,
            'Format must be HH:mm between 00:00 and 23:59'
        ),
        close: z.string().refine(
            isValidTime,
            'Format must be HH:mm between 00:00 and 23:59'
        )
    })
    .refine(
        (data) => isOpeningRange(data.open, data.close),
        {
            message: 'open must be before close',
            path: ['close']
        }
    );

const socialLinksSchema = z.object({
    facebook: z.string().nullable().optional().refine(
        isOptionalHttpUrl,
        'Facebook URL must be HTTP(S)'
    ),
    zalo: z.string().nullable().optional().refine(
        isSafeZaloLink,
        'Zalo must be HTTP(S), phone number, or safe ID'
    ),
    instagram: z.string().nullable().optional().refine(
        isOptionalHttpUrl,
        'Instagram URL must be HTTP(S)'
    ),
    shoppe: z.string().nullable().optional().refine(
        isOptionalHttpUrl,
        'Shoppe URL must be HTTP(S)'
    ),
    tiktok: z.string().nullable().optional().refine(
        isOptionalHttpUrl,
        'TikTok URL must be HTTP(S)'
    )
}).strict();

const certificationLinksSchema = z.object({
    ministry_notified: z.string().nullable().optional().refine(
        isOptionalHttpUrl,
        'Ministry notified URL must be HTTP(S)'
    ),
    ministry_registered: z.string().nullable().optional().refine(
        isOptionalHttpUrl,
        'Ministry registered URL must be HTTP(S)'
    ),
    extra: z.string().nullable().optional().refine(
        isOptionalHttpUrl,
        'Certification extra URL must be HTTP(S)'
    )
}).strict();

const createShopInfoSchema = z.object({
    shop_name: z.string()
        .min(1, 'Shop name is required')
        .max(200, 'Shop name must not exceed 200 characters')
        .trim(),

    email: z.string()
        .email('Invalid email format')
        .toLowerCase()
        .trim(),

    phone: z.string()
        .min(10, 'Phone must be at least 10 characters')
        .max(20, 'Phone must not exceed 20 characters')
        .regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone format')
        .trim(),

    address: z.string()
        .min(5, 'Address must be at least 5 characters')
        .max(500, 'Address must not exceed 500 characters'),

    shipping_partner: optionalTextSchema('Shipping partner', 200),

    working_hours: z.array(workingHourSchema)
        .min(1, 'At least one working hour entry is required')
        .max(8, 'Maximum 8 working hour entries allowed'),

    social_links: socialLinksSchema.optional(),

    certification_links: certificationLinksSchema.optional(),

    map_embed_url: z.string()
        .nullable()
        .optional()
        .refine(
            isOptionalHttpUrl,
            'Map embed URL must be HTTP(S)'
        ),

    is_active: z.boolean().default(true)
}).strict();

const updateShopInfoSchema = z.object({
    shop_name: z.string()
        .min(1, 'Shop name is required')
        .max(200, 'Shop name must not exceed 200 characters')
        .trim()
        .optional(),

    email: z.string()
        .email('Invalid email format')
        .toLowerCase()
        .trim()
        .optional(),

    phone: z.string()
        .min(10, 'Phone must be at least 10 characters')
        .max(20, 'Phone must not exceed 20 characters')
        .regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone format')
        .trim()
        .optional(),

    address: z.string()
        .min(5, 'Address must be at least 5 characters')
        .max(500, 'Address must not exceed 500 characters')
        .optional(),

    shipping_partner: optionalTextSchema('Shipping partner', 200),

    working_hours: z.array(workingHourSchema)
        .min(1, 'At least one working hour entry is required')
        .max(8, 'Maximum 8 working hour entries allowed')
        .optional(),

    social_links: socialLinksSchema.optional(),

    certification_links: certificationLinksSchema.optional(),

    map_embed_url: z.string()
        .nullable()
        .optional()
        .refine(
            isOptionalHttpUrl,
            'Map embed URL must be HTTP(S)'
        ),

    is_active: z.boolean().optional()
}).strict();

module.exports = {
    createShopInfoSchema,
    updateShopInfoSchema
};
