const { z } = require('zod');

// ===== BASE =====
const objectIdSchema = z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');

// ===== PARAMS =====
const idParamSchema = z.object({
    id: objectIdSchema,
});

const userIdParamSchema = z.object({
    userId: objectIdSchema,
});

const addressIdParamSchema = z.object({
    addressId: objectIdSchema,
});

// ===== BODY =====
const createUserAddressBodySchema = z.object({
    receiver_name: z.string().min(1),
    phone: z.string().regex(/^(0|\+84)[0-9]{9}$/),
    address_line_1: z.string().min(1),
    address_line_2: z.string().optional(),
    city: z.string().min(1),
    district: z.string().min(1),
    ward: z.string().min(1),
    is_default: z.boolean().default(false),
});

const updateUserAddressBodySchema = z.object({
    receiver_name: z.string().min(1).optional(),
    phone: z.string().regex(/^(0|\+84)[0-9]{9}$/).optional(),
    address_line_1: z.string().min(1).optional(),
    address_line_2: z.string().optional(),
    city: z.string().min(1).optional(),
    district: z.string().min(1).optional(),
    ward: z.string().min(1).optional(),
    is_default: z.boolean().optional(),
});

module.exports = {
    objectIdSchema,
    idParamSchema,
    userIdParamSchema,
    addressIdParamSchema,
    createUserAddressBodySchema,
    updateUserAddressBodySchema,
};