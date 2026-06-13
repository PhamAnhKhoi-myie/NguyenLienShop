import { translate } from '../../../shared/i18n/index';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import AuthPageCard from '../components/AuthPageCard';
import Button from '../../../shared/components/Button';
import Input from '../../../shared/components/Input';
import { useLogin } from '../hooks/useLogin';
import { ROUTES } from '../../../shared/constants/routes';
import {
    isValidVietnamPhoneNumber,
    normalizePhoneNumber,
} from '../../../shared/utils/phone';

const loginSchema = z.object({
    phone_number: z
        .string()
        .trim()
        .min(1, translate('text.please_enter_phone_number'))
        .refine(isValidVietnamPhoneNumber, translate('text.invalid_phone_number')),
    password: z.string().min(1, translate('text.please_enter_password')),
});

function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [countdown, setCountdown] = useState(null);
    const from = location.state?.from;
    const redirectTo = from
        ? `${from.pathname}${from.search || ''}`
        : ROUTES.HOME;
    const loginMutation = useLogin();

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            phone_number: '',
            password: '',
        },
    });

    useEffect(() => {
        if (countdown === null) return;

        if (countdown <= 0) {
            navigate(redirectTo, { replace: true });
            return;
        }

        const timerId = setTimeout(() => {
            setCountdown((current) => current - 1);
        }, 1000);

        return () => clearTimeout(timerId);
    }, [countdown, navigate, redirectTo]);

    const apiError = loginMutation.error?.message;
    const isLocked = loginMutation.isPending || countdown !== null;

    const onSubmit = (values) => {
        loginMutation.mutate(
            {
                phone_number: normalizePhoneNumber(values.phone_number),
                password: values.password,
            },
            {
                onSuccess: () => {
                    setCountdown(3);
                },
            }
        );
    };

    return (
        <AuthPageCard
            title={translate('text.login')}
            subtitle={translate('text.log_in_with_phone_number_and_password')}
        >
            <form
                className="space-y-4"
                onSubmit={handleSubmit(onSubmit)}
                noValidate
            >
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

                <Input
                    label={translate('text.password')}
                    type="password"
                    autoComplete="current-password"
                    placeholder={translate('text.enter_password')}
                    disabled={isLocked}
                    error={errors.password?.message}
                    {...register('password')}
                />

                {location.state?.message && countdown === null && (
                    <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                        {location.state.message}
                    </p>
                )}

                {apiError && countdown === null && (
                    <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--color-error)]">
                        {apiError}
                    </p>
                )}

                {countdown !== null && (
                    <div className="w-full cursor-not-allowed rounded-md border border-green-200 bg-green-50 px-3 py-2 text-center text-sm font-medium text-green-700"> {translate('text.successful_login')} {countdown}s.
                    </div>
                )}

                <Button
                    type="submit"
                    className="w-full"
                    isLoading={loginMutation.isPending}
                    disabled={countdown !== null}
                >
                    {loginMutation.isPending ? translate('text.logging_in') : translate('text.login')}
                </Button>

                <div className="flex items-center justify-between text-sm">
                    <Link
                        to={ROUTES.FORGOT_PASSWORD}
                        className={`text-[var(--color-text)] hover:text-[var(--color-primary)] ${
                            isLocked ? 'pointer-events-none opacity-50' : ''
                        }`}
                    > {translate('text.forgot_password_1630fc02')} </Link>

                    <Link
                        to={ROUTES.REGISTER}
                        className={`text-[var(--color-text)] hover:text-[var(--color-primary)] ${
                            isLocked ? 'pointer-events-none opacity-50' : ''
                        }`}
                    > {translate('text.create_account')} </Link>
                </div>
            </form>
        </AuthPageCard>
    );
}

export default LoginPage;
