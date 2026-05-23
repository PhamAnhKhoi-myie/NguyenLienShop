import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';

import Button from '../../../shared/components/Button';
import Input from '../../../shared/components/Input';
import { ROUTES } from '../../../shared/constants/routes';
import AuthPageCard from '../components/AuthPageCard';
import { useForgotPassword } from '../hooks/useForgotPassword';

const forgotPasswordSchema = z.object({
    email: z
        .string()
        .trim()
        .min(1, 'Vui lòng nhập email')
        .email('Email không hợp lệ'),
});

export default function ForgotPasswordPage() {
    const forgotPasswordMutation = useForgotPassword();

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: {
            email: '',
        },
    });

    const onSubmit = (values) => {
        forgotPasswordMutation.mutate(values);
    };

    return (
        <AuthPageCard
            title="Quên mật khẩu"
            subtitle="Nhập email để nhận mã khôi phục mật khẩu."
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

                {forgotPasswordMutation.isSuccess && (
                    <p className="text-sm text-[var(--color-primary-hover)]">
                        {forgotPasswordMutation.data.message ||
                            'Nếu email tồn tại, mã khôi phục đã được gửi.'}
                    </p>
                )}

                {forgotPasswordMutation.isError && (
                    <p className="text-sm text-[var(--color-error)]">
                        {forgotPasswordMutation.error.message}
                    </p>
                )}

                <Button
                    type="submit"
                    fullWidth
                    isLoading={forgotPasswordMutation.isPending}
                >
                    {forgotPasswordMutation.isPending
                        ? 'Đang gửi...'
                        : 'Gửi mã khôi phục'}
                </Button>

                <Link
                    to={ROUTES.RESET_PASSWORD}
                    className="block text-center text-sm text-[var(--color-primary-hover)] hover:text-[var(--color-primary)]"
                >
                    Đã có mã OTP? Đặt lại mật khẩu
                </Link>
            </form>
        </AuthPageCard>
    );
}