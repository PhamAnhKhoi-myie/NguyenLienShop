import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import Button from '../../../shared/components/Button';
import Input from '../../../shared/components/Input';
import { ROUTES } from '../../../shared/constants/routes';
import AuthPageCard from '../components/AuthPageCard';
import { useRegister } from '../hooks/useRegister';

const passwordSchema = z
    .string()
    .min(6, 'Mật khẩu phải có ít nhất 6 ký tự')
    .regex(/[a-z]/, 'Mật khẩu phải có ít nhất một chữ thường')
    .regex(/[0-9]/, 'Mật khẩu phải có ít nhất một số');

const registerSchema = z.object({
    full_name: z
        .string()
        .trim()
        .refine((value) => value.length === 0 || value.length >= 2, {
            message: 'Tên phải có ít nhất 2 ký tự',
        }),
    email: z
        .string()
        .trim()
        .min(1, 'Vui lòng nhập email')
        .email('Email không hợp lệ'),
    password: passwordSchema,
});

export default function RegisterPage() {
    const navigate = useNavigate();
    const registerMutation = useRegister();
    const [countdown, setCountdown] = useState(null);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            full_name: '',
            email: '',
            password: '',
        },
    });

    useEffect(() => {
        if (countdown === null) return;

        if (countdown <= 0) {
            navigate(ROUTES.LOGIN, {
                replace: true,
                state: {
                    message: 'Đăng ký thành công. Vui lòng đăng nhập.',
                },
            });
            return;
        }

        const timerId = setTimeout(() => {
            setCountdown((current) => current - 1);
        }, 1000);

        return () => clearTimeout(timerId);
    }, [countdown, navigate]);

    const goToLogin = () => {
        navigate(ROUTES.LOGIN, {
            replace: true,
            state: {
                message: 'Đăng ký thành công. Vui lòng đăng nhập.',
            },
        });
    };

    const onSubmit = (values) => {
        const payload = {
            email: values.email,
            password: values.password,
        };

        if (values.full_name.trim()) {
            payload.full_name = values.full_name.trim();
        }

        registerMutation.mutate(payload, {
            onSuccess: () => {
                setCountdown(5);
            },
        });
    };

    return (
        <AuthPageCard
            title="Đăng ký"
            subtitle="Tạo tài khoản để mua hàng và theo dõi đơn."
        >
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
                <Input
                    label="Họ tên"
                    placeholder="Nhập họ tên"
                    disabled={registerMutation.isPending || countdown !== null}
                    error={errors.full_name?.message}
                    {...register('full_name')}
                />

                <Input
                    label="Email"
                    type="email"
                    autoComplete="email"
                    placeholder="Nhập email"
                    disabled={registerMutation.isPending || countdown !== null}
                    error={errors.email?.message}
                    {...register('email')}
                />

                <Input
                    label="Mật khẩu"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Nhập mật khẩu"
                    helperText="Tối thiểu 6 ký tự, có chữ thường và số."
                    disabled={registerMutation.isPending || countdown !== null}
                    error={errors.password?.message}
                    {...register('password')}
                />

                {registerMutation.isError && (
                    <p className="text-sm text-[var(--color-error)]">
                        {registerMutation.error?.response?.data?.message ||
                            registerMutation.error?.message ||
                            'Tạo tài khoản thất bại'}
                    </p>
                )}

                {countdown !== null && (
                    <button
                        type="button"
                        onClick={goToLogin}
                        className="w-full rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700 transition hover:bg-green-100 hover:underline"
                    >
                        Tạo thành công, chuyển qua đăng nhập sau {countdown}s.
                    </button>
                )}

                <Button
                    type="submit"
                    fullWidth
                    isLoading={registerMutation.isPending}
                    disabled={countdown !== null}
                >
                    {registerMutation.isPending ? 'Đang tạo...' : 'Tạo tài khoản'}
                </Button>

                <Link
                    to={ROUTES.LOGIN}
                    className="block text-center text-sm text-[var(--color-primary-hover)] hover:text-[var(--color-primary)]"
                >
                    Đã có tài khoản? Đăng nhập
                </Link>
            </form>
        </AuthPageCard>
    );
}