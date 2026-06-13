const {
    requestRegistrationOtpSchema,
    registerSchema,
    loginSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
} = require('../../modules/auth/auth.validator');

describe('phone authentication validators', () => {
    test('normalizes phone login input', () => {
        expect(
            loginSchema.parse({
                phone_number: '+84901234567',
                password: 'abc123',
            })
        ).toEqual({
            phone_number: '0901234567',
            password: 'abc123',
        });
    });

    test('accepts registration with optional email', () => {
        expect(
            registerSchema.parse({
                phone_number: '0901234567',
                otp: '123456',
                password: 'abc123',
                email: '',
            })
        ).toMatchObject({
            phone_number: '0901234567',
            otp: '123456',
            password: 'abc123',
            email: null,
        });
    });

    test.each([
        requestRegistrationOtpSchema,
        loginSchema,
        forgotPasswordSchema,
        resetPasswordSchema,
    ])('rejects invalid phone input', (schema) => {
        const result = schema.safeParse({
            phone_number: '123',
            password: 'abc123',
            otp: '123456',
            newPassword: 'abc123',
        });

        expect(result.success).toBe(false);
    });

    test('rejects non-numeric OTP', () => {
        const result = resetPasswordSchema.safeParse({
            phone_number: '0901234567',
            otp: '12AB56',
            newPassword: 'abc123',
        });

        expect(result.success).toBe(false);
    });
});
