import { translate } from '../../../shared/i18n/index';
import { z } from 'zod';
import { uploadApi } from '../../uploads/api/upload.api';

const objectIdSchema = z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, translate('text.please_select_valid_data'));

const slugSchema = z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, translate('text.slug_includes_only_lowercase_letters_numbers_and_hyphens'));

const optionalSlugSchema = z
    .string()
    .trim()
    .refine(
        (value) => value === '' || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value),
        translate('text.slug_includes_only_lowercase_letters_numbers_and_hyphens')
    );

const keywordsSchema = z.string().superRefine((value, ctx) => {
    const keywords = splitKeywords(value);

    if (keywords.length > 10) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: translate('text.maximum_10_search_keywords'),
        });
    }
});


const hideSimpleFields = ({ values }) => values?.product_type !== 'SIMPLE';

const productTypeOptions = [
    { value: 'VARIABLE', label: 'Sản phẩm có biến thể' },
    { value: 'SIMPLE', label: 'Sản phẩm đơn giản' },
];

const simpleUnitTypeOptions = [
    { value: 'UNIT', label: 'Cái / sản phẩm lẻ' },
    { value: 'PACK', label: 'Bịch / gói' },
    { value: 'BOX', label: 'Hộp' },
    { value: 'CARTON', label: 'Thùng' },
];


function cleanOptional(value) {
    const trimmed = String(value || '').trim();
    return trimmed || undefined;
}

function splitKeywords(value) {
    return String(value || '')
        .split(/[,\n]/)
        .map((keyword) => keyword.trim())
        .filter(Boolean);
}

function keywordsToText(keywords = []) {
    return Array.isArray(keywords) ? keywords.join(', ') : '';
}

function toDateTimeLocal(value) {
    if (!value) {
        return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '';
    }

    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toIsoDateOrNull(value) {
    if (!value) {
        return null;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export const categoryFormSchema = z.object({
    name: z.string().trim().min(2, translate('text.category_name_needs_to_be_at_least_2_characters')).max(100),
    slug: slugSchema,
    description: z.string().trim().max(500, translate('text.description_must_not_exceed_500_characters')),
    parent_id: z.string().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']),
    display_order: z.coerce
        .number()
        .int(translate('text.order_must_be_an_integer'))
        .min(0, translate('text.order_cannot_be_negative')),
});

export const productFormSchema = z.object({
    name: z.string().trim().min(2, translate('text.product_name_needs_to_be_at_least_2_characters')).max(200),
    slug: optionalSlugSchema,
    category_id: objectIdSchema,
    product_type: z.enum(['VARIABLE', 'SIMPLE']),
    brand: z.string().trim().max(100, translate('text.brand_must_not_exceed_100_characters')),
    short_description: z
        .string()
        .trim()
        .max(500, translate('text.short_description_not_exceeding_500_characters')),
    description: z
        .string()
        .trim()
        .max(2000, translate('text.detailed_description_must_not_exceed_2000_characters')),
    image_files: z.any().optional(),
    search_keywords_text: keywordsSchema,
    is_best_seller: z.enum(['true', 'false']),
    new_until: z.string(),
    status: z.enum(['ACTIVE', 'INACTIVE']),
    simple_unit_type: z.enum(['UNIT', 'PACK', 'BOX', 'CARTON']),
    simple_unit_display_name: z.string().trim().max(100, 'Tên đơn vị không quá 100 ký tự'),
    simple_pack_size: z.any(),
    simple_price: z.any(),
    simple_stock: z.any(),
    simple_min_order_qty: z.any(),
    simple_max_order_qty: z.any(),
    simple_qty_step: z.any(),
}).superRefine((values, ctx) => {
    if (values.product_type !== 'SIMPLE') {
        return;
    }

    if (!values.simple_unit_display_name.trim()) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['simple_unit_display_name'],
            message: 'Vui lòng nhập đơn vị hiển thị',
        });
    }

    const simplePackSize = Number(values.simple_pack_size);
    const simplePrice = Number(values.simple_price);
    const simpleStock = Number(values.simple_stock);
    const simpleMinOrderQty = Number(values.simple_min_order_qty);
    const simpleMaxOrderQty = values.simple_max_order_qty === ''
        ? null
        : Number(values.simple_max_order_qty);
    const simpleQtyStep = Number(values.simple_qty_step);

    const numberChecks = [
        { value: simplePackSize, path: 'simple_pack_size', message: 'Quy cách phải là số nguyên lớn hơn 0', min: 1 },
        { value: simplePrice, path: 'simple_price', message: 'Giá bán phải lớn hơn 0', min: 1 },
        { value: simpleStock, path: 'simple_stock', message: 'Tồn kho không được âm', min: 0 },
        { value: simpleMinOrderQty, path: 'simple_min_order_qty', message: 'Số lượng tối thiểu phải lớn hơn 0', min: 1 },
        { value: simpleQtyStep, path: 'simple_qty_step', message: 'Bước tăng phải lớn hơn 0', min: 1 },
    ];

    numberChecks.forEach((item) => {
        if (!Number.isInteger(item.value) || item.value < item.min) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: [item.path],
                message: item.message,
            });
        }
    });

    if (
        values.simple_max_order_qty !== '' &&
        (!Number.isInteger(simpleMaxOrderQty) || simpleMaxOrderQty <= 0)
    ) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['simple_max_order_qty'],
            message: 'Số lượng tối đa phải là số nguyên dương',
        });
    }

    if (simpleMaxOrderQty && simpleMaxOrderQty < simpleMinOrderQty) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['simple_max_order_qty'],
            message: 'Số lượng tối đa phải lớn hơn hoặc bằng tối thiểu',
        });
    }
});

