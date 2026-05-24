const { z } = require('zod');

const objectIdSchema = z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');

const idParamSchema = z.object({
    id: objectIdSchema,
}).strict();

const userIdParamSchema = z.object({
    userId: objectIdSchema,
}).strict();

const addressIdParamSchema = z.object({
    addressId: objectIdSchema,
}).strict();

const vietnamPhoneSchema = z
    .string()
    .trim()
    .regex(/^(0|\+84)[0-9]{9}$/);

const noteSchema = z
    .string()
    .trim()
    .max(500)
    .nullable()
    .optional();

const createUserAddressBodySchema = z.object({
    receiver_name: z.string().trim().min(1).max(100),
    phone: vietnamPhoneSchema,
    province_code: z.string().trim().regex(/^\d{2}$/),
    ward_code: z.string().trim().regex(/^\d{5}$/),
    detail: z.string().trim().min(5).max(255),
    note: noteSchema,
    is_default: z.boolean().default(false),
}).strict();

const updateUserAddressBodySchema = z.object({
    receiver_name: z.string().trim().min(1).max(100).optional(),
    phone: vietnamPhoneSchema.optional(),
    province_code: z.string().trim().regex(/^\d{2}$/).optional(),
    ward_code: z.string().trim().regex(/^\d{5}$/).optional(),
    detail: z.string().trim().min(5).max(255).optional(),
    note: noteSchema,
    is_default: z.boolean().optional(),
}).strict().refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one field should be provided' }
);

module.exports = {
    objectIdSchema,
    idParamSchema,
    userIdParamSchema,
    addressIdParamSchema,
    createUserAddressBodySchema,
    updateUserAddressBodySchema,
};
