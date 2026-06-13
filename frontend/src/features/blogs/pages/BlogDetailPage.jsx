import { translate } from '../../../shared/i18n/index';
import { ArrowLeft, CalendarDays, Eye } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import Badge from '../../../shared/components/Badge';
import Card, { CardBody } from '../../../shared/components/Card';
import EmptyState from '../../../shared/components/EmptyState';
import Loading from '../../../shared/components/Loading';
import { ROUTES } from '../../../shared/constants/routes';
import { useBlogDetail } from '../hooks/useBlogs';
import { formatBlogDate } from '../utils/blog.utils';

export default function BlogDetailPage() {
    const { slug } = useParams();
    const blogQuery = useBlogDetail(slug);
    const blog = blogQuery.data?.data;

    if (blogQuery.isLoading) {
        return <Loading label={translate('text.loading_article')} />;
    }

    if (blogQuery.isError) {
        return (
            <EmptyState
                title={translate('text.no_article_found')}
                description={blogQuery.error.message}
                actionLabel={translate('text.back_to_blog')}
                onAction={() => window.location.assign(ROUTES.BLOGS)}
            />
        );
    }

    return (
        <article className="mx-auto max-w-4xl space-y-6">
            <Link
                to={ROUTES.BLOGS}
                className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-primary-hover)] hover:text-[var(--color-primary)]"
            >
                <ArrowLeft className="h-4 w-4" /> {translate('text.back_to_blog')} </Link>

            <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                    {blog.category && <Badge>{blog.category}</Badge>}
                    <span className="inline-flex items-center gap-1 text-sm text-[var(--color-text-muted)]">
                        <CalendarDays className="h-4 w-4" />
                        {formatBlogDate(blog.published_at || blog.created_at)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-sm text-[var(--color-text-muted)]">
                        <Eye className="h-4 w-4" />
                        {blog.view_count || 0}
                    </span>
                </div>

                <h1 className="text-3xl font-semibold leading-tight text-[var(--color-text-main)] md:text-4xl">
                    {blog.title}
                </h1>

                <p className="text-base leading-7 text-[var(--color-text-muted)]">
                    {blog.excerpt}
                </p>
            </div>

            {blog.thumbnail?.url && (
                <img
                    src={blog.thumbnail.url}
                    alt={blog.thumbnail.alt || blog.title}
                    className="aspect-[16/9] w-full rounded-lg object-cover"
                />
            )}

            <Card>
                <CardBody>
                    <div
                        className="blog-content space-y-4 text-[var(--color-text-main)] [&_a]:text-[var(--color-primary-hover)] [&_blockquote]:border-l-4 [&_blockquote]:border-[var(--color-primary)] [&_blockquote]:pl-4 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:text-xl [&_h3]:font-semibold [&_img]:rounded-lg [&_li]:ml-5 [&_ol]:list-decimal [&_p]:leading-7 [&_ul]:list-disc"
                        dangerouslySetInnerHTML={{ __html: blog.content }}
                    />
                </CardBody>
            </Card>
        </article>
    );
}
