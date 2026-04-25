// filepath: c:\MyEffort\NguyenLien\backend\src\modules\user_addresses\user_addresses.validator.js
const { z } = require('zod');

const createUserAddressSchema = z.object({
    receiver_name: z.string().min(1, 'Receiver name is required'),
    phone: z.string().regex(/^(0|\+84)[0-9]{9}$/, 'Invalid Vietnamese phone number'),
    address_line_1: z.string().min(1, 'Address line 1 is required'),
    address_line_2: z.string().optional(),
    city: z.string().min(1, 'City is required'),
    district: z.string().min(1, 'District is required'),
    ward: z.string().min(1, 'Ward is required'),
    is_default: z.boolean().default(false),
});

const updateUserAddressSchema = z.object({
    receiver_name: z.string().min(1).optional(),
    phone: z.string().regex(/^(0|\+84)[0-9]{9}$/).optional(),
    address_line_1: z.string().min(1).optional(),
    address_line_2: z.string().optional(),
    city: z.string().min(1).optional(),
    district: z.string().min(1).optional(),
    ward: z.string().min(1).optional(),
});


module.exports = { createUserAddressSchema, updateUserAddressSchema };