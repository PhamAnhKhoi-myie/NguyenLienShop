import { translate } from '../../../shared/i18n/index';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
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

const REMEMBERED_LOGIN_KEY = 'remembered_login';

function getRememberedLogin() {
    try {
        const rememberedLogin = JSON.parse(
            window.localStorage.getItem(REMEMBERED_LOGIN_KEY)
        );

        if (
            typeof rememberedLogin?.phone_number === 'string' &&
            typeof rememberedLogin?.password === 'string'
        ) {
            return rememberedLogin;
        }
    } catch {
        window.localStorage.removeItem(REMEMBERED_LOGIN_KEY);
    }

    return null;
}

function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [showPassword, setShowPassword] = useState(false);
    const [rememberPassword, setRememberPassword] = useState(
        () => getRememberedLogin() !== null
    );
    const [rememberedLogin] = useState(getRememberedLogin);
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
            phone_number: rememberedLogin?.phone_number || '',
            password: rememberedLogin?.password || '',
        },
    });

    const apiError = loginMutation.error?.message;
    const isLocked = loginMutation.isPending;

    const onSubmit = (values) => {
        loginMutation.mutate(
            {
                phone_number: normalizePhoneNumber(values.phone_number),
                password: values.password,
            },
            {
                onSuccess: () => {
                    if (rememberPassword) {
                        window.localStorage.setItem(
                            REMEMBERED_LOGIN_KEY,
                            JSON.stringify({
                                phone_number: normalizePhoneNumber(
                                    values.phone_number
                                ),
                                password: values.password,
                            })
                        );
                    } else {
                        window.localStorage.removeItem(REMEMBERED_LOGIN_KEY);
                    }

                    navigate(redirectTo, { replace: true });
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
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder={translate('text.enter_password')}
                    disabled={isLocked}
                    error={errors.password?.message}
                    endAdornment={
                        <button
                            type="button"
                            className="rounded p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-gray-100 hover:text-[var(--color-text-main)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-primary)] disabled:pointer-events-none disabled:opacity-50"
                            onClick={() => setShowPassword((current) => !current)}
                            aria-label={translate(
                                showPassword
                                    ? 'text.hide_password'
                                    : 'text.show_password'
                            )}
                            aria-pressed={showPassword}
                            disabled={isLocked}
                        >
                            {showPassword ? (
                                <EyeOff className="h-4 w-4" aria-hidden="true" />
                            ) : (
                                <Eye className="h-4 w-4" aria-hidden="true" />
                            )}
                        </button>
                    }
                    {...register('password')}
                />

                <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-[var(--color-text-main)]">
                    <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-[var(--color-border)] accent-[var(--color-primary)]"
                        checked={rememberPassword}
                        onChange={(event) =>
                            setRememberPassword(event.target.checked)
                        }
                        disabled={isLocked}
                    />
                    <span>{translate('text.remember_password')}</span>
                </label>

                {location.state?.message && (
                    <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                        {location.state.message}
                    </p>
                )}

                {apiError && (
                    <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--color-error)]">
                        {apiError}
                    </p>
                )}

                <Button
                    type="submit"
                    className="w-full"
                    isLoading={loginMutation.isPending}
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
