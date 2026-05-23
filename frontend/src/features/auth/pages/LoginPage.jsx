import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useLocation } from 'react-router-dom';
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
    const location = useLocation();
    const from = location.state?.from;
    const redirectTo = from
        ? `${from.pathname}${from.search || ''}`
        : ROUTES.HOME;
    const loginMutation = useLogin(redirectTo);

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

    const apiError =
        loginMutation.error?.response?.data?.message ||
        loginMutation.error?.message;

    const onSubmit = (values) => {
        loginMutation.mutate(values);
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
                    disabled={loginMutation.isPending}
                    error={errors.email?.message}
                    {...register('email')}
                />

                <Input
                    label="Mật khẩu"
                    type="password"
                    placeholder="Nhập mật khẩu"
                    disabled={loginMutation.isPending}
                    error={errors.password?.message}
                    {...register('password')}
                />

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
                    Đăng nhập
                </Button>

                <div className="flex items-center justify-between text-sm">
                    <Link
                        to={ROUTES.FORGOT_PASSWORD}
                        className="text-[var(--color-text)] hover:text-[var(--color-primary)]"
                    >
                        Quên mật khẩu?
                    </Link>

                    <Link
                        to={ROUTES.REGISTER}
                        className="text-[var(--color-text)] hover:text-[var(--color-primary)]"
                    >
                        Tạo tài khoản
                    </Link>
                </div>
            </form>
        </AuthPageCard>
    );
}

export default LoginPage;
