import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import Button from '../../../shared/components/Button';
import Input from '../../../shared/components/Input';
import { ROUTES } from '../../../shared/constants/routes';
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

    return (
        <div>
            <h1 className="text-2xl font-semibold text-[var(--color-text-main)]">
                Quên mật khẩu
            </h1>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                Nhập email để nhận mã khôi phục mật khẩu.
            </p>

            <form
                className="mt-6 space-y-4"
                onSubmit={handleSubmit((values) =>
                    forgotPasswordMutation.mutate(values)
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
            </form>

            <Link
                to={ROUTES.RESET_PASSWORD}
                className="mt-4 block text-center text-sm text-[var(--color-primary-hover)] hover:text-[var(--color-primary)]"
            >
                Đã có mã OTP? Đặt lại mật khẩu
            </Link>
        </div>
    );
}
