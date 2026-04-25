const { z } = require('zod');

// ✅ Working hours schema (array of day schedules)
const workingHourSchema = z.object({
    day: z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']),
    open: z.string().regex(/^\d{2}:\d{2}$/, 'Format must be HH:mm'),
    close: z.string().regex(/^\d{2}:\d{2}$/, 'Format must be HH:mm')
});

// ✅ Social links schema (all optional, but must be valid URLs if provided)
const socialLinksSchema = z.object({
    facebook: z.string().url('Invalid Facebook URL').nullable().optional(),
    zalo: z.string().optional(),  // Zalo doesn't need URL format
    instagram: z.string().url('Invalid Instagram URL').nullable().optional(),
    shoppe: z.string().url('Invalid Shoppe URL').nullable().optional()
}).strict();

// ✅ Create shop info schema (all fields required)
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

    working_hours: z.array(workingHourSchema)
        .min(1, 'At least one working hour entry is required')
        .max(7, 'Maximum 7 working hour entries allowed'),

    social_links: socialLinksSchema.optional(),

    map_embed_url: z.string()
        .url('Invalid map embed URL')
        .nullable()
        .optional(),

    is_active: z.boolean().default(true)
}).strict();

// ✅ Update shop info schema (all fields optional)
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

    working_hours: z.array(workingHourSchema)
        .min(1, 'At least one working hour entry is required')
        .max(7, 'Maximum 7 working hour entries allowed')
        .optional(),

    social_links: socialLinksSchema.optional(),

    map_embed_url: z.string()
        .url('Invalid map embed URL')
        .nullable()
        .optional(),

    is_active: z.boolean().optional()
}).strict();

module.exports = {
    createShopInfoSchema,
    updateShopInfoSchema
};