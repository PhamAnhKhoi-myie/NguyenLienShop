import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import Button from '../../../shared/components/Button';
import Input from '../../../shared/components/Input';
import { ROUTES } from '../../../shared/constants/routes';
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
    const registerMutation = useRegister();

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

    const onSubmit = (values) => {
        const payload = {
            email: values.email,
            password: values.password,
        };

        if (values.full_name.trim()) {
            payload.full_name = values.full_name.trim();
        }

        registerMutation.mutate(payload);
    };

    return (
        <div>
            <h1 className="text-2xl font-semibold text-[var(--color-text-main)]">
                Đăng ký
            </h1>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                Tạo tài khoản để theo dõi đơn hàng và lưu địa chỉ giao hàng.
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
                <Input
                    label="Họ tên"
                    placeholder="Nhập họ tên"
                    error={errors.full_name?.message}
                    {...register('full_name')}
                />
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
                    autoComplete="new-password"
                    placeholder="Nhập mật khẩu"
                    helperText="Tối thiểu 6 ký tự, có chữ thường và số."
                    error={errors.password?.message}
                    {...register('password')}
                />

                {registerMutation.isError && (
                    <p className="text-sm text-[var(--color-error)]">
                        {registerMutation.error.message}
                    </p>
                )}

                <Button
                    type="submit"
                    fullWidth
                    isLoading={registerMutation.isPending}
                >
                    {registerMutation.isPending ? 'Đang tạo...' : 'Tạo tài khoản'}
                </Button>
            </form>

            <Link
                to={ROUTES.LOGIN}
                className="mt-4 block text-center text-sm text-[var(--color-primary-hover)] hover:text-[var(--color-primary)]"
            >
                Đã có tài khoản? Đăng nhập
            </Link>
        </div>
    );
}
