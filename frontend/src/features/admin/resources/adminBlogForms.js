import { z } from 'zod';
import { uploadApi } from '../../uploads/api/upload.api';

export const blogStatusOptions = [
    { value: '', label: 'Tất cả trạng thái' },
    { value: 'DRAFT', label: 'DRAFT' },
    { value: 'PUBLISHED', label: 'PUBLISHED' },
    { value: 'ARCHIVED', label: 'ARCHIVED' },
];

const optionalUrlSchema = z
    .string()
    .trim()
    .refine((value) => value === '' || isHttpUrl(value), 'URL không hợp lệ');

const slugSchema = z
    .string()
    .trim()
    .refine(
        (value) => value === '' || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value),
        'Slug chỉ gồm chữ thường, số và dấu gạch ngang'
    );

const parseTags = (value) =>
    value
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 12);

export const blogFormConfig = {
    title: 'bài viết',
    schema: z.object({
        title: z.string().trim().min(3, 'Tiêu đề cần ít nhất 3 ký tự'),
        slug: slugSchema,
        excerpt: z.string().trim().min(10, 'Mô tả ngắn cần ít nhất 10 ký tự'),
        content: z.string().trim().min(20, 'Nội dung cần ít nhất 20 ký tự'),
        thumbnail_file: z.any().optional(),
        thumbnail_url: optionalUrlSchema,
        thumbnail_public_id: z.string().trim().max(160).optional(),
        thumbnail_alt: z.string().trim().max(200).optional(),
        category: z.string().trim().max(100).optional(),
        tags: z.string().trim().optional(),
        status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
        meta_title: z.string().trim().max(160).optional(),
        meta_description: z.string().trim().max(300).optional(),
        seo_keywords: z.string().trim().optional(),
    }),
    createEndpoint: '/blogs',
    getDetailEndpoint: (row) => `/blogs/admin/${row.id || row._id}`,
    getUpdateEndpoint: (row) => `/blogs/${row.id || row._id}`,
    defaultValues: {
        title: '',
        slug: '',
        excerpt: '',
        content: '',
        thumbnail_file: null,
        thumbnail_url: '',
        thumbnail_public_id: '',
        thumbnail_alt: '',
        category: '',
        tags: '',
        status: 'DRAFT',
        meta_title: '',
        meta_description: '',
        seo_keywords: '',
    },
    toFormValues: (blog = {}) => ({
        title: blog.title || '',
        slug: blog.slug || '',
        excerpt: blog.excerpt || '',
        content: blog.content || '',
        thumbnail_file: null,
        thumbnail_url: blog.thumbnail?.url || '',
        thumbnail_public_id: blog.thumbnail?.public_id || '',
        thumbnail_alt: blog.thumbnail?.alt || '',
        category: blog.category || '',
        tags: (blog.tags || []).join(', '),
        status: blog.status || 'DRAFT',
        meta_title: blog.seo?.meta_title || '',
        meta_description: blog.seo?.meta_description || '',
        seo_keywords: (blog.seo?.keywords || []).join(', '),
    }),
    toPayload: async (values) => {
        let thumbnailUrl = values.thumbnail_url;
        let thumbnailPublicId = values.thumbnail_public_id;
        const file = values.thumbnail_file?.[0];

        if (file) {
            const uploadedImage = await uploadApi.uploadBlogThumbnail(file);
            thumbnailUrl = uploadedImage.url;
            thumbnailPublicId = uploadedImage.public_id;
        }

        const payload = {
            title: values.title.trim(),
            excerpt: values.excerpt.trim(),
            content: values.content.trim(),
            thumbnail: {
                url: thumbnailUrl?.trim() || '',
                public_id: thumbnailPublicId?.trim() || '',
                alt: values.thumbnail_alt?.trim() || values.title.trim(),
            },
            category: values.category?.trim() || '',
            tags: parseTags(values.tags || ''),
            status: values.status,
            seo: {
                meta_title: values.meta_title?.trim() || '',
                meta_description: values.meta_description?.trim() || '',
                keywords: parseTags(values.seo_keywords || ''),
            },
        };

        if (values.slug.trim()) {
            payload.slug = values.slug.trim();
        }

        return payload;
    },
    fields: [
        { name: 'title', label: 'Tiêu đề', placeholder: 'Cách sử dụng túi bao trái cây', className: 'md:col-span-2' },
        { name: 'slug', label: 'Slug', placeholder: 'cach-su-dung-tui-bao-trai-cay' },
        {
            name: 'status',
            label: 'Trạng thái',
            type: 'select',
            options: blogStatusOptions.filter((option) => option.value),
        },
        {
            name: 'excerpt',
            label: 'Mô tả ngắn',
            type: 'textarea',
            rows: 3,
            className: 'md:col-span-2',
        },
        {
            name: 'content',
            label: 'Nội dung HTML',
            type: 'textarea',
            rows: 12,
            className: 'md:col-span-2',
        },
        {
            name: 'thumbnail_file',
            label: 'Ảnh thumbnail',
            type: 'file',
            accept: 'image/*',
            previewUrl: (blog) => blog.thumbnail?.url,
            className: 'md:col-span-2',
        },
        { name: 'thumbnail_url', label: 'Thumbnail URL', placeholder: 'https://...' },
        { name: 'thumbnail_alt', label: 'Alt text' },
        { name: 'thumbnail_public_id', label: 'Cloudinary public ID' },
        { name: 'category', label: 'Danh mục', placeholder: 'Hướng dẫn sử dụng' },
        { name: 'tags', label: 'Tags', placeholder: 'túi bao, bưởi, hướng dẫn', className: 'md:col-span-2' },
        { name: 'meta_title', label: 'Meta title' },
        { name: 'meta_description', label: 'Meta description' },
        { name: 'seo_keywords', label: 'SEO keywords', placeholder: 'túi bao trái cây, bao bưởi', className: 'md:col-span-2' },
    ],
};

function isHttpUrl(value) {
    try {
        const url = new URL(value);
        return ['http:', 'https:'].includes(url.protocol);
    } catch {
        return false;
    }
}
