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

const loginSchema = z.object({
    email: z
        .string()
        .min(1, 'Vui lòng nhập email')
        .email('Email không hợp lệ'),
    password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
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
            email: '',
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

    const apiError =
        loginMutation.error?.response?.data?.message ||
        loginMutation.error?.message;

    const isLocked = loginMutation.isPending || countdown !== null;

    const onSubmit = (values) => {
        loginMutation.mutate(values, {
            onSuccess: () => {
                setCountdown(3);
            },
        });
    };

    return (
        <AuthPageCard
            title="Đăng nhập"
            subtitle="Đăng nhập để quản lý tài khoản và đơn hàng."
        >
            <form
                className="space-y-4"
                onSubmit={handleSubmit(onSubmit)}
                noValidate
            >
                <Input
                    label="Email"
                    type="email"
                    placeholder="Nhập email"
                    disabled={isLocked}
                    error={errors.email?.message}
                    {...register('email')}
                />

                <Input
                    label="Mật khẩu"
                    type="password"
                    placeholder="Nhập mật khẩu"
                    disabled={isLocked}
                    error={errors.password?.message}
                    {...register('password')}
                />

                {apiError && countdown === null && (
                    <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--color-error)]">
                        {apiError}
                    </p>
                )}

                {countdown !== null && (
                    <div className="w-full cursor-not-allowed rounded-md border border-green-200 bg-green-50 px-3 py-2 text-center text-sm font-medium text-green-700">
                        Đăng nhập thành công {countdown}s.
                    </div>
                )}

                <Button
                    type="submit"
                    className="w-full"
                    isLoading={loginMutation.isPending}
                    disabled={countdown !== null}
                >
                    {loginMutation.isPending ? 'Đang đăng nhập...' : 'Đăng nhập'}
                </Button>

                <div className="flex items-center justify-between text-sm">
                    <Link
                        to={ROUTES.FORGOT_PASSWORD}
                        className={`text-[var(--color-text)] hover:text-[var(--color-primary)] ${isLocked ? 'pointer-events-none opacity-50' : ''
                            }`}
                    >
                        Quên mật khẩu?
                    </Link>

                    <Link
                        to={ROUTES.REGISTER}
                        className={`text-[var(--color-text)] hover:text-[var(--color-primary)] ${isLocked ? 'pointer-events-none opacity-50' : ''
                            }`}
                    >
                        Tạo tài khoản
                    </Link>
                </div>
            </form>
        </AuthPageCard>
    );
}

export default LoginPage;