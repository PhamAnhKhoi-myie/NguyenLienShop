import { z } from 'zod';

const bannerLocations = [
    { value: 'homepage_top', label: 'Trang chủ - đầu trang' },
    { value: 'homepage_middle', label: 'Trang chủ - giữa trang' },
    { value: 'homepage_bottom', label: 'Trang chủ - cuối trang' },
    { value: 'category_page', label: 'Trang danh mục' },
];

const announcementTargets = [
    { value: 'all', label: 'Tất cả' },
    { value: 'user', label: 'Khách đã đăng nhập' },
    { value: 'admin', label: 'Admin/Manager' },
    { value: 'guest', label: 'Khách vãng lai' },
];

const announcementTypes = [
    { value: 'info', label: 'Thông tin' },
    { value: 'warning', label: 'Cảnh báo' },
    { value: 'promotion', label: 'Khuyến mãi' },
    { value: 'system', label: 'Hệ thống' },
    { value: 'urgent', label: 'Khẩn cấp' },
];

const booleanOptions = [
    { value: 'true', label: 'Có' },
    { value: 'false', label: 'Không' },
];

const dayOptions = [
    { key: 'mon', label: 'Thứ 2' },
    { key: 'tue', label: 'Thứ 3' },
    { key: 'wed', label: 'Thứ 4' },
    { key: 'thu', label: 'Thứ 5' },
    { key: 'fri', label: 'Thứ 6' },
    { key: 'sat', label: 'Thứ 7' },
    { key: 'sun', label: 'Chủ nhật' },
];

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

const localDateTimeSchema = (label) =>
    z
        .string()
        .trim()
        .min(1, `${label} là bắt buộc`)
        .refine(isValidLocalDateTime, `${label} không hợp lệ`);

const httpUrlSchema = (label) =>
    z
        .string()
        .trim()
        .min(1, `${label} là bắt buộc`)
        .refine(isHttpUrl, `${label} phải là URL HTTP(S)`);

const optionalHttpUrlSchema = (label) =>
    z
        .string()
        .trim()
        .refine(
            (value) => value === '' || isHttpUrl(value),
            `${label} phải là URL HTTP(S)`
        );

const optionalZaloSchema = z
    .string()
    .trim()
    .refine(
        (value) =>
            value === '' ||
            isHttpUrl(value) ||
            /^(\+?\d[\d\s().-]{5,20}|[a-zA-Z0-9_.-]{3,64})$/.test(value),
        'Zalo phải là URL HTTP(S), số điện thoại hoặc ID an toàn'
    );

const timeOrEmptySchema = (label) =>
    z
        .string()
        .trim()
        .refine(
            (value) => value === '' || timePattern.test(value),
            `${label} phải theo định dạng HH:mm`
        );

const bannerLinkSchema = z
    .string()
    .trim()
    .min(1, 'Link banner là bắt buộc')
    .refine(isSafeBannerLink, 'Link phải là URL HTTP(S), route nội bộ hoặc ID');

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
                message: `${label} thiếu giờ mở cửa`,
            });
            return;
        }

        if (!close) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: [`${key}_close`],
                message: `${label} thiếu giờ đóng cửa`,
            });
            return;
        }

        configuredDays += 1;

        if (open >= close) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: [`${key}_close`],
                message: `${label}: giờ đóng cửa phải sau giờ mở cửa`,
            });
        }
    });

    if (configuredDays === 0) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['mon_open'],
            message: 'Vui lòng cấu hình ít nhất một ngày mở cửa',
        });
    }
}

const workingHourSchemaShape = dayOptions.reduce((shape, { key, label }) => {
    shape[`${key}_open`] = timeOrEmptySchema(`${label} mở cửa`);
    shape[`${key}_close`] = timeOrEmptySchema(`${label} đóng cửa`);
    return shape;
}, {});

export const bannerFormSchema = z
    .object({
        image_url: httpUrlSchema('Ảnh banner'),
        image_alt_text: z
            .string()
            .trim()
            .max(200, 'Alt text không vượt quá 200 ký tự'),
        link: bannerLinkSchema,
        location: z.enum([
            'homepage_top',
            'homepage_middle',
            'homepage_bottom',
            'category_page',
        ]),
        sort_order: z.coerce
            .number()
            .int('Thứ tự phải là số nguyên')
            .min(0, 'Thứ tự không được âm')
            .max(999, 'Thứ tự không vượt quá 999'),
        start_at: localDateTimeSchema('Thời điểm bắt đầu'),
        end_at: localDateTimeSchema('Thời điểm kết thúc'),
    })
    .superRefine((values, ctx) => {
        if (new Date(values.end_at) <= new Date(values.start_at)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['end_at'],
                message: 'Thời điểm kết thúc phải sau thời điểm bắt đầu',
            });
        }
    });

