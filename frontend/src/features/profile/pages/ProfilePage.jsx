import { zodResolver } from '@hookform/resolvers/zod';
import { LogOut, Save, UserRound } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import Badge from '../../../shared/components/Badge';
import Button from '../../../shared/components/Button';
import Card, { CardBody, CardHeader } from '../../../shared/components/Card';
import Input from '../../../shared/components/Input';
import Loading from '../../../shared/components/Loading';
import { useLogout } from '../../auth/hooks/useLogout';
import { useMe } from '../../auth/hooks/useMe';
import { useAuthStore } from '../../auth/store/auth.store';
import AccountNav from '../components/AccountNav';
import { useUpdateProfile } from '../hooks/useProfile';

const profileSchema = z.object({
    name: z.string().trim().min(2, 'Vui lòng nhập tên ít nhất 2 ký tự'),
    email: z.string().trim().email('Email không hợp lệ'),
    phone: z
        .string()
        .trim()
        .regex(/^\d{10,15}$/, 'Số điện thoại cần từ 10 đến 15 số')
        .or(z.literal('')),
    avatar: z.string().trim().url('Avatar phải là URL hợp lệ').or(z.literal('')),
});

function getDisplayName(user) {
    return (
        user?.profile?.full_name ||
        user?.full_name ||
        user?.name ||
        user?.email ||
        'Tài khoản'
    );
}

function toFormValues(user) {
    return {
        name: user?.profile?.full_name || user?.full_name || '',
        email: user?.email || '',
        phone: user?.profile?.phone_number || user?.phone || '',
        avatar: user?.profile?.avatar_url || user?.avatar || '',
    };
}

export default function ProfilePage() {
    const user = useAuthStore((state) => state.user);
    const meQuery = useMe();
    const logoutMutation = useLogout();
    const updateProfileMutation = useUpdateProfile();
    const displayUser = meQuery.data?.data || user;

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(profileSchema),
        defaultValues: toFormValues(displayUser),
    });

    useEffect(() => {
        if (displayUser) {
            reset(toFormValues(displayUser));
        }
    }, [displayUser, reset]);

    const onSubmit = (values) => {
        if (!displayUser?.id) {
            return;
        }

        updateProfileMutation.mutate({
            userId: displayUser.id,
            payload: {
                name: values.name.trim(),
                email: values.email.trim(),
                phone: values.phone.trim() || undefined,
                avatar: values.avatar.trim() || undefined,
            },
        });
    };

    if (meQuery.isLoading && !displayUser) {
        return <Loading label="Đang tải tài khoản..." />;
    }

    return (
        <div className="space-y-6">
            <AccountNav />

            <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
                <Card>
                    <CardBody>
                        <div className="flex flex-col items-center text-center">
                            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-secondary)] text-[var(--color-primary-hover)]">
                                <UserRound className="h-10 w-10" />
                            </div>
                            <h1 className="mt-4 text-2xl font-semibold text-[var(--color-text-main)]">
                                {getDisplayName(displayUser)}
                            </h1>
                            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                                {displayUser?.email}
                            </p>
                            <div className="mt-4 flex flex-wrap justify-center gap-2">
                                {(displayUser?.roles || []).map((role) => (
                                    <Badge key={role}>{role}</Badge>
                                ))}
                                {displayUser?.tier && (
                                    <Badge variant="accent">
                                        {displayUser.tier}
                                    </Badge>
                                )}
                            </div>
                        </div>

                        <div className="mt-6 border-t border-[var(--color-border)] pt-5">
                            <Button
                                variant="outline"
                                fullWidth
                                isLoading={logoutMutation.isPending}
                                onClick={() => logoutMutation.mutate()}
                            >
                                <LogOut className="h-4 w-4" />
                                Đăng xuất
                            </Button>
                        </div>
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader>
                        <h2 className="font-semibold text-[var(--color-text-main)]">
                            Thông tin cá nhân
                        </h2>
                    </CardHeader>
                    <CardBody>
                        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
                            <div className="grid gap-4 md:grid-cols-2">
                                <Input
                                    label="Họ tên"
                                    error={errors.name?.message}
                                    {...register('name')}
                                />
                                <Input
                                    label="Email"
                                    type="email"
                                    error={errors.email?.message}
                                    {...register('email')}
                                />
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <Input
                                    label="Số điện thoại"
                                    placeholder="0901234567"
                                    error={errors.phone?.message}
                                    {...register('phone')}
                                />
                                <Input
                                    label="Avatar URL"
                                    placeholder="https://..."
                                    error={errors.avatar?.message}
                                    {...register('avatar')}
                                />
                            </div>

                            {updateProfileMutation.isError && (
                                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--color-error)]">
                                    {updateProfileMutation.error.message}
                                </p>
                            )}

                            {updateProfileMutation.isSuccess && (
                                <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                                    Đã cập nhật hồ sơ.
                                </p>
                            )}

                            <Button
                                type="submit"
                                isLoading={updateProfileMutation.isPending}
                            >
                                <Save className="h-4 w-4" />
                                Lưu thay đổi
                            </Button>
                        </form>
                    </CardBody>
                </Card>
            </div>
        </div>
    );
}
