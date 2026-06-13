import { translate } from '../../../shared/i18n/index';
import { z } from 'zod';
import { uploadApi } from '../../uploads/api/upload.api';

export const blogStatusOptions = [
    { value: '', label: translate('text.all_statuses') },
    { value: 'DRAFT', label: translate('text.draft') },
    { value: 'PUBLISHED', label: translate('text.published') },
    { value: 'ARCHIVED', label: translate('text.archived') },
];

const optionalUrlSchema = z
    .string()
    .trim()
    .refine((value) => value === '' || isHttpUrl(value), translate('text.invalid_url'));

const slugSchema = z
    .string()
    .trim()
    .refine(
        (value) => value === '' || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value),
        translate('text.slug_includes_only_lowercase_letters_numbers_and_hyphens')
    );

const parseTags = (value) =>
    value
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 12);

export const blogFormConfig = {
    title: translate('text.article_eda8942f'),
    schema: z.object({
        title: z.string().trim().min(3, translate('text.title_needs_at_least_3_characters')),
        slug: slugSchema,
        excerpt: z.string().trim().min(10, translate('text.short_description_needs_at_least_10_characters')),
        content: z.string().trim().min(20, translate('text.content_must_be_at_least_20_characters')),
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
        { name: 'title', label: translate('text.title'), placeholder: translate('text.how_to_use_fruit_bags'), className: 'md:col-span-2' },
        { name: 'slug', label: translate('text.slug'), placeholder: translate('text.cach_su_dung_tui_bao_trai_cay') },
        {
            name: 'status',
            label: translate('text.status'),
            type: 'select',
            options: blogStatusOptions.filter((option) => option.value),
        },
        {
            name: 'excerpt',
            label: translate('text.short_description'),
            type: 'textarea',
            rows: 3,
            className: 'md:col-span-2',
        },
        {
            name: 'content',
            label: translate('text.html_content'),
            type: 'textarea',
            rows: 12,
            className: 'md:col-span-2',
        },
        {
            name: 'thumbnail_file',
            label: translate('text.thumbnail'),
            type: 'file',
            accept: 'image/*',
            previewUrl: (blog) => blog.thumbnail?.url,
            className: 'md:col-span-2',
        },
        { name: 'thumbnail_url', label: translate('text.thumbnail_url'), placeholder: 'https://...' },
        { name: 'thumbnail_alt', label: translate('text.alt_text') },
        { name: 'thumbnail_public_id', label: translate('text.cloudinary_public_id') },
        { name: 'category', label: translate('text.category'), placeholder: translate('text.instructions_for_use') },
        { name: 'tags', label: translate('text.tags'), placeholder: translate('text.bag_grapefruit_instructions'), className: 'md:col-span-2' },
        { name: 'meta_title', label: translate('text.meta_title') },
        { name: 'meta_description', label: translate('text.meta_description') },
        { name: 'seo_keywords', label: translate('text.seo_keywords'), placeholder: translate('text.fruit_bags_grapefruit_bags'), className: 'md:col-span-2' },
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
