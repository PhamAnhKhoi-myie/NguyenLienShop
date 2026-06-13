import { translate } from '../../../shared/i18n/index';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import Button from '../../../shared/components/Button';
import Input from '../../../shared/components/Input';
import { ROUTES } from '../../../shared/constants/routes';
import {
    isValidVietnamPhoneNumber,
    normalizePhoneNumber,
} from '../../../shared/utils/phone';
import AuthPageCard from '../components/AuthPageCard';
import { useRegister } from '../hooks/useRegister';
import { useRequestRegistrationOtp } from '../hooks/useRequestRegistrationOtp';

const passwordSchema = z
    .string()
    .min(6, translate('text.password_must_be_at_least_6_characters'))
    .regex(/[a-z]/, translate('text.password_must_have_at_least_one_lowercase_letter'))
    .regex(/[0-9]/, translate('text.password_must_contain_at_least_one'));

const registerSchema = z.object({
    full_name: z
        .string()
        .trim()
        .refine((value) => value.length === 0 || value.length >= 2, {
            message: translate('text.name_must_have_at_least_2_characters'),
        }),
    phone_number: z
        .string()
        .trim()
        .min(1, translate('text.please_enter_phone_number'))
        .refine(isValidVietnamPhoneNumber, translate('text.invalid_phone_number')),
    email: z
        .string()
        .trim()
        .refine(
            (value) =>
                value === '' || z.string().email().safeParse(value).success,
            translate('text.invalid_email')
        ),
    otp: z
        .string()
        .trim()
        .length(6, translate('text.otp_must_have_6_digits'))
        .regex(/^\d+$/, translate('text.otp_must_only_contain_the_number')),
    password: passwordSchema,
});

