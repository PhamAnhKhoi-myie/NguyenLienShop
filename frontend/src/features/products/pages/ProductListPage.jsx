import { translate } from '../../../shared/i18n/index';
import { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import CategoryTreeMenu from '../../categories/components/CategoryTreeMenu';
import Card, { CardBody, CardHeader } from '../../../shared/components/Card';
import EmptyState from '../../../shared/components/EmptyState';
import Loading from '../../../shared/components/Loading';
import Pagination from '../../../shared/components/Pagination';
import ProductCard from '../components/ProductCard';
import ProductFilter from '../components/ProductFilter';
import { useProducts } from '../hooks/useProducts';

const DEFAULT_LIMIT = 12;

const normalizePage = (value) => {
    const page = Number(value || 1);
    return Number.isInteger(page) && page > 0 ? page : 1;
};

const cleanParams = (params) =>
    Object.fromEntries(
        Object.entries(params).filter(([, value]) => {
            return value !== undefined && value !== null && value !== '';
        })
    );

export default function ProductListPage() {
    const [searchParams, setSearchParams] = useSearchParams();

    const filters = useMemo(
        () => ({
            page: normalizePage(searchParams.get('page')),
            limit: DEFAULT_LIMIT,
            search: searchParams.get('search') || '',
            category_id: searchParams.get('category_id') || '',
            min_price: searchParams.get('min_price') || '',
            max_price: searchParams.get('max_price') || '',
            sortBy: searchParams.get('sortBy') || 'newest',
            status: 'ACTIVE',
        }),
        [searchParams]
    );

    const productsQuery = useProducts(cleanParams(filters));
    const products = productsQuery.data?.data || [];
    const pagination = productsQuery.data?.pagination || {
        current_page: filters.page,
        total_pages: 1,
        total_items: 0,
        per_page: DEFAULT_LIMIT,
    };
    const totalPages = Math.max(Number(pagination.total_pages) || 1, 1);

    const updateFilters = useCallback(
        (updates) => {
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
        },
        [setSearchParams]
    );

    useEffect(() => {
        if (productsQuery.isSuccess && filters.page > totalPages) {
            updateFilters({ page: totalPages });
        }
    }, [filters.page, productsQuery.isSuccess, totalPages, updateFilters]);

    const resetFilters = useCallback(() => {
        setSearchParams(
            {
                page: '1',
                sortBy: 'newest',
            },
            { replace: true }
        );
    }, [setSearchParams]);

    return (
        <div className="space-y-6">
            <div>

                <h1 className="mt-1 text-3xl font-semibold text-[var(--color-text-main)]"> {translate('text.fruit_bag')} </h1>
                <p className="mt-2 max-w-2xl text-sm text-[var(--color-text-muted)]"> {translate('text.choose_the_right_size_material_and_packaging_to_better_protect_fruit_in_')} </p>
            </div>

            <ProductFilter
                key={filters.search}
                filters={filters}
                onChange={updateFilters}
                onReset={resetFilters}
            />

            <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
                <Card className="h-fit">
                    <CardHeader>
                        <h2 className="font-semibold text-[var(--color-text-main)]"> {translate('text.category')} </h2>
                    </CardHeader>
                    <CardBody>
                        <CategoryTreeMenu
                            selectedId={filters.category_id}
                            onSelect={(categoryId) =>
                                updateFilters({
                                    category_id: categoryId,
                                    page: 1,
                                })
                            }
                        />
                    </CardBody>
                </Card>

                <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                        <p className="text-sm text-[var(--color-text-muted)]">
                            {productsQuery.isFetching
                                ? translate('text.updating_9f3d40e5')
                                : translate('text.value_product', { value0: pagination.total_items || 0 })}
                        </p>
                    </div>

                    {productsQuery.isLoading && (
                        <Card>
                            <CardBody>
                                <Loading label={translate('text.loading_products')} />
                            </CardBody>
                        </Card>
                    )}

                    {productsQuery.isError && (
                        <Card>
                            <CardBody>
                                <p className="text-sm text-[var(--color-error)]">
                                    {productsQuery.error.message}
                                </p>
                            </CardBody>
                        </Card>
                    )}

                    {!productsQuery.isLoading &&
                        !productsQuery.isError &&
                        products.length === 0 && (
                            <EmptyState
                                title={translate('text.no_product_found')}
                                description={translate('text.try_changing_keywords_categories_or_price_ranges_to_see_more_products')}
                            />
                        )}

                    {products.length > 0 && (
                        <>
                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                {products.map((product) => (
                                    <ProductCard key={product.id} product={product} />
                                ))}
                            </div>

                            <Card>
                                <CardBody>
                                    <Pagination
                                        page={pagination.current_page || filters.page}
                                        totalPages={totalPages}
                                        onPageChange={(page) =>
                                            updateFilters({
                                                page: Math.min(
                                                    Math.max(page, 1),
                                                    totalPages
                                                ),
                                            })
                                        }
                                    />
                                </CardBody>
                            </Card>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
