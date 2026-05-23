import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import Button from '../../../shared/components/Button';
import Card, { CardBody, CardHeader } from '../../../shared/components/Card';
import Input from '../../../shared/components/Input';
import AccountNav from '../components/AccountNav';
import { useChangePassword } from '../../auth/hooks/useChangePassword';

const changePasswordSchema = z
    .object({
        currentPassword: z
            .string()
            .min(1, 'Vui lòng nhập mật khẩu hiện tại'),
        newPassword: z
            .string()
            .min(8, 'Mật khẩu mới cần ít nhất 8 ký tự'),
        confirmPassword: z
            .string()
            .min(1, 'Vui lòng xác nhận mật khẩu mới'),
    })
    .refine((values) => values.newPassword === values.confirmPassword, {
        message: 'Mật khẩu xác nhận không khớp',
        path: ['confirmPassword'],
    })
    .refine((values) => values.currentPassword !== values.newPassword, {
        message: 'Mật khẩu mới không được trùng mật khẩu hiện tại',
        path: ['newPassword'],
    });

export default function ChangePasswordPage() {
    const changePasswordMutation = useChangePassword();

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(changePasswordSchema),
        defaultValues: {
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
        },
    });

    const onSubmit = (values) => {
        changePasswordMutation.mutate(
            {
                currentPassword: values.currentPassword,
                newPassword: values.newPassword,
            },
            {
                onSuccess: () => {
                    reset();
                },
            }
        );
    };

    return (
        <div className="space-y-6">
            <AccountNav />

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <KeyRound className="h-5 w-5 text-[var(--color-primary)]" />
                        <h1 className="font-semibold text-[var(--color-text-main)]">
                            Đổi mật khẩu
                        </h1>
                    </div>
                </CardHeader>

                <CardBody>
                    <form
                        className="max-w-xl space-y-4"
                        onSubmit={handleSubmit(onSubmit)}
                    >
                        <Input
                            label="Mật khẩu hiện tại"
                            type="password"
                            autoComplete="current-password"
                            error={errors.currentPassword?.message}
                            {...register('currentPassword')}
                        />

                        <Input
                            label="Mật khẩu mới"
                            type="password"
                            autoComplete="new-password"
                            error={errors.newPassword?.message}
                            {...register('newPassword')}
                        />

                        <Input
                            label="Xác nhận mật khẩu mới"
                            type="password"
                            autoComplete="new-password"
                            error={errors.confirmPassword?.message}
                            {...register('confirmPassword')}
                        />

                        {changePasswordMutation.isError && (
                            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--color-error)]">
                                {changePasswordMutation.error.message}
                            </p>
                        )}

                        {changePasswordMutation.isSuccess && (
                            <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                                Đã đổi mật khẩu thành công.
                            </p>
                        )}

                        <Button
                            type="submit"
                            isLoading={changePasswordMutation.isPending}
                        >
                            <Save className="h-4 w-4" />
                            Lưu mật khẩu mới
                        </Button>
                    </form>
                </CardBody>
            </Card>
        </div>
    );
}