const { z } = require("zod");
const { ALL_ROLES } = require("../../constants/roles");

// ===== BASE =====
const objectIdSchema = z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId");

const idParamSchema = z.object({
    id: objectIdSchema,
});

// ===== QUERY =====
const getAllUsersQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().optional(),
    status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
});

// ===== BODY =====
const updateUserBodySchema = z.object({
    name: z.string().min(2).optional(),
    avatar: z.string().url().optional(),
    email: z.string().email().optional(),
    phone: z.string().regex(/^\d{10,}$/).optional(),
});

const updateUserRolesBodySchema = z.object({
    roles: z
        .array(z.enum(ALL_ROLES))
        .min(1),
});

const updateUserStatusBodySchema = z.object({
    status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]),
});

module.exports = {
    objectIdSchema,
    idParamSchema,
    getAllUsersQuerySchema,
    updateUserBodySchema,
    updateUserRolesBodySchema,
    updateUserStatusBodySchema,
};