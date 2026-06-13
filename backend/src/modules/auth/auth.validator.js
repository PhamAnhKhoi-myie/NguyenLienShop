const { z } = require('zod');
const {
    normalizePhoneNumber,
    isValidVietnamPhoneNumber,
} = require('../../utils/phone.util');

const phoneField = z
    .string()
    .trim()
    .transform(normalizePhoneNumber)
    .refine(isValidVietnamPhoneNumber, "Invalid phone number");

const optionalEmailField = z
    .union([
        z.string().trim().toLowerCase().email("Invalid email"),
        z.literal(''),
    ])
    .optional()
    .transform((value) => value || null);

const otpField = z
    .string()
    .trim()
    .length(6, "OTP must have 6 digits")
    .regex(/^\d+$/, "OTP must contain digits only");

const passwordField = z
    .string()
    .min(6, "Password must be at least 6 characters")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number");

const requestRegistrationOtpSchema = z.object({
    phone_number: phoneField,
}).strict();

const registerSchema = z.object({
    phone_number: phoneField,
    otp: otpField,
    password: passwordField,
    full_name: z
        .string()
        .trim()
        .min(2, "Name must have at least 2 characters")
        .optional(),
    email: optionalEmailField,
}).strict();

const loginSchema = z.object({
    phone_number: phoneField,
    password: z.string().min(1, "Password is required"),
}).strict();

const changePasswordSchema = z
    .object({
        currentPassword: z.string().min(1, "Current password is required"),
        newPassword: passwordField,
    })
    .strict()
    .refine((data) => data.currentPassword !== data.newPassword, {
        message: "New password must be different from current password",
        path: ['newPassword'],
    });

const forgotPasswordSchema = z.object({
    phone_number: phoneField,
}).strict();

const resetPasswordSchema = z.object({
    phone_number: phoneField,
    otp: otpField,
    newPassword: passwordField,
}).strict();

module.exports = {
    requestRegistrationOtpSchema,
    registerSchema,
    loginSchema,
    changePasswordSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
};