export const announcementFormSchema = z
    .object({
        title: z
            .string()
            .trim()
            .min(5, 'Tiêu đề cần ít nhất 5 ký tự')
            .max(200, 'Tiêu đề không vượt quá 200 ký tự'),
        content: z
            .string()
            .trim()
            .min(10, 'Nội dung cần ít nhất 10 ký tự')
            .max(5000, 'Nội dung không vượt quá 5000 ký tự'),
        priority: z.coerce
            .number()
            .int('Ưu tiên phải là số nguyên')
            .min(0, 'Ưu tiên không được âm')
            .max(10, 'Ưu tiên không vượt quá 10'),
        target: z.enum(['all', 'user', 'admin', 'guest']),
        type: z.enum(['info', 'warning', 'promotion', 'system', 'urgent']),
        start_at: localDateTimeSchema('Thời điểm bắt đầu'),
        end_at: localDateTimeSchema('Thời điểm kết thúc'),
        is_dismissible: z.enum(['true', 'false']),
    })
    .superRefine((values, ctx) => {
        if (new Date(values.end_at) <= new Date(values.start_at)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['end_at'],
                message: 'Thời điểm kết thúc phải sau thời điểm bắt đầu',
            });
        }
    });

export const shopInfoFormSchema = z
    .object({
        shop_name: z
            .string()
            .trim()
            .min(2, 'Tên shop cần ít nhất 2 ký tự')
            .max(100, 'Tên shop không vượt quá 100 ký tự'),
        email: z
            .string()
            .trim()
            .email('Email không hợp lệ'),
        phone: z
            .string()
            .trim()
            .min(10, 'Số điện thoại cần ít nhất 10 ký tự')
            .max(20, 'Số điện thoại không vượt quá 20 ký tự')
            .regex(/^(\+84|0)[0-9]{9,10}$/, 'Số điện thoại cần đúng định dạng Việt Nam'),
        address: z
            .string()
            .trim()
            .min(5, 'Địa chỉ cần ít nhất 5 ký tự')
            .max(500, 'Địa chỉ không vượt quá 500 ký tự'),
        facebook: optionalHttpUrlSchema('Facebook'),
        zalo: optionalZaloSchema,
        instagram: optionalHttpUrlSchema('Instagram'),
        shoppe: optionalHttpUrlSchema('Shoppe'),
        map_embed_url: optionalHttpUrlSchema('Google Map'),
        is_active: z.enum(['true', 'false']),
        ...workingHourSchemaShape,
    })
    .superRefine(validateWorkingHours);

export const bannerFormConfig = {
    title: 'banner',
    schema: bannerFormSchema,
    createEndpoint: '/banners',
    updateMethod: 'put',
    getDetailEndpoint: (row) => `/banners/${row.id || row._id}`,
    getUpdateEndpoint: (row) => `/banners/${row.id || row._id}`,
    defaultValues: {
        image_url: '',
        image_alt_text: '',
        link: '',
        location: 'homepage_top',
        sort_order: 0,
        start_at: '',
        end_at: '',
    },
    toFormValues: (banner = {}) => ({
        image_url: banner.image?.url || '',
        image_alt_text: banner.image?.alt_text || '',
        link: banner.link || '',
        location: banner.location || 'homepage_top',
        sort_order: banner.sort_order ?? 0,
        start_at: toDateTimeInput(banner.start_at),
        end_at: toDateTimeInput(banner.end_at, addDays(30)),
    }),
    toPayload: (values) => ({
        image: {
            url: values.image_url.trim(),
            alt_text: cleanNullable(values.image_alt_text) || undefined,
        },
        link: values.link.trim(),
        location: values.location,
        sort_order: Number(values.sort_order || 0),
        start_at: toIsoDateTime(values.start_at),
        end_at: toIsoDateTime(values.end_at),
    }),
    fields: [
        { name: 'image_url', label: 'Ảnh banner', placeholder: 'https://...' },
        { name: 'image_alt_text', label: 'Alt text', placeholder: 'Túi bao trái cây trắng 16x16' },
        { name: 'link', label: 'Link', placeholder: '/products hoặc https://...' },
        {
            name: 'location',
            label: 'Vị trí',
            type: 'select',
            options: bannerLocations,
        },
        { name: 'sort_order', label: 'Thứ tự', type: 'number' },
        { name: 'start_at', label: 'Bắt đầu', type: 'datetime-local' },
        { name: 'end_at', label: 'Kết thúc', type: 'datetime-local' },
    ],
};

