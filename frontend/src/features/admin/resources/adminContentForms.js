import { translate } from '../../../shared/i18n/index';
import { z } from 'zod';
import { uploadApi } from '../../uploads/api/upload.api';

const bannerLocations = [
    { value: 'homepage_top', label: translate('text.home_top') },
    { value: 'homepage_middle', label: translate('text.home_middle_of_page') },
    { value: 'homepage_bottom', label: translate('text.home_bottom') },
    { value: 'category_page', label: translate('text.category_page') },
];

const announcementTargets = [
    { value: 'all', label: translate('text.all') },
    { value: 'user', label: translate('text.guest_is_logged_in') },
    { value: 'admin', label: translate('text.admin_manager') },
    { value: 'guest', label: translate('text.visitors') },
];

const announcementTypes = [
    { value: 'info', label: translate('text.information') },
    { value: 'warning', label: translate('text.warning') },
    { value: 'promotion', label: translate('text.promotion') },
    { value: 'system', label: translate('text.system') },
    { value: 'urgent', label: translate('text.urgent') },
];

const booleanOptions = [
    { value: 'true', label: translate('text.yes') },
    { value: 'false', label: translate('text.no') },
];

const dayOptions = [
    { key: 'mon', label: translate('text.monday') },
    { key: 'tue', label: translate('text.tuesday') },
    { key: 'wed', label: translate('text.wednesday') },
    { key: 'thu', label: translate('text.thursday') },
    { key: 'fri', label: translate('text.friday') },
    { key: 'sat', label: translate('text.saturday') },
    { key: 'sun', label: translate('text.sunday') },
    { key: 'holiday', label: translate('text.holiday') },
];

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

const localDateTimeSchema = (label) =>
    z
        .string()
        .trim()
        .min(1, translate('text.value_is_required', { value0: label }))
        .refine(isValidLocalDateTime, translate('text.value_invalid', { value0: label }));

const optionalHttpUrlSchema = (label) =>
    z
        .string()
        .trim()
        .refine(
            (value) => value === '' || isHttpUrl(value),
            translate('text.value_must_be_an_http_s_url', { value0: label })
        );

const optionalZaloSchema = z
    .string()
    .trim()
    .refine(
        (value) =>
            value === '' ||
            isHttpUrl(value) ||
            /^(\+?\d[\d\s().-]{5,20}|[a-zA-Z0-9_.-]{3,64})$/.test(value),
        translate('text.zalo_must_be_an_http_s_url_phone_number_or_secure_id')
    );

const timeOrEmptySchema = (label) =>
    z
        .string()
        .trim()
        .refine(
            (value) => value === '' || timePattern.test(value),
            translate('text.value_must_be_in_the_format_hh_mm', { value0: label })
        );

const bannerLinkSchema = z
    .string()
    .trim()
    .refine(
        (value) => value === '' || isSafeBannerLink(value),
        translate('text.link_must_be_an_http_s_url_internal_route_or_id')
    );

function isHttpUrl(value) {
    try {
        const url = new URL(value);
        return ['http:', 'https:'].includes(url.protocol);
    } catch {
        return false;
    }
}

function isSafeBannerLink(value) {
    if (/^https?:\/\//i.test(value)) {
        return isHttpUrl(value);
    }

    if (/^\/(?!\/)[^\s]*$/.test(value)) {
        return true;
    }

    return /^[a-zA-Z0-9_-]+$/.test(value);
}

function isValidLocalDateTime(value) {
    const timestamp = new Date(value).getTime();
    return value.includes('T') && Number.isFinite(timestamp);
}

function toDateTimeInput(value, fallbackDate = new Date()) {
    const date = value ? new Date(value) : fallbackDate;

    if (!Number.isFinite(date.getTime())) {
        return '';
    }

    const localDate = new Date(
        date.getTime() - date.getTimezoneOffset() * 60000
    );

    return localDate.toISOString().slice(0, 16);
}

function toIsoDateTime(value) {
    return new Date(value).toISOString();
}

