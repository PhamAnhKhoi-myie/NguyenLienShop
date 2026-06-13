import { translate } from '../../../shared/i18n/index';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';

import Button from '../../../shared/components/Button';
import Input from '../../../shared/components/Input';
import { ROUTES } from '../../../shared/constants/routes';
import {
    isValidVietnamPhoneNumber,
    normalizePhoneNumber,
} from '../../../shared/utils/phone';
import AuthPageCard from '../components/AuthPageCard';
import { useResetPassword } from '../hooks/useResetPassword';

const passwordSchema = z
    .string()
    .min(6, translate('text.password_must_be_at_least_6_characters'))
    .regex(/[a-z]/, translate('text.password_must_have_at_least_one_lowercase_letter'))
    .regex(/[0-9]/, translate('text.password_must_contain_at_least_one'));

const resetPasswordSchema = z
    .object({
        phone_number: z
            .string()
            .trim()
            .min(1, translate('text.please_enter_phone_number'))
            .refine(isValidVietnamPhoneNumber, translate('text.invalid_phone_number')),
        otp: z
            .string()
            .trim()
            .length(6, translate('text.otp_must_have_6_digits'))
            .regex(/^\d+$/, translate('text.otp_must_only_contain_the_number')),
        newPassword: passwordSchema,
        confirmPassword: z.string().min(1, translate('text.please_re_enter_password')),
    })
    .refine((values) => values.newPassword === values.confirmPassword, {
        path: ['confirmPassword'],
        message: translate('text.re_entered_password_does_not_match'),
    });

export default function ResetPasswordPage() {
    const resetPasswordMutation = useResetPassword();

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: {
            phone_number: '',
            otp: '',
            newPassword: '',
            confirmPassword: '',
        },
    });

    const onSubmit = (values) => {
        resetPasswordMutation.mutate({
            phone_number: normalizePhoneNumber(values.phone_number),
            otp: values.otp.trim(),
            newPassword: values.newPassword,
        });
    };

    return (
        <AuthPageCard
            title={translate('text.reset_password')}
            subtitle={translate('text.enter_phone_number_otp_code_and_new_password')}
        >
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
                <Input
                    label={translate('text.phone_number')}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="0901234567"
                    error={errors.phone_number?.message}
                    {...register('phone_number')}
                />

                <Input
                    label={translate('text.otp')}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder={translate('text.enter_otp_code')}
                    error={errors.otp?.message}
                    {...register('otp')}
                />

                <Input
                    label={translate('text.new_password')}
                    type="password"
                    autoComplete="new-password"
                    placeholder={translate('text.enter_new_password')}
                    helperText={translate('text.minimum_6_characters_with_lowercase_letters_and_numbers')}
                    error={errors.newPassword?.message}
                    {...register('newPassword')}
                />

                <Input
                    label={translate('text.re_enter_new_password')}
                    type="password"
                    autoComplete="new-password"
                    placeholder={translate('text.re_enter_new_password')}
                    error={errors.confirmPassword?.message}
                    {...register('confirmPassword')}
                />

                {resetPasswordMutation.isError && (
                    <p className="text-sm text-[var(--color-error)]">
                        {resetPasswordMutation.error.message}
                    </p>
                )}

                <Button
                    type="submit"
                    fullWidth
                    isLoading={resetPasswordMutation.isPending}
                >
                    {resetPasswordMutation.isPending
                        ? translate('text.updating_9f3d40e5')
                        : translate('text.update_password')}
                </Button>

                <Link
                    to={ROUTES.LOGIN}
                    className="block text-center text-sm text-[var(--color-primary-hover)] hover:text-[var(--color-primary)]"
                > {translate('text.back_to_login')} </Link>
            </form>
        </AuthPageCard>
    );
}
