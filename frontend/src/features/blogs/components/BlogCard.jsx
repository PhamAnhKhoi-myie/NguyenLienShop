import { Link } from 'react-router-dom';
import { CalendarDays, Eye } from 'lucide-react';
import Badge from '../../../shared/components/Badge';
import { ROUTES } from '../../../shared/constants/routes';
import { formatBlogDate } from '../utils/blog.utils';

export default function BlogCard({ blog }) {
    const detailPath = `${ROUTES.BLOGS}/${blog.slug}`;

    return (
        <article className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
            <Link to={detailPath} className="block aspect-[16/9] bg-[var(--color-background)]">
                {blog.thumbnail?.url ? (
                    <img
                        src={blog.thumbnail.url}
                        alt={blog.thumbnail.alt || blog.title}
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[var(--color-text-muted)]">
                        {blog.title}
                    </div>
                )}
            </Link>

            <div className="space-y-3 p-4">
                <div className="flex flex-wrap items-center gap-2">
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
