import { translate } from '../../../shared/i18n/index';
import { z } from 'zod';

export const userStatusOptions = [
    { value: '', label: translate('text.all_statuses') },
    { value: 'ACTIVE', label: translate('text.active') },
    { value: 'INACTIVE', label: translate('text.inactive') },
    { value: 'SUSPENDED', label: translate('text.suspended') },
];

export const userRoleOptions = [
    { value: 'CUSTOMER', label: translate('text.customer_340f7cf7') },
    { value: 'VIP', label: translate('text.vip') },
    { value: 'MANAGER', label: translate('text.manager') },
    { value: 'ADMIN', label: translate('text.admin_b521caa6') },
];

export const userTierOptions = [
    { value: 'bronze', label: translate('text.bronze') },
    { value: 'silver', label: translate('text.silver') },
    { value: 'gold', label: translate('text.gold') },
    { value: 'platinum', label: translate('text.platinum') },
];

export const userGenderOptions = [
    { value: 'UNSPECIFIED', label: translate('text.not_updated_yet') },
    { value: 'MALE', label: translate('text.nam') },
    { value: 'FEMALE', label: translate('text.female') },
    { value: 'OTHER', label: translate('text.other') },
];

const optionalUrlSchema = z
    .string()
    .trim()
    .refine((value) => value === '' || isValidUrl(value), translate('text.invalid_url'));

export const userProfileFormConfig = {
    title: translate('text.user_profile'),
    schema: z.object({
        name: z
            .string()
            .trim()
            .refine(
                (value) => value === '' || value.length >= 2,
                translate('text.name_needs_to_be_at_least_2_characters')
            ),
        email: z
            .string()
            .trim()
            .refine(
                (value) =>
                    value === '' || z.string().email().safeParse(value).success,
                translate('text.invalid_email')
            ),
        avatar: optionalUrlSchema,
        gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNSPECIFIED']),
    }),
    defaultValues: {
        name: '',
        email: '',
        avatar: '',
        gender: 'UNSPECIFIED',
    },
    toFormValues: (user = {}) => ({
        name: user.profile?.full_name || '',
        email: user.email || '',
        avatar: user.profile?.avatar_url || '',
        gender: user.profile?.gender || 'UNSPECIFIED',
    }),
    toPayload: (values) => {
        const payload = {
            email: values.email.trim().toLowerCase(),
        };

        if (values.name.trim()) {
            payload.name = values.name.trim();
        }

        if (values.avatar.trim()) {
            payload.avatar = values.avatar.trim();
        }

        payload.gender = values.gender;

        return payload;
    },
    fields: [
        { name: 'name', label: translate('text.name'), placeholder: translate('text.nguyen_van_a') },
        { name: 'email', label: translate('text.email_84add5b2'), type: 'email' },
        { name: 'avatar', label: translate('text.avatar_url'), placeholder: 'https://...' },
        {
            name: 'gender',
            label: translate('text.gender'),
            type: 'select',
            options: userGenderOptions,
        },
    ],
};

export const userStatusFormConfig = {
    title: translate('text.account_status'),
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
            label: translate('text.status'),
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
