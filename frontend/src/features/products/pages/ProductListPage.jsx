import { useCallback, useMemo } from 'react';
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
            page: Number(searchParams.get('page') || 1),
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
                <p className="text-sm font-medium text-[var(--color-primary-hover)]">
                    Catalog
                </p>
                <h1 className="mt-1 text-3xl font-semibold text-[var(--color-text-main)]">
                    Túi bao trái cây
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-[var(--color-text-muted)]">
                    Chọn đúng kích thước, chất liệu và quy cách đóng gói để bảo
                    vệ trái cây tốt hơn trong vườn.
                </p>
            </div>

            <ProductFilter
                filters={filters}
                onChange={updateFilters}
                onReset={resetFilters}
            />

            <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
                <Card className="h-fit">
                    <CardHeader>
                        <h2 className="font-semibold text-[var(--color-text-main)]">
                            Danh mục
                        </h2>
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
                                ? 'Đang cập nhật...'
                                : `${pagination.total_items || 0} sản phẩm`}
                        </p>
                    </div>

                    {productsQuery.isLoading && (
                        <Card>
                            <CardBody>
                                <Loading label="Đang tải sản phẩm..." />
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
                                title="Không tìm thấy sản phẩm"
                                description="Thử đổi từ khóa, danh mục hoặc khoảng giá để xem thêm sản phẩm."
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
                                        totalPages={pagination.total_pages || 1}
                                        onPageChange={(page) =>
                                            updateFilters({ page })
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
