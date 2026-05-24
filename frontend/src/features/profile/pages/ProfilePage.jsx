import { zodResolver } from '@hookform/resolvers/zod';
import { Camera, LogOut, Pencil, Save, UserRound, X } from 'lucide-react';
import { useEffect, useState } from 'react';
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
import { useUploadAvatar } from '../../uploads/hooks/useUploadAvatar';
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

function getDisplayPhone(user) {
    return user?.profile?.phone_number || user?.phone || '-';
}

export default function ProfilePage() {
    const user = useAuthStore((state) => state.user);
    const meQuery = useMe();
    const logoutMutation = useLogout();
    const updateProfileMutation = useUpdateProfile();
    const uploadAvatarMutation = useUploadAvatar();
    const [isEditing, setIsEditing] = useState(false);
    const [avatarPreview, setAvatarPreview] = useState({
        userId: null,
        url: '',
    });
    const displayUser = meQuery.data?.data || user;

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(profileSchema),
        defaultValues: toFormValues(displayUser),
    });

    const uploadedAvatarUrl =
        avatarPreview.userId === displayUser?.id ? avatarPreview.url : '';
    const avatarSrc = uploadedAvatarUrl || displayUser?.profile?.avatar_url || '';
    const avatarUploadInputId = 'profile-avatar-upload';

    useEffect(() => {
        if (displayUser && !isEditing) {
            reset(toFormValues(displayUser));
        }
    }, [displayUser, isEditing, reset]);

    const handleStartEdit = () => {
        if (!displayUser) {
            return;
        }

        updateProfileMutation.reset();
        uploadAvatarMutation.reset();
        setAvatarPreview({
            userId: null,
            url: '',
        });
        reset(toFormValues(displayUser));
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        updateProfileMutation.reset();
        uploadAvatarMutation.reset();
        setAvatarPreview({
            userId: null,
            url: '',
        });
        reset(toFormValues(displayUser));
        setIsEditing(false);
    };

    const handleAvatarChange = async (event) => {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        if (!displayUser?.id) {
            event.target.value = '';
            return;
        }

        if (!file.type.startsWith('image/')) {
            event.target.value = '';
            return;
        }

        let result;

        try {
            result = await uploadAvatarMutation.mutateAsync(file);
        } catch {
            event.target.value = '';
            return;
        }

        setValue('avatar', result.url, {
            shouldDirty: true,
            shouldValidate: true,
        });

        setAvatarPreview({
            userId: displayUser.id,
            url: result.url,
        });
        event.target.value = '';

        if (!isEditing) {
            updateProfileMutation.mutate({
                userId: displayUser.id,
                payload: {
                    avatar: result.url,
                },
            });
        }
    };

    const onSubmit = (values) => {
        if (!displayUser?.id) {
            return;
        }

        updateProfileMutation.mutate(
            {
                userId: displayUser.id,
                payload: {
                    name: values.name.trim(),
                    email: values.email.trim(),
                    phone: values.phone.trim() || undefined,
                    avatar: values.avatar.trim() || undefined,
                },
            },
            {
                onSuccess: () => {
                    setIsEditing(false);
                },
            }
        );
    };

    if (meQuery.isLoading && !displayUser) {
        return <Loading label="Đang tải tài khoản..." />;
    }

    const avatarCircle = (
        <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-[var(--color-secondary)] text-[var(--color-primary-hover)]">
            {avatarSrc ? (
                <img
                    src={avatarSrc}
                    alt={getDisplayName(displayUser)}
                    className="h-full w-full object-cover"
                />
            ) : (
                <UserRound className="h-12 w-12" />
            )}

            <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-white opacity-0 transition-opacity hover:opacity-100">
                <Camera className="h-6 w-6" />
            </span>
        </div>
    );

    return (
        <div className="space-y-6">
            <AccountNav />

            <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
                <Card>
                    <CardBody>
                        <div className="flex flex-col items-center text-center">
                            <label
                                htmlFor={avatarUploadInputId}
                                className="cursor-pointer rounded-full focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--color-primary)]"
                            >
                                {avatarCircle}
                            </label>
                            <input
                                id={avatarUploadInputId}
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarChange}
                                disabled={
                                    uploadAvatarMutation.isPending ||
                                    updateProfileMutation.isPending
                                }
                                className="sr-only"
                            />

                            {uploadAvatarMutation.isPending && (
                                <p className="mt-3 text-sm text-[var(--color-text-muted)]">
                                    Đang upload avatar...
                                </p>
                            )}

                            {uploadAvatarMutation.isError && (
                                <p className="mt-3 text-sm text-[var(--color-error)]">
                                    {uploadAvatarMutation.error.message || 'Upload avatar thất bại'}
                                </p>
                            )}

                            {errors.avatar?.message && (
                                <p className="mt-3 text-sm text-[var(--color-error)]">
                                    {errors.avatar.message}
                                </p>
                            )}

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
                            {isEditing ? 'Cập nhật thông tin' : 'Thông tin cá nhân'}
                        </h2>
                    </CardHeader>
                    <CardBody>
                        {!isEditing ? (
                            <div className="space-y-5">
                                <dl className="grid gap-4 md:grid-cols-2">
                                    <div className="rounded-md border border-[var(--color-border)] p-4">
                                        <dt className="text-sm text-[var(--color-text-muted)]">
                                            Họ tên
                                        </dt>
                                        <dd className="mt-1 font-medium text-[var(--color-text-main)]">
                                            {getDisplayName(displayUser)}
                                        </dd>
                                    </div>

                                    <div className="rounded-md border border-[var(--color-border)] p-4">
                                        <dt className="text-sm text-[var(--color-text-muted)]">
                                            Email
                                        </dt>
                                        <dd className="mt-1 break-all font-medium text-[var(--color-text-main)]">
                                            {displayUser?.email || '-'}
                                        </dd>
                                    </div>

                                    <div className="rounded-md border border-[var(--color-border)] p-4">
                                        <dt className="text-sm text-[var(--color-text-muted)]">
                                            Số điện thoại
                                        </dt>
                                        <dd className="mt-1 font-medium text-[var(--color-text-main)]">
                                            {getDisplayPhone(displayUser)}
                                        </dd>
                                    </div>

                                    <div className="rounded-md border border-[var(--color-border)] p-4">
                                        <dt className="text-sm text-[var(--color-text-muted)]">
                                            Hạng tài khoản
                                        </dt>
                                        <dd className="mt-1 font-medium text-[var(--color-text-main)]">
                                            {displayUser?.tier || '-'}
                                        </dd>
                                    </div>
                                </dl>

                                {updateProfileMutation.isSuccess && (
                                    <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                                        Đã cập nhật hồ sơ.
                                    </p>
                                )}

                                <Button type="button" onClick={handleStartEdit}>
                                    <Pencil className="h-4 w-4" />
                                    Chỉnh sửa
                                </Button>
                            </div>
                        ) : (
                            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
                                <input type="hidden" {...register('avatar')} />

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

                                <Input
                                    label="Số điện thoại"
                                    placeholder="0901234567"
                                    error={errors.phone?.message}
                                    {...register('phone')}
                                />

                                {updateProfileMutation.isError && (
                                    <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--color-error)]">
                                        {updateProfileMutation.error.message}
                                    </p>
                                )}

                                <div className="flex flex-wrap gap-3">
                                    <Button
                                        type="submit"
                                        isLoading={updateProfileMutation.isPending}
                                        disabled={uploadAvatarMutation.isPending}
                                    >
                                        <Save className="h-4 w-4" />
                                        Lưu thay đổi
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={
                                            updateProfileMutation.isPending ||
                                            uploadAvatarMutation.isPending
                                        }
                                        onClick={handleCancelEdit}
                                    >
                                        <X className="h-4 w-4" />
                                        Hủy
                                    </Button>
                                </div>
                            </form>
                        )}
                    </CardBody>
                </Card>
            </div>
        </div>
    );
}
