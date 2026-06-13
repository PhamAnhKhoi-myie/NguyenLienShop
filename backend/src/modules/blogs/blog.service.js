const sanitizeHtml = require('sanitize-html');
const slugify = require('slugify');
const Blog = require('./blog.model');
const BlogMapper = require('./blog.mapper');
const AppError = require('../../utils/appError.util');

class BlogService {
    static sanitizeContent(content) {
        return sanitizeHtml(content, {
            allowedTags: [
                'h1',
                'h2',
                'h3',
                'h4',
                'p',
                'br',
                'strong',
                'em',
                'u',
                's',
                'blockquote',
                'ul',
                'ol',
                'li',
                'a',
                'img',
                'figure',
                'figcaption',
                'table',
                'thead',
                'tbody',
                'tr',
                'th',
                'td',
                'code',
                'pre',
            ],
            allowedAttributes: {
                a: ['href', 'target', 'rel'],
                img: ['src', 'alt', 'title'],
            },
            allowedSchemes: ['http', 'https', 'mailto'],
            allowedSchemesByTag: {
                img: ['http', 'https'],
            },
            transformTags: {
                a: sanitizeHtml.simpleTransform('a', {
                    rel: 'noopener noreferrer',
                }),
            },
        });
    }

    static normalizeSlug(slug, title) {
        return (slug || slugify(title, { lower: true, strict: true, locale: 'en' }))
            .trim()
            .toLowerCase();
    }

    static normalizeTags(tags = []) {
        return [
            ...new Set(
                tags
                    .map((tag) => tag.trim())
                    .filter(Boolean)
                    .map((tag) => tag.slice(0, 40))
            ),
        ].slice(0, 12);
    }

    static normalizeNullable(value) {
        return typeof value === 'string' && value.trim() ? value.trim() : null;
    }

