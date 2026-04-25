const { z } = require("zod");

const updateUserSchema = z.object({
    name: z.string().min(2, "Tên phải có ít nhất 2 ký tự").optional(),
    avatar: z.string().url("Avatar phải là URL hợp lệ").optional(),
    email: z.string().email("Email không hợp lệ").optional(),
    phone: z.string().regex(/^\d{10,}$/, "Số điện thoại không hợp lệ").optional(),
});

module.exports = {
    updateUserSchema,
};