export default function RegisterPage() {
    const navigate = useNavigate();
    const registerMutation = useRegister();
    const requestOtpMutation = useRequestRegistrationOtp();
    const [successCountdown, setSuccessCountdown] = useState(null);
    const [resendCountdown, setResendCountdown] = useState(0);
    const [otpPhone, setOtpPhone] = useState('');
    const [mockOtp, setMockOtp] = useState('');

    const {
        register,
        handleSubmit,
        getValues,
        control,
        setError,
        setValue,
        trigger,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            full_name: '',
            phone_number: '',
            email: '',
            otp: '',
            password: '',
        },
    });

    const watchedPhone = useWatch({
        control,
        name: 'phone_number',
    });
    const currentPhone = normalizePhoneNumber(watchedPhone);
    const hasOtpForCurrentPhone = Boolean(
        otpPhone && currentPhone === otpPhone
    );

    useEffect(() => {
        if (successCountdown === null) return;

        if (successCountdown <= 0) {
            navigate(ROUTES.LOGIN, {
                replace: true,
                state: {
                    message: translate('text.registration_successful_please_log_in'),
                },
            });
            return;
        }

        const timerId = setTimeout(() => {
            setSuccessCountdown((current) => current - 1);
        }, 1000);

        return () => clearTimeout(timerId);
    }, [navigate, successCountdown]);

    useEffect(() => {
        if (resendCountdown <= 0) return;

        const timerId = setTimeout(() => {
            setResendCountdown((current) => current - 1);
        }, 1000);

        return () => clearTimeout(timerId);
    }, [resendCountdown]);

    const requestOtp = async () => {
        const isPhoneValid = await trigger('phone_number');

        if (!isPhoneValid) return;

        requestOtpMutation.mutate(
            {
                phone_number: normalizePhoneNumber(getValues('phone_number')),
            },
            {
                onSuccess: (response) => {
                    const data = response.data || {};
                    setOtpPhone(data.phone_number);
                    setValue('phone_number', data.phone_number);
                    setValue('otp', '');
                    setMockOtp(data.mockOtp || '');
                    setResendCountdown(data.resendAfter || 60);
                },
            }
        );
    };

    const onSubmit = (values) => {
        const normalizedPhone = normalizePhoneNumber(values.phone_number);

        if (!otpPhone || normalizedPhone !== otpPhone) {
            setError('phone_number', {
                message: translate('text.please_send_otp_to_this_phone_number'),
            });
            return;
        }

        registerMutation.mutate(
            {
                phone_number: normalizedPhone,
                otp: values.otp.trim(),
                password: values.password,
                full_name: values.full_name.trim() || undefined,
                email: values.email.trim() || undefined,
            },
            {
                onSuccess: () => {
                    setSuccessCountdown(5);
                },
            }
        );
    };

    const isLocked =
        registerMutation.isPending || successCountdown !== null;
    const canResend =
        !requestOtpMutation.isPending &&
        (!hasOtpForCurrentPhone || resendCountdown <= 0);

    return (
        <AuthPageCard
            title={translate('text.subscribe_to')}
            subtitle={translate('text.verify_phone_number_with_otp_before_creating_account')}
        >
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
                <Input
                    label={translate('text.full_name')}
                    placeholder={translate('text.enter_full_name')}
                    disabled={isLocked}
                    error={errors.full_name?.message}
                    {...register('full_name')}
                />

                <Input
                    label={translate('text.phone_number')}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="0901234567"
                    disabled={isLocked}
                    error={errors.phone_number?.message}
                    {...register('phone_number')}
                />

                <Button
                    type="button"
                    variant="outline"
                    fullWidth
                    isLoading={requestOtpMutation.isPending}
                    disabled={!canResend || isLocked}
                    onClick={requestOtp}
                >
                    {hasOtpForCurrentPhone && resendCountdown > 0
                        ? translate('text.resend_otp_after_value_s', { value0: resendCountdown })
                        : translate('text.send_otp_code')}
                </Button>

                {requestOtpMutation.isError && (
                    <p className="text-sm text-[var(--color-error)]">
                        {requestOtpMutation.error.message}
                    </p>
                )}

                {mockOtp && hasOtpForCurrentPhone && (
                    <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"> {translate('text.mock_sms_otp')} <strong>{mockOtp}</strong>
                    </p>
                )}

                <Input
                    label={translate('text.otp_code')}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder={translate('text.enter_otp_code')}
                    disabled={isLocked || !hasOtpForCurrentPhone}
                    error={errors.otp?.message}
                    {...register('otp')}
                />

                <Input
                    label={translate('text.notification_email')}
                    type="email"
                    autoComplete="email"
                    placeholder={translate('text.optional')}
                    disabled={isLocked}
                    error={errors.email?.message}
                    {...register('email')}
                />

                <Input
                    label={translate('text.password')}
                    type="password"
                    autoComplete="new-password"
                    placeholder={translate('text.enter_password')}
                    helperText={translate('text.minimum_6_characters_with_lowercase_letters_and_numbers')}
                    disabled={isLocked}
                    error={errors.password?.message}
                    {...register('password')}
                />

                {registerMutation.isError && (
                    <p className="text-sm text-[var(--color-error)]">
                        {registerMutation.error?.message ||
                            translate('text.account_creation_failed')}
                    </p>
                )}

                {successCountdown !== null && (
                    <p className="w-full rounded-md border border-green-200 bg-green-50 px-3 py-2 text-center text-sm font-medium text-green-700"> {translate('text.account_created_successfully_switch_to_the_following_login')}{' '}
                        {successCountdown}s.
                    </p>
                )}

                <Button
                    type="submit"
                    fullWidth
                    isLoading={registerMutation.isPending}
                    disabled={successCountdown !== null}
                >
                    {registerMutation.isPending
                        ? translate('text.creating')
                        : translate('text.create_account')}
                </Button>

                <Link
                    to={ROUTES.LOGIN}
                    className="block text-center text-sm text-[var(--color-primary-hover)] hover:text-[var(--color-primary)]"
                > {translate('text.already_have_an_account_login')} </Link>
            </form>
        </AuthPageCard>
    );
}
