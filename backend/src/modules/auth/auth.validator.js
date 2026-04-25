const { z } = require("zod");

// ===== Common fields =====
const emailField = z
    .string()
    .trim()
    .toLowerCase()
    .email("Email không hợp lệ");

const passwordField = z
    .string()
    .min(6, "Mật khẩu phải có ít nhất 6 ký tự")
    .regex(/[a-z]/, "Mật khẩu phải chứa ít nhất một chữ cái thường")
    .regex(/[0-9]/, "Mật khẩu phải chứa ít nhất một số");

// ===== Schemas =====
const registerSchema = z.object({
    email: emailField,
    password: passwordField,
    full_name: z
        .string()
        .trim()
        .min(2, "Tên phải có ít nhất 2 ký tự")
        .optional(),
});

const loginSchema = z.object({
    email: emailField,
    password: z.string().min(1, "Mật khẩu là bắt buộc"),
});

const changePasswordSchema = z
    .object({
        currentPassword: z.string().min(1, "Mật khẩu hiện tại là bắt buộc"),
        newPassword: passwordField,
    })
    .refine((data) => data.currentPassword !== data.newPassword, {
        message: "Mật khẩu mới phải khác mật khẩu hiện tại",
        path: ["newPassword"],
    });

module.exports = {
    registerSchema,
    loginSchema,
    changePasswordSchema,
};