    static escapeRegex(value) {
        return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    static normalizeThumbnail(thumbnail = {}, fallbackTitle = '') {
        return {
            url: this.normalizeNullable(thumbnail.url),
            public_id: this.normalizeNullable(thumbnail.public_id),
            alt: this.normalizeNullable(thumbnail.alt) || fallbackTitle,
        };
    }

    static normalizeSeo(seo = {}) {
        return {
            meta_title: this.normalizeNullable(seo.meta_title),
            meta_description: this.normalizeNullable(seo.meta_description),
            keywords: this.normalizeTags(seo.keywords || []),
        };
    }

    static buildSearchFilter(search) {
        if (!search) {
            return null;
        }

        const escapedSearch = this.escapeRegex(search);

        return {
            $or: [
                { title: { $regex: escapedSearch, $options: 'i' } },
                { excerpt: { $regex: escapedSearch, $options: 'i' } },
                { tags: { $regex: escapedSearch, $options: 'i' } },
            ],
        };
    }

    static buildPagination(page, limit, total) {
        return {
            current_page: page,
            total_pages: Math.max(Math.ceil(total / limit), 1),
            total_items: total,
            per_page: limit,
        };
    }

    static getBlogPayload(data, existing = null) {
        const title = data.title ?? existing?.title;
        const status = data.status ?? existing?.status ?? 'DRAFT';
        const payload = {};

        if (data.title !== undefined) {
            payload.title = data.title;
        }

        if (data.slug !== undefined || data.title !== undefined) {
            payload.slug = this.normalizeSlug(data.slug, title);
        }

        if (data.excerpt !== undefined) {
            payload.excerpt = data.excerpt;
        }

        if (data.content !== undefined) {
            payload.content = this.sanitizeContent(data.content);
        }

        if (data.thumbnail !== undefined || data.title !== undefined) {
            payload.thumbnail = this.normalizeThumbnail(
                data.thumbnail ?? existing?.thumbnail ?? {},
                title
            );
        }

        if (data.category !== undefined) {
            payload.category = this.normalizeNullable(data.category);
        }

        if (data.tags !== undefined) {
            payload.tags = this.normalizeTags(data.tags);
        }

        if (data.seo !== undefined) {
            payload.seo = this.normalizeSeo(data.seo);
        }

        if (data.status !== undefined) {
            payload.status = data.status;
        }

        if (status === 'PUBLISHED' && !existing?.published_at) {
            payload.published_at = new Date();
        }

        return payload;
    }

    static async getPublishedBlogs(page = 1, limit = 12, filters = {}) {
        const query = {
            status: 'PUBLISHED',
        };

        if (filters.category) {
            query.category = filters.category;
        }

        if (filters.tag) {
            query.tags = filters.tag;
        }

        const searchFilter = this.buildSearchFilter(filters.search);
        if (searchFilter) {
            Object.assign(query, searchFilter);
        }

        const skip = (page - 1) * limit;
        const total = await Blog.countDocuments(query);
        const blogs = await Blog.find(query)
            .populate('author_id', 'email profile.full_name')
            .sort({ published_at: -1, created_at: -1 })
            .skip(skip)
            .limit(limit);

        return {
            data: BlogMapper.toResponseDTOList(blogs),
            pagination: this.buildPagination(page, limit, total),
        };
    }

    static async getPublishedBlogsByCategory(category, page = 1, limit = 12) {
        return this.getPublishedBlogs(page, limit, { category });
    }

    static async getPublishedBlogBySlug(slug) {
        const blog = await Blog.findOneAndUpdate(
            {
                slug,
                status: 'PUBLISHED',
            },
            { $inc: { view_count: 1 } },
            { new: true }
        ).populate('author_id', 'email profile.full_name');

        if (!blog) {
            throw new AppError('Blog not found', 404, 'BLOG_NOT_FOUND');
        }

        return BlogMapper.toResponseDTO(blog);
    }

    static async getAdminBlogs(page = 1, limit = 20, filters = {}) {
        const query = {};

        if (filters.status) {
            query.status = filters.status;
        }

        if (filters.category) {
            query.category = filters.category;
        }

        if (filters.tag) {
            query.tags = filters.tag;
        }

        const searchFilter = this.buildSearchFilter(filters.search);
        if (searchFilter) {
            Object.assign(query, searchFilter);
        }

        const skip = (page - 1) * limit;
        const total = await Blog.countDocuments(query);
        const blogs = await Blog.find(query)
            .populate('author_id', 'email profile.full_name')
            .sort({ updated_at: -1, created_at: -1 })
            .skip(skip)
            .limit(limit);

        return {
            data: BlogMapper.toResponseDTOList(blogs),
            pagination: this.buildPagination(page, limit, total),
        };
    }

    static async getAdminBlogById(blogId) {
        const blog = await Blog.findById(blogId)
            .populate('author_id', 'email profile.full_name');

        if (!blog) {
            throw new AppError('Blog not found', 404, 'BLOG_NOT_FOUND');
        }

        return BlogMapper.toResponseDTO(blog);
    }

    static async createBlog(authorId, data) {
        try {
            const payload = this.getBlogPayload(data);
            const blog = await Blog.create({
                ...payload,
                author_id: authorId,
            });

            const created = await Blog.findById(blog._id)
                .populate('author_id', 'email profile.full_name');

            return BlogMapper.toResponseDTO(created);
        } catch (error) {
            if (error.code === 11000) {
                throw new AppError('Blog slug already exists', 409, 'BLOG_SLUG_CONFLICT');
            }

            throw error;
        }
    }

    static async updateBlog(blogId, data) {
        const existing = await Blog.findById(blogId);

        if (!existing) {
            throw new AppError('Blog not found', 404, 'BLOG_NOT_FOUND');
        }

        try {
            const updateData = this.getBlogPayload(data, existing);
            const blog = await Blog.findByIdAndUpdate(
                blogId,
                { $set: updateData },
                { new: true, runValidators: true }
            ).populate('author_id', 'email profile.full_name');

            return BlogMapper.toResponseDTO(blog);
        } catch (error) {
            if (error.code === 11000) {
                throw new AppError('Blog slug already exists', 409, 'BLOG_SLUG_CONFLICT');
            }

            throw error;
        }
    }

    static async publishBlog(blogId) {
        const blog = await Blog.findByIdAndUpdate(
            blogId,
            {
                $set: {
                    status: 'PUBLISHED',
                    published_at: new Date(),
                },
            },
            { new: true, runValidators: true }
        ).populate('author_id', 'email profile.full_name');

        if (!blog) {
            throw new AppError('Blog not found', 404, 'BLOG_NOT_FOUND');
        }

        return BlogMapper.toResponseDTO(blog);
    }

    static async archiveBlog(blogId) {
        const blog = await Blog.findByIdAndUpdate(
            blogId,
            { $set: { status: 'ARCHIVED' } },
            { new: true, runValidators: true }
        ).populate('author_id', 'email profile.full_name');

        if (!blog) {
            throw new AppError('Blog not found', 404, 'BLOG_NOT_FOUND');
        }

        return BlogMapper.toResponseDTO(blog);
    }
}

module.exports = BlogService;
