import { translate } from '../../../shared/i18n/index';
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
import Select from '../../../shared/components/Select';
import { useLogout } from '../../auth/hooks/useLogout';
import { useMe } from '../../auth/hooks/useMe';
import { useAuthStore } from '../../auth/store/auth.store';
import { useUploadAvatar } from '../../uploads/hooks/useUploadAvatar';
import AccountNav from '../components/AccountNav';
import { useUpdateProfile } from '../hooks/useProfile';

const profileSchema = z.object({
    name: z.string().trim().min(2, translate('text.please_enter_a_name_with_at_least_2_characters')),
    email: z
        .string()
        .trim()
        .refine(
            (value) => value === '' || z.string().email().safeParse(value).success,
            translate('text.invalid_email')
        ),
    phone: z.string(),
    avatar: z.string().trim().url(translate('text.avatar_must_be_a_valid_url')).or(z.literal('')),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNSPECIFIED']),
});

const genderOptions = [
    { value: 'UNSPECIFIED', label: translate('text.not_updated_yet') },
    { value: 'MALE', label: translate('text.nam') },
    { value: 'FEMALE', label: translate('text.female') },
    { value: 'OTHER', label: translate('text.other') },
];

const genderLabels = Object.fromEntries(
    genderOptions.map((option) => [option.value, option.label])
);

function getDisplayName(user) {
    return (
        user?.profile?.full_name ||
        user?.full_name ||
        user?.name ||
        user?.email ||
        translate('text.account')
    );
}

function toFormValues(user) {
    return {
        name: user?.profile?.full_name || user?.full_name || '',
        email: user?.email || '',
        phone: user?.profile?.phone_number || user?.phone || '',
        avatar: user?.profile?.avatar_url || user?.avatar || '',
        gender: user?.profile?.gender || 'UNSPECIFIED',
    };
}

function getDisplayPhone(user) {
    return user?.profile?.phone_number || user?.phone || '-';
}

function getDisplayGender(user) {
    return genderLabels[user?.profile?.gender] || genderLabels.UNSPECIFIED;
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
                    avatar: values.avatar.trim() || undefined,
                    gender: values.gender,
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
        return <Loading label={translate('text.loading_account')} />;
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
                                <p className="mt-3 text-sm text-[var(--color-text-muted)]"> {translate('text.uploading_avatar')} </p>
                            )}

                            {uploadAvatarMutation.isError && (
                                <p className="mt-3 text-sm text-[var(--color-error)]">
                                    {uploadAvatarMutation.error.message || translate('text.upload_avatar_failed')}
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
                                <LogOut className="h-4 w-4" /> {translate('text.sign_out')} </Button>
                        </div>
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader>
                        <h2 className="font-semibold text-[var(--color-text-main)]">
                            {isEditing ? translate('text.update_information') : translate('text.personal_information')}
                        </h2>
                    </CardHeader>
                    <CardBody>
                        {!isEditing ? (
                            <div className="space-y-5">
                                <dl className="grid gap-4 md:grid-cols-2">
                                    <div className="rounded-md border border-[var(--color-border)] p-4">
                                        <dt className="text-sm text-[var(--color-text-muted)]"> {translate('text.full_name')} </dt>
                                        <dd className="mt-1 font-medium text-[var(--color-text-main)]">
                                            {getDisplayName(displayUser)}
                                        </dd>
                                    </div>

                                    <div className="rounded-md border border-[var(--color-border)] p-4">
                                        <dt className="text-sm text-[var(--color-text-muted)]"> {translate('text.email_84add5b2')} </dt>
                                        <dd className="mt-1 break-all font-medium text-[var(--color-text-main)]">
                                            {displayUser?.email || '-'}
                                        </dd>
                                    </div>

                                    <div className="rounded-md border border-[var(--color-border)] p-4">
                                        <dt className="text-sm text-[var(--color-text-muted)]"> {translate('text.phone_number')} </dt>
                                        <dd className="mt-1 font-medium text-[var(--color-text-main)]">
                                            {getDisplayPhone(displayUser)}
                                        </dd>
                                    </div>

                                    <div className="rounded-md border border-[var(--color-border)] p-4">
                                        <dt className="text-sm text-[var(--color-text-muted)]"> {translate('text.gender')} </dt>
                                        <dd className="mt-1 font-medium text-[var(--color-text-main)]">
                                            {getDisplayGender(displayUser)}
                                        </dd>
                                    </div>

                                    <div className="rounded-md border border-[var(--color-border)] p-4">
                                        <dt className="text-sm text-[var(--color-text-muted)]"> {translate('text.account_class')} </dt>
                                        <dd className="mt-1 font-medium text-[var(--color-text-main)]">
                                            {displayUser?.tier || '-'}
                                        </dd>
                                    </div>
                                </dl>

                                {updateProfileMutation.isSuccess && (
                                    <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700"> {translate('text.profile_updated')} </p>
                                )}

                                <Button type="button" onClick={handleStartEdit}>
                                    <Pencil className="h-4 w-4" /> {translate('text.edit')} </Button>
                            </div>
                        ) : (
                            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
                                <input type="hidden" {...register('avatar')} />

                                <div className="grid gap-4 md:grid-cols-2">
                                    <Input
                                        label={translate('text.full_name')}
                                        error={errors.name?.message}
                                        {...register('name')}
                                    />
                                    <Input
                                        label={translate('text.email_84add5b2')}
                                        type="email"
                                        error={errors.email?.message}
                                        {...register('email')}
                                    />
                                </div>

                                <Input
                                    label={translate('text.phone_number')}
                                    placeholder="0901234567"
                                    disabled
                                    helperText={translate('text.login_phone_number_can_only_be_changed_through_the_otp_authentication_pr')}
                                    error={errors.phone?.message}
                                    {...register('phone')}
                                />

                                <Select
                                    label={translate('text.gender')}
                                    error={errors.gender?.message}
                                    {...register('gender')}
                                >
                                    {genderOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </Select>

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
                                        <Save className="h-4 w-4" /> {translate('text.save_changes')} </Button>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={
                                            updateProfileMutation.isPending ||
                                            uploadAvatarMutation.isPending
                                        }
                                        onClick={handleCancelEdit}
                                    >
                                        <X className="h-4 w-4" /> {translate('text.cancel')} </Button>
                                </div>
                            </form>
                        )}
                    </CardBody>
                </Card>
            </div>
        </div>
    );
}
