import { translate } from '../../../shared/i18n/index';
import { useMemo } from 'react';
import { Search } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import Button from '../../../shared/components/Button';
import Card, { CardBody } from '../../../shared/components/Card';
import EmptyState from '../../../shared/components/EmptyState';
import Input from '../../../shared/components/Input';
import Loading from '../../../shared/components/Loading';
import Pagination from '../../../shared/components/Pagination';
import BlogCard from '../components/BlogCard';
import { blogContentTypeFilterOptions } from '../constants/blogContentTypes';
import { useBlogs } from '../hooks/useBlogs';

const DEFAULT_LIMIT = 9;

const normalizePage = (value) => {
    const page = Number(value || 1);
    return Number.isInteger(page) && page > 0 ? page : 1;
};

const cleanParams = (params) =>
    Object.fromEntries(
        Object.entries(params).filter(([, value]) => (
            value !== undefined &&
            value !== null &&
            value !== ''
        ))
    );

export default function BlogListPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const filters = useMemo(
        () => ({
            page: normalizePage(searchParams.get('page')),
            limit: DEFAULT_LIMIT,
            search: searchParams.get('search') || '',
            category: searchParams.get('category') || '',
            tag: searchParams.get('tag') || '',
            content_type: searchParams.get('content_type') || '',
        }),
        [searchParams]
    );
    const blogsQuery = useBlogs(cleanParams(filters));
    const blogs = blogsQuery.data?.data || [];
    const pagination = blogsQuery.data?.pagination || {
        current_page: filters.page,
        total_pages: 1,
        total_items: 0,
        per_page: DEFAULT_LIMIT,
    };
    const totalPages = Math.max(Number(pagination.total_pages) || 1, 1);

    const updateFilters = (updates) => {
        setSearchParams(
            (current) => {
                const next = new URLSearchParams(current);

                Object.entries(updates).forEach(([key, value]) => {
                    if (value === null || value === undefined || value === '') {
                        next.delete(key);
                    } else {
                        next.set(key, String(value));
                    }
                });

                return next;
            },
            { replace: true }
        );
    };

    const resetFilters = () => {
        setSearchParams({}, { replace: true });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-sm font-medium text-[var(--color-primary-hover)]"> {translate('text.blog')} </p>
                    <h1 className="mt-1 text-3xl font-semibold text-[var(--color-text-main)]"> {translate('text.news_and_guides')} </h1>
                    <p className="mt-2 max-w-2xl text-sm text-[var(--color-text-muted)]"> {translate('text.articles_about_fruit_bags_garden_care_tips_and_information_from_the_shop')} </p>
                </div>

                <div className="flex w-full gap-2 lg:max-w-xl">
                    <Input
                        placeholder={translate('text.find_posts')}
                        value={filters.search}
                        onChange={(event) =>
                            updateFilters({
                                search: event.target.value,
                                page: 1,
                            })
                        }
                    />
                    <Button type="button" variant="outline" onClick={resetFilters}> {translate('text.clear_filter')} </Button>
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                {blogContentTypeFilterOptions.map((tab) => {
                    const active = filters.content_type === tab.value;

                    return (
                        <button
                            key={tab.value || 'all'}
                            type="button"
                            className={[
                                'rounded-full border px-3.5 py-2 text-sm font-medium transition-colors',
                                active
                                    ? 'border-[var(--color-primary)] bg-[var(--color-secondary)] text-[var(--color-primary-hover)]'
                                    : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary-hover)]',
                            ].join(' ')}
                            onClick={() =>
                                updateFilters({
                                    content_type: tab.value,
                                    page: 1,
                                })
                            }
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {blogsQuery.isLoading ? (
                <Card>
                    <CardBody>
                        <Loading label={translate('text.loading_article')} />
                    </CardBody>
                </Card>
            ) : blogsQuery.isError ? (
                <EmptyState
                    icon={Search}
                    title={translate('text.unable_to_load_article')}
                    description={blogsQuery.error.message}
                />
            ) : blogs.length === 0 ? (
                <EmptyState
                    title={translate('text.no_posts_yet')}
                    description={translate('text.published_tutorials_and_news_will_appear_here')}
                />
            ) : (
                <>
                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                        {blogs.map((blog) => (
                            <BlogCard key={blog.id} blog={blog} />
                        ))}
                    </div>

                    <Card>
                        <CardBody>
                            <Pagination
                                page={pagination.current_page || filters.page}
                                totalPages={totalPages}
                                onPageChange={(page) =>
                                    updateFilters({
                                        page: Math.min(Math.max(page, 1), totalPages),
                                    })
                                }
                            />
                        </CardBody>
                    </Card>
                </>
            )}
        </div>
    );
}
