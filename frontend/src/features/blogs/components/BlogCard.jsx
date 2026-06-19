import { Link } from 'react-router-dom';
import { CalendarDays, Eye, Pin } from 'lucide-react';
import { translate } from '../../../shared/i18n/index';
import Badge from '../../../shared/components/Badge';
import { ROUTES } from '../../../shared/constants/routes';
import fallbackBlogImage from '../../../assets/images/banner-san-pham.jpg';
import {
    BLOG_CONTENT_TYPE_BADGE_VARIANTS,
    getBlogContentTypeLabel,
} from '../constants/blogContentTypes';
import { formatBlogDate } from '../utils/blog.utils';

export default function BlogCard({ blog }) {
    const detailPath = `${ROUTES.BLOGS}/${blog.slug}`;
    const contentTypeLabel = getBlogContentTypeLabel(blog.content_type);
    const badgeVariant = BLOG_CONTENT_TYPE_BADGE_VARIANTS[blog.content_type] || 'primary';

    return (
        <article className="flex h-full flex-col overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm transition-shadow hover:shadow-md">
            <Link to={detailPath} className="relative block aspect-[16/9] overflow-hidden bg-[var(--color-background)]">
                <img
                    src={blog.thumbnail?.url || fallbackBlogImage}
                    alt={blog.thumbnail?.alt || blog.title}
                    className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                />
                {blog.is_pinned && (
                    <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-medium text-[var(--color-primary-hover)] shadow-sm">
                        <Pin className="h-3.5 w-3.5" />
                        {translate('text.pinned')}
                    </span>
                )}
            </Link>

            <div className="flex flex-1 flex-col space-y-3 p-4">
                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={badgeVariant}>{contentTypeLabel}</Badge>
                    {blog.category && <Badge>{blog.category}</Badge>}
                    <span className="inline-flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {formatBlogDate(blog.published_at || blog.created_at)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                        <Eye className="h-3.5 w-3.5" />
                        {blog.view_count || 0}
                    </span>
                </div>

                <Link to={detailPath}>
                    <h2 className="line-clamp-2 text-lg font-semibold text-[var(--color-text-main)] hover:text-[var(--color-primary)]">
                        {blog.title}
                    </h2>
                </Link>

                <p className="line-clamp-3 text-sm text-[var(--color-text-muted)]">
                    {blog.excerpt}
                </p>
            </div>
        </article>
    );
}
