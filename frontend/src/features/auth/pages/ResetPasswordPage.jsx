import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';

import Button from '../../../shared/components/Button';
import Input from '../../../shared/components/Input';
import { ROUTES } from '../../../shared/constants/routes';
import AuthPageCard from '../components/AuthPageCard';
import { useResetPassword } from '../hooks/useResetPassword';

const passwordSchema = z
    .string()
    .min(6, 'Mật khẩu phải có ít nhất 6 ký tự')
    .regex(/[a-z]/, 'Mật khẩu phải có ít nhất một chữ thường')
    .regex(/[0-9]/, 'Mật khẩu phải có ít nhất một số');

const resetPasswordSchema = z
    .object({
        email: z
            .string()
            .trim()
            .min(1, 'Vui lòng nhập email')
            .email('Email không hợp lệ'),
        otp: z
            .string()
            .trim()
            .length(6, 'OTP phải có 6 chữ số')
            .regex(/^\d+$/, 'OTP chỉ được chứa số'),
        newPassword: passwordSchema,
        confirmPassword: z.string().min(1, 'Vui lòng nhập lại mật khẩu'),
    })
    .refine((values) => values.newPassword === values.confirmPassword, {
        path: ['confirmPassword'],
        message: 'Mật khẩu nhập lại không khớp',
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
            confirmPassword: '',
        },
    });

    const onSubmit = (values) => {
        resetPasswordMutation.mutate({
            email: values.email.trim(),
            otp: values.otp.trim(),
            newPassword: values.newPassword,
        });
    };

    return (
        <AuthPageCard
            title="Đặt lại mật khẩu"
            subtitle="Nhập email, mã OTP và mật khẩu mới."
        >
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
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
                    autoComplete="one-time-code"
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

                <Input
                    label="Nhập lại mật khẩu mới"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Nhập lại mật khẩu mới"
                    helperText="Tối thiểu 6 ký tự, có chữ thường và số."
                    error={errors.confirmPassword?.message}
                    {...register('confirmPassword')}
                />

                {resetPasswordMutation.isSuccess && (
                    <p className="text-sm text-[var(--color-primary-hover)]">
                        {resetPasswordMutation.data.message ||
                            'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập lại.'}
                    </p>
                )}

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

                <Link
                    to={ROUTES.LOGIN}
                    className="block text-center text-sm text-[var(--color-primary-hover)] hover:text-[var(--color-primary)]"
                >
                    Quay lại đăng nhập
                </Link>
            </form>
        </AuthPageCard>
    );
}