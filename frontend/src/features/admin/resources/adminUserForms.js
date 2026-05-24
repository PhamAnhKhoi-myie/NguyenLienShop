import { z } from 'zod';

export const userStatusOptions = [
    { value: '', label: 'Tất cả trạng thái' },
    { value: 'ACTIVE', label: 'ACTIVE' },
    { value: 'INACTIVE', label: 'INACTIVE' },
    { value: 'SUSPENDED', label: 'SUSPENDED' },
];

export const userRoleOptions = [
    { value: 'CUSTOMER', label: 'CUSTOMER' },
    { value: 'VIP', label: 'VIP' },
    { value: 'MANAGER', label: 'MANAGER' },
    { value: 'ADMIN', label: 'ADMIN' },
];

export const userTierOptions = [
    { value: 'bronze', label: 'bronze' },
    { value: 'silver', label: 'silver' },
    { value: 'gold', label: 'gold' },
    { value: 'platinum', label: 'platinum' },
];

const optionalUrlSchema = z
    .string()
    .trim()
    .refine((value) => value === '' || isValidUrl(value), 'URL không hợp lệ');

const optionalPhoneSchema = z
    .string()
    .trim()
    .refine(
        (value) => value === '' || /^\d{10,}$/.test(value),
        'Số điện thoại cần ít nhất 10 chữ số'
    );

export const userProfileFormConfig = {
    title: 'hồ sơ người dùng',
    schema: z.object({
        name: z
            .string()
            .trim()
            .refine(
                (value) => value === '' || value.length >= 2,
                'Tên cần ít nhất 2 ký tự'
            ),
        email: z
            .string()
            .trim()
            .email('Email không hợp lệ'),
        phone: optionalPhoneSchema,
        avatar: optionalUrlSchema,
    }),
    defaultValues: {
        name: '',
        email: '',
        phone: '',
        avatar: '',
    },
    toFormValues: (user = {}) => ({
        name: user.profile?.full_name || '',
        email: user.email || '',
        phone: user.profile?.phone_number || '',
        avatar: user.profile?.avatar_url || '',
    }),
    toPayload: (values) => {
        const payload = {
            email: values.email.trim().toLowerCase(),
        };

        if (values.name.trim()) {
            payload.name = values.name.trim();
        }

        if (values.phone.trim()) {
            payload.phone = values.phone.trim();
        }

        if (values.avatar.trim()) {
            payload.avatar = values.avatar.trim();
        }

        return payload;
    },
    fields: [
        { name: 'name', label: 'Tên', placeholder: 'Nguyễn Văn A' },
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'phone', label: 'Số điện thoại' },
        { name: 'avatar', label: 'Avatar URL', placeholder: 'https://...' },
    ],
};

export const userStatusFormConfig = {
    title: 'trạng thái tài khoản',
    schema: z.object({
        status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
    }),
    defaultValues: {
        status: 'ACTIVE',
    },
    toFormValues: (user = {}) => ({
        status: user.status || 'ACTIVE',
    }),
    toPayload: (values) => ({
        status: values.status,
    }),
    fields: [
        {
            name: 'status',
            label: 'Trạng thái',
            type: 'select',
            options: userStatusOptions.filter((option) => option.value),
        },
    ],
};

export const userRolesSchema = z.object({
    roles: z.array(z.enum(['CUSTOMER', 'VIP', 'MANAGER', 'ADMIN'])).min(1),
});

function isValidUrl(value) {
    try {
        new URL(value);
        return true;
    } catch {
        return false;
    }
}
