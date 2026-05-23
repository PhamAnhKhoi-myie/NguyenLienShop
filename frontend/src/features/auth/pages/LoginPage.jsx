import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useLocation } from 'react-router-dom';
import { z } from 'zod';
import Button from '../../../shared/components/Button';
import Input from '../../../shared/components/Input';
import { ROUTES } from '../../../shared/constants/routes';
import { useLogin } from '../hooks/useLogin';

const loginSchema = z.object({
    email: z
        .string()
        .trim()
        .min(1, 'Vui lòng nhập email')
        .email('Email không hợp lệ'),
    password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

export default function LoginPage() {
    const location = useLocation();
    const redirectTo = location.state?.from?.pathname || ROUTES.HOME;
    const message = location.state?.message;
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

    return (
        <div>
            <h1 className="text-2xl font-semibold text-[var(--color-text-main)]">
                Đăng nhập
            </h1>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                Đăng nhập để quản lý tài khoản và đơn hàng.
            </p>

            {message && (
                <p className="mt-4 rounded-md bg-[var(--color-secondary)] px-3 py-2 text-sm text-[var(--color-primary-hover)]">
                    {message}
                </p>
            )}

            <form
                className="mt-6 space-y-4"
                onSubmit={handleSubmit((values) => loginMutation.mutate(values))}
            >
                <Input
                    label="Email"
                    type="email"
                    autoComplete="email"
                    placeholder="Nhập email"
                    error={errors.email?.message}
                    {...register('email')}
                />

                <Input
                    label="Mật khẩu"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Nhập mật khẩu"
                    error={errors.password?.message}
                    {...register('password')}
                />

                {loginMutation.isError && (
                    <p className="text-sm text-[var(--color-error)]">
                        {loginMutation.error.message}
                    </p>
                )}

                <Button
                    type="submit"
                    fullWidth
                    isLoading={loginMutation.isPending}
                >
                    {loginMutation.isPending ? 'Đang đăng nhập...' : 'Đăng nhập'}
                </Button>
            </form>

            <div className="mt-4 flex items-center justify-between text-sm">
                <Link
                    to={ROUTES.FORGOT_PASSWORD}
                    className="text-[var(--color-primary-hover)] hover:text-[var(--color-primary)]"
                >
                    Quên mật khẩu?
                </Link>
                <Link
                    to={ROUTES.REGISTER}
                    className="text-[var(--color-primary-hover)] hover:text-[var(--color-primary)]"
                >
                    Tạo tài khoản
                </Link>
            </div>
        </div>
    );
}
