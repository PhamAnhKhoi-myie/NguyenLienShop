import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import Button from '../../../shared/components/Button';
import Input from '../../../shared/components/Input';
import { ROUTES } from '../../../shared/constants/routes';
import { useResetPassword } from '../hooks/useResetPassword';

const passwordSchema = z
    .string()
    .min(6, 'Mật khẩu phải có ít nhất 6 ký tự')
    .regex(/[a-z]/, 'Mật khẩu phải có ít nhất một chữ thường')
    .regex(/[0-9]/, 'Mật khẩu phải có ít nhất một số');

const resetPasswordSchema = z.object({
    email: z
        .string()
        .trim()
        .min(1, 'Vui lòng nhập email')
        .email('Email không hợp lệ'),
    otp: z
        .string()
        .length(6, 'OTP phải có 6 chữ số')
        .regex(/^\d+$/, 'OTP chỉ được chứa số'),
    newPassword: passwordSchema,
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
            email: '',
            otp: '',
            newPassword: '',
        },
    });

    return (
        <div>
            <h1 className="text-2xl font-semibold text-[var(--color-text-main)]">
                Đặt lại mật khẩu
            </h1>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                Nhập email, mã OTP và mật khẩu mới.
            </p>

            <form
                className="mt-6 space-y-4"
                onSubmit={handleSubmit((values) =>
                    resetPasswordMutation.mutate(values)
                )}
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
                    label="OTP"
                    inputMode="numeric"
                    placeholder="Nhập mã OTP"
                    error={errors.otp?.message}
                    {...register('otp')}
                />
                <Input
                    label="Mật khẩu mới"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Nhập mật khẩu mới"
                    helperText="Tối thiểu 6 ký tự, có chữ thường và số."
                    error={errors.newPassword?.message}
                    {...register('newPassword')}
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
                        ? 'Đang cập nhật...'
                        : 'Cập nhật mật khẩu'}
                </Button>
            </form>

            <Link
                to={ROUTES.LOGIN}
                className="mt-4 block text-center text-sm text-[var(--color-primary-hover)] hover:text-[var(--color-primary)]"
            >
                Quay lại đăng nhập
            </Link>
        </div>
    );
}