function addDays(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
}

function cleanNullable(value) {
    const trimmed = String(value || '').trim();
    return trimmed || null;
}

function buildWorkingHourValues(hours = []) {
    const values = {};

    dayOptions.forEach(({ key }) => {
        const hour = hours.find((item) => item.day === key);
        values[`${key}_open`] = hour?.open || '';
        values[`${key}_close`] = hour?.close || '';
    });

    return values;
}

function parseWorkingHours(values) {
    return dayOptions
        .map(({ key }) => ({
            day: key,
            open: values[`${key}_open`],
            close: values[`${key}_close`],
        }))
        .filter((hour) => hour.open && hour.close);
}

function validateWorkingHours(values, ctx) {
    let configuredDays = 0;

    dayOptions.forEach(({ key, label }) => {
        const open = values[`${key}_open`];
        const close = values[`${key}_close`];

        if (!open && !close) {
            return;
        }

        if (!open) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: [`${key}_open`],
                message: translate('text.value_missing_opening_hours', { value0: label }),
            });
            return;
        }

        if (!close) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: [`${key}_close`],
                message: translate('text.value_missing_closing_hours', { value0: label }),
            });
            return;
        }

        configuredDays += 1;

        if (open >= close) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: [`${key}_close`],
                message: translate('text.value_closing_hours_must_be_after_opening_hours', { value0: label }),
            });
        }
    });

    if (configuredDays === 0) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['mon_open'],
            message: translate('text.please_configure_at_least_one_open_day'),
        });
    }
}

const workingHourSchemaShape = dayOptions.reduce((shape, { key, label }) => {
    shape[`${key}_open`] = timeOrEmptySchema(translate('text.value_open', { value0: label }));
    shape[`${key}_close`] = timeOrEmptySchema(translate('text.value_closed', { value0: label }));
    return shape;
}, {});

export const bannerFormSchema = z
    .object({
        image_file: z.any().optional(),
        image_url: z.string().optional(),
        image_public_id: z.string().optional(),
        image_alt_text: z
            .string()
            .trim()
            .max(200, translate('text.alt_text_must_not_exceed_200_characters')),
        link: bannerLinkSchema,
        location: z.enum([
            'homepage_top',
            'homepage_middle',
            'homepage_bottom',
            'category_page',
        ]),
        sort_order: z.coerce
            .number()
            .int(translate('text.order_must_be_an_integer'))
            .min(0, translate('text.order_cannot_be_negative'))
            .max(999, translate('text.order_not_to_exceed_999')),
        start_at: localDateTimeSchema(translate('text.start_time')),
        end_at: localDateTimeSchema(translate('text.end_time')),
    })
    .superRefine((values, ctx) => {
        const hasOldImage = Boolean(values.image_url);
        const hasNewFile = values.image_file?.length > 0;

        if (!hasOldImage && !hasNewFile) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['image_file'],
                message: translate('text.please_select_banner_image'),
            });
        }

        if (new Date(values.end_at) <= new Date(values.start_at)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['end_at'],
                message: translate('text.end_time_must_be_after_start_time'),
            });
        }
    });

export const announcementFormSchema = z
    .object({
        title: z
            .string()
            .trim()
            .min(5, translate('text.title_needs_to_be_at_least_5_characters'))
            .max(200, translate('text.title_must_not_exceed_200_characters')),
        content: z
            .string()
            .trim()
            .min(10, translate('text.content_must_be_at_least_10_characters'))
            .max(5000, translate('text.content_must_not_exceed_5000_characters')),
        priority: z.coerce
            .number()
            .int(translate('text.priority_must_be_an_integer'))
            .min(0, translate('text.priority_cannot_be_negative'))
            .max(10, translate('text.priority_does_not_exceed_10')),
        target: z.enum(['all', 'user', 'admin', 'guest']),
        type: z.enum(['info', 'warning', 'promotion', 'system', 'urgent']),
        start_at: localDateTimeSchema(translate('text.start_time')),
        end_at: localDateTimeSchema(translate('text.end_time')),
        is_dismissible: z.enum(['true', 'false']),
    })
    .superRefine((values, ctx) => {
        if (new Date(values.end_at) <= new Date(values.start_at)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['end_at'],
                message: translate('text.end_time_must_be_after_start_time'),
            });
        }
    });