export const categoryFormConfig = {
    title: translate('text.category_c6c555e3'),
    schema: categoryFormSchema,
    needsCategoryOptions: true,
    createEndpoint: '/categories',
    getDetailEndpoint: (row) => `/categories/${row.id || row._id}`,
    getUpdateEndpoint: (row) => `/categories/${row.id || row._id}`,
    defaultValues: {
        name: '',
        slug: '',
        description: '',
        parent_id: '',
        status: 'ACTIVE',
        display_order: 0,
    },
    toFormValues: (category = {}) => ({
        name: category.name || '',
        slug: category.slug || '',
        description: category.description || '',
        parent_id: category.parent_id || '',
        status: category.status || 'ACTIVE',
        display_order: category.display_order ?? 0,
    }),
    toPayload: (values) => ({
        name: values.name.trim(),
        slug: values.slug.trim().toLowerCase(),
        description: cleanOptional(values.description),
        parent_id: values.parent_id || null,
        status: values.status,
        display_order: Number(values.display_order || 0),
    }),
    fields: [
        { name: 'name', label: translate('text.category_name'), placeholder: translate('text.example_mango_bag') },
        { name: 'slug', label: translate('text.slug'), placeholder: translate('text.tui_bao_xoai') },
        {
            name: 'parent_id',
            label: translate('text.parent_category'),
            type: 'select',
            optionsSource: 'categories',
            emptyLabel: translate('text.no_parent_category'),
        },
        {
            name: 'status',
            label: translate('text.status'),
            type: 'select',
            options: [
                { value: 'ACTIVE', label: translate('text.active') },
                { value: 'INACTIVE', label: translate('text.inactive') },
            ],
        },
        {
            name: 'description',
            label: translate('text.description'),
            type: 'textarea',
            className: 'md:col-span-2',
        },
        { name: 'display_order', label: translate('text.order'), type: 'number' },
    ],
};

