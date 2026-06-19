import { translate } from '../../../shared/i18n/index';
import { z } from 'zod';
import { uploadApi } from '../../uploads/api/upload.api';
import { blogContentTypeOptions } from '../../blogs/constants/blogContentTypes';

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

const parseIds = (value) =>
    value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 50);

const parseFaqItems = (value) =>
    value
        .split('\n')
        .map((line, index) => {
            const [question, ...answerParts] = line.split('|');
            const answer = answerParts.join('|').trim();

            return {
                question: question?.trim() || '',
                answer,
                sort_order: index,
            };
        })
        .filter((item) => item.question && item.answer)
        .slice(0, 50);

const formatFaqItems = (items = []) =>
    items
        .map((item) => `${item.question || ''} | ${item.answer || ''}`)
        .filter((line) => line.trim() !== '|')
        .join('\n');

const hasHtmlTags = (value) => /<\/?[a-z][\s\S]*>/i.test(value);

const escapeHtml = (value) =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const formatBlogContent = (value) => {
    const content = value.trim();

    if (hasHtmlTags(content)) {
        return content;
    }

    return content
        .split(/\n{2,}/)
        .map((paragraph) =>
            paragraph
                .trim()
                .split('\n')
                .map((line) => escapeHtml(line.trim()))
                .filter(Boolean)
                .join('<br>')
        )
        .filter(Boolean)
        .map((paragraph) => `<p>${paragraph}</p>`)
        .join('\n');
};

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
        content_type: z.enum(['POLICY', 'GUIDE', 'FAQ', 'ARTICLE', 'SUPPORT_PAGE']),
        is_pinned: z.enum(['true', 'false']),
        sort_order: z.coerce.number().int().min(0).max(9999),
        related_product_ids: z.string().trim().optional(),
        related_category_ids: z.string().trim().optional(),
        faq_items_text: z.string().trim().max(20000).optional(),
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
        content_type: 'ARTICLE',
        is_pinned: 'false',
        sort_order: 0,
        related_product_ids: '',
        related_category_ids: '',
        faq_items_text: '',
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
        content_type: blog.content_type || 'ARTICLE',
        is_pinned: blog.is_pinned ? 'true' : 'false',
        sort_order: blog.sort_order || 0,
        related_product_ids: (blog.related_product_ids || []).join(', '),
        related_category_ids: (blog.related_category_ids || []).join(', '),
        faq_items_text: formatFaqItems(blog.faq_items || []),
        status: blog.status || 'DRAFT',
        meta_title: blog.seo?.meta_title || '',
        meta_description: blog.seo?.meta_description || '',
        seo_keywords: (blog.seo?.keywords || []).join(', '),
    }),
    sections: [
        {
            key: 'content',
            label: translate('text.blog_section_content'),
            description: translate('text.blog_section_content_description'),
            fields: [
                'title',
                'slug',
                'excerpt',
                'content',
                'thumbnail_file',
                'thumbnail_url',
                'thumbnail_alt',
            ],
        },
        {
            key: 'display',
            label: translate('text.blog_section_display'),
            description: translate('text.blog_section_display_description'),
            fields: [
                'status',
                'content_type',
                'is_pinned',
                'sort_order',
                'category',
                'tags',
            ],
        },
        {
            key: 'links',
            label: translate('text.blog_section_links_faq'),
            description: translate('text.blog_section_links_faq_description'),
            fields: [
                'related_product_ids',
                'related_category_ids',
                'faq_items_text',
            ],
        },
        {
            key: 'seo',
            label: translate('text.blog_section_seo'),
            description: translate('text.blog_section_seo_description'),
            fields: ['meta_title', 'meta_description', 'seo_keywords'],
        },
    ],
    toPayload: async (values, context = {}) => {
        let thumbnailUrl = values.thumbnail_url;
        const initialThumbnailUrl = context.initialData?.thumbnail?.url || '';
        let thumbnailPublicId =
            values.thumbnail_public_id ||
            context.initialData?.thumbnail?.public_id ||
            '';
        const file = values.thumbnail_file?.[0];

        if (file) {
            const uploadedImage = await uploadApi.uploadBlogThumbnail(file);
            thumbnailUrl = uploadedImage.url;
            thumbnailPublicId = uploadedImage.public_id;
        } else if ((thumbnailUrl || '').trim() !== initialThumbnailUrl) {
            thumbnailPublicId = '';
        }

        const payload = {
            title: values.title.trim(),
            excerpt: values.excerpt.trim(),
            content: formatBlogContent(values.content),
            thumbnail: {
                url: thumbnailUrl?.trim() || '',
                public_id: thumbnailPublicId?.trim() || '',
                alt: values.thumbnail_alt?.trim() || values.title.trim(),
            },
            category: values.category?.trim() || '',
            tags: parseTags(values.tags || ''),
            content_type: values.content_type,
            is_pinned: values.is_pinned === 'true',
            sort_order: Number(values.sort_order) || 0,
            related_product_ids: parseIds(values.related_product_ids || ''),
            related_category_ids: parseIds(values.related_category_ids || ''),
            faq_items: parseFaqItems(values.faq_items_text || ''),
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
        {
            name: 'slug',
            label: translate('text.slug'),
            placeholder: translate('text.cach_su_dung_tui_bao_trai_cay'),
            helperText: translate('text.blog_slug_helper'),
        },
        {
            name: 'status',
            label: translate('text.status'),
            type: 'select',
            options: blogStatusOptions.filter((option) => option.value),
        },
        {
            name: 'content_type',
            label: translate('text.content_type'),
            type: 'select',
            options: blogContentTypeOptions,
        },
        {
            name: 'is_pinned',
            label: translate('text.pinned_content'),
            type: 'select',
            options: [
                { value: 'false', label: translate('text.not_pinned') },
                { value: 'true', label: translate('text.pinned') },
            ],
        },
        {
            name: 'sort_order',
            label: translate('text.sort_order'),
            type: 'number',
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
            label: translate('text.article_content'),
            type: 'textarea',
            rows: 12,
            helperText: translate('text.blog_content_helper'),
            className: 'md:col-span-2',
        },
        {
            name: 'thumbnail_file',
            label: translate('text.thumbnail'),
            type: 'file',
            accept: 'image/*',
            helperText: translate('text.blog_thumbnail_file_helper'),
            previewUrl: (blog) => blog?.thumbnail?.url,
            className: 'md:col-span-2',
        },
        {
            name: 'thumbnail_url',
            label: translate('text.thumbnail_url'),
            placeholder: 'https://...',
            helperText: translate('text.blog_thumbnail_url_helper'),
        },
        { name: 'thumbnail_alt', label: translate('text.alt_text') },
        { name: 'thumbnail_public_id', label: translate('text.cloudinary_public_id'), hidden: true },
        {
            name: 'category',
            label: translate('text.category'),
            placeholder: translate('text.instructions_for_use'),
            helperText: translate('text.blog_category_helper'),
        },
        {
            name: 'tags',
            label: translate('text.tags'),
            placeholder: translate('text.bag_grapefruit_instructions'),
            helperText: translate('text.blog_tags_helper'),
            className: 'md:col-span-2',
        },
        {
            name: 'related_product_ids',
            label: translate('text.related_product_ids'),
            placeholder: translate('text.related_ids_placeholder'),
            helperText: translate('text.blog_related_product_ids_helper'),
            className: 'md:col-span-2',
        },
        {
            name: 'related_category_ids',
            label: translate('text.related_category_ids'),
            placeholder: translate('text.related_ids_placeholder'),
            helperText: translate('text.blog_related_category_ids_helper'),
            className: 'md:col-span-2',
        },
        {
            name: 'faq_items_text',
            label: translate('text.faq_items'),
            type: 'textarea',
            rows: 5,
            placeholder: translate('text.question_answer_placeholder'),
            helperText: translate('text.faq_items_helper'),
            className: 'md:col-span-2',
        },
        {
            name: 'meta_title',
            label: translate('text.meta_title'),
            helperText: translate('text.blog_meta_title_helper'),
        },
        {
            name: 'meta_description',
            label: translate('text.meta_description'),
            helperText: translate('text.blog_meta_description_helper'),
        },
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