export const shopInfoFormSchema = z
    .object({
        shop_name: z
            .string()
            .trim()
            .min(2, translate('text.shop_name_needs_at_least_2_characters'))
            .max(100, translate('text.shop_name_must_not_exceed_100_characters')),
        email: z
            .string()
            .trim()
            .email(translate('text.invalid_email')),
        phone: z
            .string()
            .trim()
            .min(10, translate('text.phone_number_needs_to_be_at_least_10_characters'))
            .max(20, translate('text.phone_number_must_not_exceed_20_characters'))
            .regex(/^(\+84|0)[0-9]{9,10}$/, translate('text.phone_number_needs_to_be_in_vietnamese_format')),
        address: z
            .string()
            .trim()
            .min(5, translate('text.address_must_be_at_least_5_characters'))
            .max(500, translate('text.address_must_not_exceed_500_characters')),
        shipping_partner: z
            .string()
            .trim()
            .max(200, translate('text.shipping_partner_must_not_exceed_200_characters')),
        facebook: optionalHttpUrlSchema('Facebook'),
        zalo: optionalZaloSchema,
        instagram: optionalHttpUrlSchema('Instagram'),
        shoppe: optionalHttpUrlSchema('Shoppe'),
        tiktok: optionalHttpUrlSchema('TikTok'),
        ministry_notified: optionalHttpUrlSchema(translate('text.ministry_of_industry_and_trade_announcement_link')),
        ministry_registered: optionalHttpUrlSchema(translate('text.ministry_of_industry_and_trade_registration_link')),
        certification_extra: optionalHttpUrlSchema(translate('text.backup_certificate_link')),
        map_embed_url: optionalHttpUrlSchema('Google Map'),
        is_active: z.enum(['true', 'false']),
        ...workingHourSchemaShape,
    })
    .superRefine(validateWorkingHours);

export const bannerFormConfig = {
    title: translate('text.banner'),
    schema: bannerFormSchema,
    createEndpoint: '/banners',
    updateMethod: 'put',
    getDetailEndpoint: (row) => `/banners/${row.id || row._id}`,
    getUpdateEndpoint: (row) => `/banners/${row.id || row._id}`,
    defaultValues: {
        image_file: null,
        image_url: '',
        image_public_id: '',
        image_alt_text: '',
        link: '',
        location: 'homepage_top',
        sort_order: 0,
        start_at: '',
        end_at: '',
    },
    toFormValues: (banner = {}) => ({
        image_file: null,
        image_url: banner.image?.url || '',
        image_public_id: banner.image?.public_id || '',
        image_alt_text: banner.image?.alt_text || '',
        link: banner.link || '',
        location: banner.location || 'homepage_top',
        sort_order: banner.sort_order ?? 0,
        start_at: toDateTimeInput(banner.start_at),
        end_at: toDateTimeInput(banner.end_at, addDays(30)),
    }),
    toPayload: async (values) => {
        let imageUrl = values.image_url;
        let imagePublicId = values.image_public_id;

        const file = values.image_file?.[0];

        if (file) {
            const uploadedImage = await uploadApi.uploadBanner(file);

            imageUrl = uploadedImage.url;
            imagePublicId = uploadedImage.public_id;
        }

        return {
            image: {
                url: imageUrl,
                public_id: imagePublicId,
                alt_text: cleanNullable(values.image_alt_text) || undefined,
            },
            link: values.link?.trim() || '/',
            location: values.location,
            sort_order: Number(values.sort_order || 0),
            start_at: toIsoDateTime(values.start_at),
            end_at: toIsoDateTime(values.end_at),
        };
    },
    fields: [
        {
            name: 'image_file',
            label: translate('text.banner_image'),
            type: 'file',
            accept: 'image/*',
            helperText: ({ mode }) =>
                mode === 'edit'
                    ? translate('text.select_a_new_image_if_you_want_to_replace_the_current_image')
                    : translate('text.select_an_image_from_your_computer'),
            className: 'md:col-span-2',
        },
        {
            name: 'image_alt_text',
            label: translate('text.alt_text'),
            placeholder: translate('text.white_fruit_bag_16x16'),
        },
        {
            name: 'location',
            label: translate('text.location'),
            type: 'select',
            options: bannerLocations,
        },
        { name: 'sort_order', label: translate('text.order'), type: 'number' },
        { name: 'start_at', label: translate('text.start'), type: 'datetime-local' },
        { name: 'end_at', label: translate('text.end'), type: 'datetime-local' },
    ],
};