export const productFormConfig = {
    title: translate('text.product_4e46ed68'),
    schema: productFormSchema,
    needsCategoryOptions: true,
    createEndpoint: '/products',
    getDetailEndpoint: (row) => `/products/${row.id || row._id}?include_units=true`,
    getUpdateEndpoint: (row) => `/products/${row.id || row._id}`,
    defaultValues: {
        name: '',
        slug: '',
        category_id: '',
        product_type: 'VARIABLE',
        brand: '',
        short_description: '',
        description: '',
        image_files: [],
        search_keywords_text: '',
        is_best_seller: 'false',
        new_until: '',
        status: 'ACTIVE',
        simple_unit_type: 'PACK',
        simple_unit_display_name: 'Bịch',
        simple_pack_size: 1,
        simple_price: 0,
        simple_stock: 0,
        simple_min_order_qty: 1,
        simple_max_order_qty: '',
        simple_qty_step: 1,
    },
    toFormValues: (product = {}) => {
        const simpleSales = product.simple_sales || {};

        return {
            name: product.name || '',
            slug: product.slug || '',
            category_id: product.category_id || '',
            product_type: product.product_type || 'VARIABLE',
            brand: product.brand || '',
            short_description: product.short_description || '',
            description: product.description || '',
            image_files: [],
            search_keywords_text: keywordsToText(product.search_keywords),
            is_best_seller: product.is_best_seller ? 'true' : 'false',
            new_until: toDateTimeLocal(product.new_until),
            status: product.status || 'ACTIVE',
            simple_unit_type: simpleSales.unit_type || 'PACK',
            simple_unit_display_name: simpleSales.display_name || 'Bịch',
            simple_pack_size: simpleSales.pack_size || 1,
            simple_price: simpleSales.price || 0,
            simple_stock: simpleSales.stock ?? 0,
            simple_min_order_qty: simpleSales.min_order_qty || 1,
            simple_max_order_qty: simpleSales.max_order_qty || '',
            simple_qty_step: simpleSales.qty_step || 1,
        };
    },
    toPayload: async (values, { initialData } = {}) => {
        let images = Array.isArray(initialData?.images) ? initialData.images : [];
        const files = Array.isArray(values.image_files) ? values.image_files : [];

        if (files.length > 0) {
            const uploadedImages = await Promise.all(
                files.map((file) => uploadApi.uploadProductImage(file))
            );

            images = uploadedImages.map((image, index) => ({
                url: image.url,
                alt: values.name.trim(),
                is_primary: index === 0,
                sort_order: index,
            }));
        }

        const payload = {
            name: values.name.trim(),
            slug: cleanOptional(values.slug)?.toLowerCase(),
            category_id: values.category_id,
            product_type: values.product_type,
            brand: cleanOptional(values.brand),
            short_description: cleanOptional(values.short_description),
            description: cleanOptional(values.description),
            images,
            search_keywords: splitKeywords(values.search_keywords_text),
            is_best_seller: values.is_best_seller === 'true',
            new_until: toIsoDateOrNull(values.new_until),
            status: values.status,
        };

        if (values.product_type === 'SIMPLE') {
            payload.simple_unit_type = values.simple_unit_type;
            payload.simple_unit_display_name = values.simple_unit_display_name.trim();
            payload.simple_pack_size = Number(values.simple_pack_size || 1);
            payload.simple_price = Number(values.simple_price || 0);
            payload.simple_stock = Number(values.simple_stock || 0);
            payload.simple_min_order_qty = Number(values.simple_min_order_qty || 1);
            payload.simple_max_order_qty = values.simple_max_order_qty
                ? Number(values.simple_max_order_qty)
                : null;
            payload.simple_qty_step = Number(values.simple_qty_step || 1);
        }

        return payload;
    },
    fields: [
        { name: 'name', label: translate('text.product_name'), placeholder: translate('text.example_left_bag_16x16') },
        { name: 'slug', label: translate('text.slug'), placeholder: translate('text.tui_bao_trai_16x16') },
        {
            name: 'category_id',
            label: translate('text.category'),
            type: 'select',
            optionsSource: 'categories',
            emptyLabel: translate('text.select_category'),
        },
        {
            name: 'product_type',
            label: 'Loại sản phẩm',
            type: 'select',
            options: productTypeOptions,
            helperText: ({ values }) =>
                values?.product_type === 'SIMPLE'
                    ? 'Sản phẩm đơn giản: khách chỉ chọn số lượng, hệ thống tự tạo biến thể/đơn vị nội bộ.'
                    : 'Sản phẩm có biến thể: giữ cách quản lý loại vải, kích thước, đơn vị hiện tại.',
        },
        { name: 'brand', label: translate('text.brand'), placeholder: translate('text.nguyen_lien') },
        {
            name: 'status',
            label: translate('text.status'),
            type: 'select',
            options: [
                { value: 'ACTIVE', label: translate('text.active') },
                { value: 'INACTIVE', label: translate('text.inactive') },
            ],
        },
        {
            name: 'is_best_seller',
            label: translate('text.best_seller'),
            type: 'select',
            options: [
                { value: 'false', label: translate('text.no') },
                { value: 'true', label: translate('text.yes') },
            ],
        },
        {
            name: 'new_until',
            label: translate('text.new_until'),
            type: 'datetime-local',
            helperText: translate('text.new_until_helper'),
        },
        {
            name: 'simple_unit_type',
            label: 'Kiểu đơn vị',
            type: 'select',
            options: simpleUnitTypeOptions,
            hidden: hideSimpleFields,
        },
        {
            name: 'simple_unit_display_name',
            label: 'Đơn vị hiển thị',
            placeholder: 'Ví dụ: Bịch',
            hidden: hideSimpleFields,
        },
        {
            name: 'simple_pack_size',
            label: 'Quy cách / pack_size',
            type: 'number',
            helperText: 'Ví dụ: 1 bịch dây thun = 1 đơn vị bán.',
            hidden: hideSimpleFields,
        },
        {
            name: 'simple_price',
            label: 'Giá bán',
            type: 'number',
            hidden: hideSimpleFields,
        },
        {
            name: 'simple_stock',
            label: 'Tồn kho',
            type: 'number',
            helperText: 'Nhập số đơn vị đang có, ví dụ số bịch hiện có.',
            hidden: hideSimpleFields,
        },
        {
            name: 'simple_min_order_qty',
            label: 'Số lượng tối thiểu',
            type: 'number',
            hidden: hideSimpleFields,
        },
        {
            name: 'simple_max_order_qty',
            label: 'Số lượng tối đa',
            placeholder: 'Bỏ trống nếu không giới hạn',
            hidden: hideSimpleFields,
        },
        {
            name: 'simple_qty_step',
            label: 'Bước tăng số lượng',
            type: 'number',
            hidden: hideSimpleFields,
        },
        {
            name: 'short_description',
            label: translate('text.short_description'),
            type: 'textarea',
            className: 'md:col-span-2',
        },
        {
            name: 'description',
            label: translate('text.detailed_description'),
            type: 'textarea',
            className: 'md:col-span-2',
        },
        {
            name: 'image_files',
            label: translate('text.product_photo'),
            type: 'file',
            accept: 'image/*',
            multiple: true,
            previewUrls: (product) =>
                Array.isArray(product?.images)
                    ? product.images.map((image) => image.url).filter(Boolean)
                    : [],
            helperText: ({ mode }) =>
                mode === 'edit'
                    ? translate('text.the_current_image_will_be_kept_if_a_new_image_is_not_selected_multiple_p')
                    : translate('text.select_multiple_product_images_from_your_computer'),
            className: 'md:col-span-2',
        },
        {
            name: 'search_keywords_text',
            label: translate('text.search_keyword'),
            type: 'textarea',
            placeholder: translate('text.fruit_bags_mango_bags_guava_bags'),
            className: 'md:col-span-2',
        },
    ],
};
