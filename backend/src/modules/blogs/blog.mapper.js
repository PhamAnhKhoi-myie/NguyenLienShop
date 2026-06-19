class BlogMapper {
    static toResponseDTO(blog) {
        if (!blog) {
            return null;
        }

        const doc = blog.toObject ? blog.toObject() : blog;

        return {
            id: doc._id?.toString() || doc.id,
            title: doc.title,
            slug: doc.slug,
            excerpt: doc.excerpt,
            content: doc.content,
            thumbnail: {
                url: doc.thumbnail?.url || null,
                public_id: doc.thumbnail?.public_id || null,
                alt: doc.thumbnail?.alt || doc.title,
            },
            category: doc.category || null,
            tags: doc.tags || [],
            content_type: doc.content_type || 'ARTICLE',
            is_pinned: Boolean(doc.is_pinned),
            sort_order: doc.sort_order || 0,
            related_product_ids: (doc.related_product_ids || []).map((id) => id.toString()),
            related_category_ids: (doc.related_category_ids || []).map((id) => id.toString()),
            faq_items: (doc.faq_items || []).map((item) => ({
                question: item.question,
                answer: item.answer,
                sort_order: item.sort_order || 0,
            })),
            status: doc.status,
            author: this.toAuthorDTO(doc.author_id),
            published_at: doc.published_at || null,
            view_count: doc.view_count || 0,
            seo: {
                meta_title: doc.seo?.meta_title || null,
                meta_description: doc.seo?.meta_description || null,
                keywords: doc.seo?.keywords || [],
            },
            created_at: doc.created_at,
            updated_at: doc.updated_at,
        };
    }

    static toListDTO(blog) {
        const dto = this.toResponseDTO(blog);

        if (!dto) {
            return null;
        }

        delete dto.content;
        return dto;
    }

    static toResponseDTOList(blogs) {
        return Array.isArray(blogs) ? blogs.map((blog) => this.toListDTO(blog)) : [];
    }

    static toAuthorDTO(author) {
        if (!author) {
            return null;
        }

        if (author._id) {
            return {
                id: author._id.toString(),
                email: author.email || null,
                full_name: author.profile?.full_name || null,
            };
        }

        return {
            id: author.toString(),
            email: null,
            full_name: null,
        };
    }
}

module.exports = BlogMapper;