export const announcementFormConfig = {
    title: translate('text.announces'),
    schema: announcementFormSchema,
    createEndpoint: '/announcements',
    updateMethod: 'put',
    getDetailEndpoint: (row) => `/announcements/${row.id || row._id}`,
    getUpdateEndpoint: (row) => `/announcements/${row.id || row._id}`,
    defaultValues: {
        title: '',
        content: '',
        priority: 0,
        target: 'all',
        type: 'info',
        start_at: '',
        end_at: '',
        is_dismissible: 'true',
    },
    toFormValues: (announcement = {}) => ({
        title: announcement.title || '',
        content: announcement.content || '',
        priority: announcement.priority ?? 0,
        target: announcement.target || 'all',
        type: announcement.type || 'info',
        start_at: toDateTimeInput(announcement.start_at),
        end_at: toDateTimeInput(announcement.end_at, addDays(30)),
        is_dismissible: announcement.is_dismissible === false ? 'false' : 'true',
    }),
    toPayload: (values) => ({
        title: values.title.trim(),
        content: values.content.trim(),
        priority: Number(values.priority || 0),
        target: values.target,
        type: values.type,
        start_at: toIsoDateTime(values.start_at),
        end_at: toIsoDateTime(values.end_at),
        is_dismissible: values.is_dismissible === 'true',
    }),
    fields: [
        { name: 'title', label: translate('text.title'), placeholder: translate('text.holiday_announcements_promotions') },
        {
            name: 'type',
            label: translate('text.type'),
            type: 'select',
            options: announcementTypes,
        },
        {
            name: 'target',
            label: translate('text.object'),
            type: 'select',
            options: announcementTargets,
        },
        { name: 'priority', label: translate('text.priority'), type: 'number' },
        { name: 'start_at', label: translate('text.start'), type: 'datetime-local' },
        { name: 'end_at', label: translate('text.end'), type: 'datetime-local' },
        {
            name: 'is_dismissible',
            label: translate('text.allows_disabling'),
            type: 'select',
            options: booleanOptions,
        },
        {
            name: 'content',
            label: translate('text.content'),
            type: 'textarea',
            rows: 6,
            className: 'md:col-span-2',
        },
    ],
};

