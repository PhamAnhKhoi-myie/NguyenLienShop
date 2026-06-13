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
import { useForgotPassword } from '../hooks/useForgotPassword';

const forgotPasswordSchema = z.object({
    phone_number: z
        .string()
        .trim()
        .min(1, translate('text.please_enter_phone_number'))
        .refine(isValidVietnamPhoneNumber, translate('text.invalid_phone_number')),
});

export default function ForgotPasswordPage() {
    const forgotPasswordMutation = useForgotPassword();

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: {
            phone_number: '',
        },
    });

    const onSubmit = (values) => {
        forgotPasswordMutation.mutate({
            phone_number: normalizePhoneNumber(values.phone_number),
        });
    };

    const mockOtp = forgotPasswordMutation.data?.data?.mockOtp;

    return (
        <AuthPageCard
            title={translate('text.forgot_password')}
            subtitle={translate('text.enter_the_phone_number_to_receive_the_password_recovery_code')}
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

                {forgotPasswordMutation.isSuccess && (
                    <p className="text-sm text-[var(--color-primary-hover)]">
                        {forgotPasswordMutation.data.message ||
                            translate('text.if_the_phone_number_exists_a_recovery_code_has_been_sent')}
                    </p>
                )}

                {mockOtp && (
                    <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"> {translate('text.mock_sms_otp')} <strong>{mockOtp}</strong>
                    </p>
                )}

                {forgotPasswordMutation.isError && (
                    <p className="text-sm text-[var(--color-error)]">
                        {forgotPasswordMutation.error.message}
                    </p>
                )}

                <Button
                    type="submit"
                    fullWidth
                    isLoading={forgotPasswordMutation.isPending}
                >
                    {forgotPasswordMutation.isPending
                        ? translate('text.sending')
                        : translate('text.send_recovery_code')}
                </Button>

                <Link
                    to={ROUTES.RESET_PASSWORD}
                    className="block text-center text-sm text-[var(--color-primary-hover)] hover:text-[var(--color-primary)]"
                > {translate('text.already_have_an_otp_code_reset_password')} </Link>
            </form>
        </AuthPageCard>
    );
}
