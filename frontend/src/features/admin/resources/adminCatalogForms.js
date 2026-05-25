import { z } from 'zod';
import { uploadApi } from '../../uploads/api/upload.api';

const objectIdSchema = z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Vui lòng chọn dữ liệu hợp lệ');

const slugSchema = z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug chỉ gồm chữ thường, số và dấu gạch ngang');

const optionalSlugSchema = z
    .string()
    .trim()
    .refine(
        (value) => value === '' || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value),
        'Slug chỉ gồm chữ thường, số và dấu gạch ngang'
    );

const keywordsSchema = z.string().superRefine((value, ctx) => {
    const keywords = splitKeywords(value);

    if (keywords.length > 10) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Tối đa 10 từ khóa tìm kiếm',
        });
    }
});

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

export const categoryFormSchema = z.object({
    name: z.string().trim().min(2, 'Tên danh mục cần ít nhất 2 ký tự').max(100),
    slug: slugSchema,
    description: z.string().trim().max(500, 'Mô tả không vượt quá 500 ký tự'),
    parent_id: z.string().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']),
    display_order: z.coerce
        .number()
        .int('Thứ tự phải là số nguyên')
        .min(0, 'Thứ tự không được âm'),
});

export const productFormSchema = z.object({
    name: z.string().trim().min(2, 'Tên sản phẩm cần ít nhất 2 ký tự').max(200),
    slug: optionalSlugSchema,
    category_id: objectIdSchema,
    brand: z.string().trim().max(100, 'Thương hiệu không vượt quá 100 ký tự'),
    short_description: z
        .string()
        .trim()
        .max(500, 'Mô tả ngắn không vượt quá 500 ký tự'),
    description: z
        .string()
        .trim()
        .max(2000, 'Mô tả chi tiết không vượt quá 2000 ký tự'),
    image_files: z.any().optional(),
    search_keywords_text: keywordsSchema,
    status: z.enum(['ACTIVE', 'INACTIVE']),
});

export const categoryFormConfig = {
    title: 'danh mục',
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
        { name: 'name', label: 'Tên danh mục', placeholder: 'Ví dụ: Túi bao xoài' },
        { name: 'slug', label: 'Slug', placeholder: 'tui-bao-xoai' },
        {
            name: 'parent_id',
            label: 'Danh mục cha',
            type: 'select',
            optionsSource: 'categories',
            emptyLabel: 'Không có danh mục cha',
        },
        {
            name: 'status',
            label: 'Trạng thái',
            type: 'select',
            options: [
                { value: 'ACTIVE', label: 'ACTIVE' },
                { value: 'INACTIVE', label: 'INACTIVE' },
            ],
        },
        {
            name: 'description',
            label: 'Mô tả',
            type: 'textarea',
            className: 'md:col-span-2',
        },
        { name: 'display_order', label: 'Thứ tự', type: 'number' },
    ],
};

export const productFormConfig = {
    title: 'sản phẩm',
    schema: productFormSchema,
    needsCategoryOptions: true,
    createEndpoint: '/products',
    getDetailEndpoint: (row) => `/products/${row.id || row._id}`,
    getUpdateEndpoint: (row) => `/products/${row.id || row._id}`,
    defaultValues: {
        name: '',
        slug: '',
        category_id: '',
        brand: '',
        short_description: '',
        description: '',
        image_files: [],
        search_keywords_text: '',
        status: 'ACTIVE',
    },
    toFormValues: (product = {}) => ({
        name: product.name || '',
        slug: product.slug || '',
        category_id: product.category_id || '',
        brand: product.brand || '',
        short_description: product.short_description || '',
        description: product.description || '',
        image_files: [],
        search_keywords_text: keywordsToText(product.search_keywords),
        status: product.status || 'ACTIVE',
    }),
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

        return {
            name: values.name.trim(),
            slug: cleanOptional(values.slug)?.toLowerCase(),
            category_id: values.category_id,
            brand: cleanOptional(values.brand),
            short_description: cleanOptional(values.short_description),
            description: cleanOptional(values.description),
            images,
            search_keywords: splitKeywords(values.search_keywords_text),
            status: values.status,
        };
    },
    fields: [
        { name: 'name', label: 'Tên sản phẩm', placeholder: 'Ví dụ: Túi bao trái 16x16' },
        { name: 'slug', label: 'Slug', placeholder: 'tui-bao-trai-16x16' },
        {
            name: 'category_id',
            label: 'Danh mục',
            type: 'select',
            optionsSource: 'categories',
            emptyLabel: 'Chọn danh mục',
        },
        { name: 'brand', label: 'Thương hiệu', placeholder: 'Nguyễn Liên' },
        {
            name: 'status',
            label: 'Trạng thái',
            type: 'select',
            options: [
                { value: 'ACTIVE', label: 'ACTIVE' },
                { value: 'INACTIVE', label: 'INACTIVE' },
            ],
        },
        {
            name: 'short_description',
            label: 'Mô tả ngắn',
            type: 'textarea',
            className: 'md:col-span-2',
        },
        {
            name: 'description',
            label: 'Mô tả chi tiết',
            type: 'textarea',
            className: 'md:col-span-2',
        },
        {
            name: 'image_files',
            label: 'Ảnh sản phẩm',
            type: 'file',
            accept: 'image/*',
            multiple: true,
            previewUrls: (product) =>
                Array.isArray(product?.images)
                    ? product.images.map((image) => image.url).filter(Boolean)
                    : [],
            helperText: ({ mode }) =>
                mode === 'edit'
                    ? 'Ảnh hiện tại sẽ được giữ nếu không chọn ảnh mới. Có thể chọn nhiều ảnh.'
                    : 'Chọn nhiều ảnh sản phẩm từ máy tính.',
            className: 'md:col-span-2',
        },
        {
            name: 'search_keywords_text',
            label: 'Từ khóa tìm kiếm',
            type: 'textarea',
            placeholder: 'túi bao trái, bao xoài, bao ổi',
            className: 'md:col-span-2',
        },
    ],
};