export const shopInfoFormConfig = {
    title: translate('text.shop_information_90a1d336'),
    schema: shopInfoFormSchema,
    defaultValues: {
        shop_name: '',
        email: '',
        phone: '',
        address: '',
        shipping_partner: '',
        facebook: '',
        zalo: '',
        instagram: '',
        shoppe: '',
        tiktok: '',
        ministry_notified: '',
        ministry_registered: '',
        certification_extra: '',
        map_embed_url: '',
        is_active: 'true',
        ...buildWorkingHourValues(),
    },
    toFormValues: (shopInfo = {}) => ({
        shop_name: shopInfo.shop_name || '',
        email: shopInfo.email || '',
        phone: shopInfo.phone || '',
        address: shopInfo.address || '',
        shipping_partner: shopInfo.shipping_partner || '',
        facebook: shopInfo.social_links?.facebook || '',
        zalo: shopInfo.social_links?.zalo || '',
        instagram: shopInfo.social_links?.instagram || '',
        shoppe: shopInfo.social_links?.shoppe || '',
        tiktok: shopInfo.social_links?.tiktok || '',
        ministry_notified: shopInfo.certification_links?.ministry_notified || '',
        ministry_registered: shopInfo.certification_links?.ministry_registered || '',
        certification_extra: shopInfo.certification_links?.extra || '',
        map_embed_url: shopInfo.map_embed_url || '',
        is_active: shopInfo.is_active === false ? 'false' : 'true',
        ...buildWorkingHourValues(shopInfo.working_hours),
    }),
    toPayload: (values) => ({
        shop_name: values.shop_name.trim(),
        email: values.email.trim().toLowerCase(),
        phone: values.phone.trim(),
        address: values.address.trim(),
        shipping_partner: cleanNullable(values.shipping_partner),
        working_hours: parseWorkingHours(values),
        social_links: {
            facebook: cleanNullable(values.facebook),
            zalo: cleanNullable(values.zalo),
            instagram: cleanNullable(values.instagram),
            shoppe: cleanNullable(values.shoppe),
            tiktok: cleanNullable(values.tiktok),
        },
        certification_links: {
            ministry_notified: cleanNullable(values.ministry_notified),
            ministry_registered: cleanNullable(values.ministry_registered),
            extra: cleanNullable(values.certification_extra),
        },
        map_embed_url: cleanNullable(values.map_embed_url),
        is_active: values.is_active === 'true',
    }),
    fields: [
        { name: 'shop_name', label: translate('text.shop_name'), placeholder: translate('text.nguyen_lien_shop') },
        { name: 'email', label: translate('text.email_84add5b2'), type: 'email', placeholder: translate('text.shop_example_com') },
        { name: 'phone', label: translate('text.phone_number'), placeholder: '0912345678' },
        {
            name: 'is_active',
            label: translate('text.shop_status'),
            type: 'select',
            options: [
                { value: 'true', label: translate('text.on') },
                { value: 'false', label: translate('text.off') },
            ],
        },
        {
            name: 'address',
            label: translate('text.address'),
            type: 'textarea',
            className: 'md:col-span-2',
        },
        {
            name: 'shipping_partner',
            label: translate('text.shipping_partner'),
            placeholder: translate('text.viettel_post'),
            className: 'md:col-span-2',
        },
        { name: 'facebook', label: translate('text.facebook'), placeholder: 'https://...' },
        { name: 'zalo', label: translate('text.zalo'), placeholder: translate('text.phone_number_id_or_url') },
        { name: 'instagram', label: translate('text.instagram'), placeholder: 'https://...' },
        { name: 'shoppe', label: translate('text.shoppe'), placeholder: 'https://...' },
        { name: 'tiktok', label: translate('text.tiktok'), placeholder: 'https://...' },
        {
            name: 'ministry_notified',
            label: translate('text.logo_link_announced_to_the_ministry_of_industry_and_trade'),
            placeholder: 'https://...',
        },
        {
            name: 'ministry_registered',
            label: translate('text.registered_logo_link_of_the_ministry_of_industry_and_trade'),
            placeholder: 'https://...',
        },
        {
            name: 'certification_extra',
            label: translate('text.backup_certificate_link'),
            placeholder: 'https://...',
        },
        {
            name: 'map_embed_url',
            label: translate('text.google_map'),
            placeholder: 'https://...',
            className: 'md:col-span-2',
        },
        ...dayOptions.flatMap(({ key, label }) => [
            {
                name: `${key}_open`,
                label: translate('text.value_open', { value0: label }),
                type: 'time',
            },
            {
                name: `${key}_close`,
                label: translate('text.value_closed', { value0: label }),
                type: 'time',
            },
        ]),
    ],
};

export const contentFilterOptions = {
    bannerLocations,
    announcementTargets,
    announcementTypes,
};