export const announcementFormConfig = {
    title: 'thông báo',
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
        { name: 'title', label: 'Tiêu đề', placeholder: 'Thông báo nghỉ lễ, khuyến mãi...' },
        {
            name: 'type',
            label: 'Loại',
            type: 'select',
            options: announcementTypes,
        },
        {
            name: 'target',
            label: 'Đối tượng',
            type: 'select',
            options: announcementTargets,
        },
        { name: 'priority', label: 'Ưu tiên', type: 'number' },
        { name: 'start_at', label: 'Bắt đầu', type: 'datetime-local' },
        { name: 'end_at', label: 'Kết thúc', type: 'datetime-local' },
        {
            name: 'is_dismissible',
            label: 'Cho phép tắt',
            type: 'select',
            options: booleanOptions,
        },
        {
            name: 'content',
            label: 'Nội dung',
            type: 'textarea',
            rows: 6,
            className: 'md:col-span-2',
        },
    ],
};

export const shopInfoFormConfig = {
    title: 'thông tin shop',
    schema: shopInfoFormSchema,
    defaultValues: {
        shop_name: '',
        email: '',
        phone: '',
        address: '',
        facebook: '',
        zalo: '',
        instagram: '',
        shoppe: '',
        map_embed_url: '',
        is_active: 'true',
        ...buildWorkingHourValues(),
    },
    toFormValues: (shopInfo = {}) => ({
        shop_name: shopInfo.shop_name || '',
        email: shopInfo.email || '',
        phone: shopInfo.phone || '',
        address: shopInfo.address || '',
        facebook: shopInfo.social_links?.facebook || '',
        zalo: shopInfo.social_links?.zalo || '',
        instagram: shopInfo.social_links?.instagram || '',
        shoppe: shopInfo.social_links?.shoppe || '',
        map_embed_url: shopInfo.map_embed_url || '',
        is_active: shopInfo.is_active === false ? 'false' : 'true',
        ...buildWorkingHourValues(shopInfo.working_hours),
    }),
    toPayload: (values) => ({
        shop_name: values.shop_name.trim(),
        email: values.email.trim().toLowerCase(),
        phone: values.phone.trim(),
        address: values.address.trim(),
        working_hours: parseWorkingHours(values),
        social_links: {
            facebook: cleanNullable(values.facebook),
            zalo: cleanNullable(values.zalo),
            instagram: cleanNullable(values.instagram),
            shoppe: cleanNullable(values.shoppe),
        },
        map_embed_url: cleanNullable(values.map_embed_url),
        is_active: values.is_active === 'true',
    }),
    fields: [
        { name: 'shop_name', label: 'Tên shop', placeholder: 'Nguyễn Liên Shop' },
        { name: 'email', label: 'Email', type: 'email', placeholder: 'shop@example.com' },
        { name: 'phone', label: 'Số điện thoại', placeholder: '0912345678' },
        {
            name: 'is_active',
            label: 'Trạng thái shop',
            type: 'select',
            options: [
                { value: 'true', label: 'Đang bật' },
                { value: 'false', label: 'Đang tắt' },
            ],
        },
        {
            name: 'address',
            label: 'Địa chỉ',
            type: 'textarea',
            className: 'md:col-span-2',
        },
        { name: 'facebook', label: 'Facebook', placeholder: 'https://...' },
        { name: 'zalo', label: 'Zalo', placeholder: 'Số điện thoại, ID hoặc URL' },
        { name: 'instagram', label: 'Instagram', placeholder: 'https://...' },
        { name: 'shoppe', label: 'Shoppe', placeholder: 'https://...' },
        {
            name: 'map_embed_url',
            label: 'Google Map',
            placeholder: 'https://...',
            className: 'md:col-span-2',
        },
        ...dayOptions.flatMap(({ key, label }) => [
            {
                name: `${key}_open`,
                label: `${label} mở cửa`,
                type: 'time',
            },
            {
                name: `${key}_close`,
                label: `${label} đóng cửa`,
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
