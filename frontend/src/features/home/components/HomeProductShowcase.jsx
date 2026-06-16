import { translate } from '../../../shared/i18n/index';
import {
    ChevronLeft,
    ChevronRight,
    Package,
    ShoppingBag,
    ShoppingCart,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import Badge from '../../../shared/components/Badge';
import { ROUTES } from '../../../shared/constants/routes';
import { cn } from '../../../shared/utils/cn';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { getPrimaryImage } from '../../../shared/utils/getPrimaryImage';
import { useCategoryTree } from '../../categories/hooks/useCategories';
import QuickAddProductModal from '../../products/components/QuickAddProductModal';
import { useProducts } from '../../products/hooks/useProducts';

const HOME_PRODUCT_LIMIT = 12;
const HOME_GRID_LIMIT = 8;

const FRUIT_CATEGORY_SLUGS = [
    'tui-bao-trai-xoai',
    'tui-bao-trai-buoi',
    'tui-bao-trai-oi',
    'tui-bao-trai-thanh-long',
    'tui-bao-trai-mit',
    'tui-bao-trai-nho',
    'tui-bao-nhan-vai',
    'tui-bao-trai-chuoi',
    'tui-bao-trai-na-mang-cau',
    'tui-bao-rau-cu-qua-dai',
];

const BAG_TYPE_OPTIONS = [
    { label: 'Vải không dệt', value: 'Vải không dệt' },
    { label: 'Túi lưới', value: 'Lưới' },
    { label: 'Túi giấy kraft', value: 'Giấy kraft' },
    { label: 'Túi xốp lưới', value: 'Xốp lưới' },
];

const merchandisingSections = [
    {
        key: 'on-sale',
        title: translate('text.discounted'),
        bannerTone: 'sale',
        imageSrc: null,
        params: { badge: 'on_sale', sortBy: 'newest' },
        linkParams: { badge: 'on_sale', sortBy: 'newest' },
    },
    {
        key: 'best-seller',
        title: translate('text.best_seller'),
        bannerTone: 'popular',
        imageSrc: null,
        params: { badge: 'best_seller', sortBy: 'popular' },
        linkParams: { badge: 'best_seller', sortBy: 'popular' },
    },
    {
        key: 'new-arrivals',
        title: translate('text.new_arrival'),
        bannerTone: 'new',
        imageSrc: null,
        params: { badge: 'new', sortBy: 'newest' },
        linkParams: { badge: 'new', sortBy: 'newest' },
    },
];

function buildProductsUrl(params = {}) {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            searchParams.set(key, String(value));
        }
    });

    if ([...searchParams.keys()].length > 0) {
        searchParams.set('page', '1');
    }

    const query = searchParams.toString();
    return query ? `${ROUTES.PRODUCTS}?${query}` : ROUTES.PRODUCTS;
}

function compactParams(params = {}) {
    return Object.fromEntries(
        Object.entries(params).filter(
            ([, value]) => value !== undefined && value !== null && value !== ''
        )
    );
}

function flattenCategoryTree(categories = []) {
    return categories.flatMap((category) => [
        category,
        ...flattenCategoryTree(category.children || []),
    ]);
}

function ProductSectionBanner({
    title,
    tone = 'default',
    imageSrc = null,
    imageAlt = '',
    className,
}) {
    const toneClassName = {
        sale:
            'from-[#fef2f2] via-[#fff7ed] to-[#ecfdf5] text-red-950',
        popular:
            'from-[#111827] via-[#14532d] to-[#facc15] text-white',
        new:
            'from-[#ecfdf5] via-[#e0f2fe] to-[#fff7ed] text-emerald-950',
        category:
            'from-[#0f3d2e] via-[#d9f99d] to-[#fefce8] text-white',
        all:
            'from-[#f0fdf4] via-[#ffffff] to-[#fffbeb] text-emerald-950',
        default:
            'from-[#ecfdf5] via-[#ffffff] to-[#fffbeb] text-emerald-950',
    }[tone];

    return (
        <div
            className={cn(
                'relative overflow-hidden rounded-lg bg-gradient-to-r p-5 shadow-sm ring-1 ring-black/5 sm:p-6',
                imageSrc ? 'bg-gray-900 text-white' : toneClassName,
                className
            )}
        >
            {imageSrc ? (
                <>
                    <img
                        src={imageSrc}
                        alt={imageAlt || title}
                        className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/35" />
                </>
            ) : (
                <div className="absolute inset-y-0 right-0 w-1/2 bg-[linear-gradient(135deg,rgba(255,255,255,0.28),transparent)]" />
            )}
            <div className="relative flex min-h-24 items-center sm:min-h-32">
                <div>
                    <p className="text-xs font-semibold uppercase opacity-80">
                        Nguyen Lien Shop
                    </p>
                    <h2 className="mt-2 text-2xl font-bold leading-tight sm:text-3xl">
                        {title}
                    </h2>
                </div>
            </div>
        </div>
    );
}

function formatPriceRange(min, max) {
    const start = Number(min || 0);
    const end = Number(max || 0);

    if (!start && !end) {
        return translate('text.contact');
    }

    if (start === end || !end) {
        return formatCurrency(start);
    }

    return `${formatCurrency(start)} - ${formatCurrency(end)}`;
}

function HomeProductPrice({ product }) {
    const currentRange = formatPriceRange(product.min_price, product.max_price);
    const originalRange = formatPriceRange(
        product.original_min_price ?? product.min_price,
        product.original_max_price ?? product.max_price
    );
    const showOriginal =
        product.is_on_sale &&
        (Number(product.original_min_price ?? product.min_price) !==
            Number(product.min_price) ||
            Number(product.original_max_price ?? product.max_price) !==
            Number(product.max_price));

    return (
        <div className="mt-2 min-h-[42px] space-y-0.5">
            <p
                className={cn(
                    'truncate text-sm font-semibold leading-5',
                    product.is_on_sale
                        ? 'text-[var(--color-error)]'
                        : 'text-[var(--color-primary-hover)]'
                )}
                title={currentRange}
            >
                {currentRange}
            </p>
            {showOriginal && (
                <p
                    className="truncate text-xs leading-4 text-[var(--color-text-muted)] line-through"
                    title={originalRange}
                >
                    {originalRange}
                </p>
            )}
        </div>
    );
}

function HomeProductCard({ product, className }) {
    const image = getPrimaryImage(product.image || product.images);
    const [imageFailed, setImageFailed] = useState(false);
    const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
    const productPath = `${ROUTES.PRODUCTS}/${product.id}`;
    const primaryBadge = [
        product.is_on_sale && {
            label:
                product.max_discount_percent > 0
                    ? `-${product.max_discount_percent}%`
                    : translate('text.discounted'),
            variant: 'error',
        },
        product.is_new && {
            label: translate('text.new_arrival'),
            variant: 'primary',
        },
        product.is_best_seller && {
            label: translate('text.best_seller'),
            variant: 'accent',
        },
    ].find(Boolean);

    return (
        <>
            <article
                className={cn(
                    'group relative flex h-[342px] flex-col overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm transition-shadow hover:shadow-md',
                    className
                )}
            >
                <Link to={productPath} className="relative block h-[166px] bg-[var(--color-background)]">
                    {image?.url && !imageFailed ? (
                        <img
                            src={image.url}
                            alt={image.alt || product.name}
                            className="h-full w-full object-contain p-4 transition-transform duration-200 group-hover:scale-[1.03]"
                            loading="lazy"
                            onError={() => setImageFailed(true)}
                        />
                    ) : (
                        <div className="flex h-full items-center justify-center text-[var(--color-text-muted)]">
                            <Package className="h-9 w-9" />
                        </div>
                    )}

                    {primaryBadge && (
                        <Badge
                            variant={primaryBadge.variant}
                            className="absolute left-2 top-2 rounded-md px-2 py-0.5 text-[10px] shadow-sm"
                        >
                            {primaryBadge.label}
                        </Badge>
                    )}
                </Link>

                <div className="flex min-h-0 flex-1 flex-col p-3">
                    <Link to={productPath}>
                        <h3 className="line-clamp-3 min-h-[60px] text-sm font-semibold leading-5 text-[var(--color-text-main)] transition-colors group-hover:text-[var(--color-primary-hover)]">
                            {product.name}
                        </h3>
                    </Link>

                    <HomeProductPrice product={product} />

                    <div className="mt-auto flex items-center justify-between gap-2 border-t border-[var(--color-border)] pt-3">
                        <span className="min-w-0 truncate text-xs text-[var(--color-text-muted)]">
                            {translate('text.sold')} {product.sold_count || 0}
                        </span>
                        <div className="flex shrink-0 items-center gap-1.5">
                            <Link
                                to={productPath}
                                className="inline-flex h-8 items-center rounded-md border border-[var(--color-border)] bg-white px-2.5 text-xs font-semibold text-[var(--color-text-main)] transition-colors hover:bg-[var(--color-background)]"
                            >
                                {translate('text.details')}
                            </Link>
                            <button
                                type="button"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-secondary)] text-[var(--color-primary-hover)] transition-colors hover:bg-green-100 disabled:opacity-60"
                                disabled={!product.in_stock}
                                aria-label={translate('text.add_to_cart')}
                                title={translate('text.add_to_cart')}
                                onClick={() => setIsQuickAddOpen(true)}
                            >
                                <ShoppingCart className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </article>

            <QuickAddProductModal
                open={isQuickAddOpen}
                product={product}
                mode="cart"
                onClose={() => setIsQuickAddOpen(false)}
            />
        </>
    );
}

function ProductCardSkeleton({ className }) {
    return (
        <div
            className={cn(
                'h-[342px] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-sm',
                className
            )}
        >
            <div className="h-[156px] animate-pulse rounded-md bg-gray-100" />
            <div className="mt-3 h-3 w-10/12 animate-pulse rounded bg-gray-100" />
            <div className="mt-2 h-3 w-7/12 animate-pulse rounded bg-gray-100" />
            <div className="mt-4 h-4 w-1/2 animate-pulse rounded bg-gray-100" />
        </div>
    );
}

function EmptyProducts() {
    return (
        <div className="flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-center text-sm text-[var(--color-text-muted)]">
            <ShoppingBag className="mb-2 h-8 w-8 text-[var(--color-primary)]" />
            {translate('text.no_products_to_display')}
        </div>
    );
}

function ProductRail({ products, isLoading }) {
    const railRef = useRef(null);
    const [scrollState, setScrollState] = useState({
        canScrollLeft: false,
        canScrollRight: false,
    });

    const updateScrollState = () => {
        const rail = railRef.current;

        if (!rail) {
            return;
        }

        setScrollState({
            canScrollLeft: rail.scrollLeft > 4,
            canScrollRight:
                rail.scrollLeft + rail.clientWidth < rail.scrollWidth - 4,
        });
    };

    useEffect(() => {
        updateScrollState();

        const handleResize = () => updateScrollState();
        window.addEventListener('resize', handleResize);

        return () => window.removeEventListener('resize', handleResize);
    }, [products.length]);

    const scrollByPage = (direction) => {
        const rail = railRef.current;

        if (!rail) {
            return;
        }

        rail.scrollBy({
            left: direction * Math.max(rail.clientWidth * 0.84, 220),
            behavior: 'smooth',
        });
    };

    return (
        <div className="relative">
            <div
                ref={railRef}
                className="flex snap-x gap-3 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                onScroll={updateScrollState}
            >
                {isLoading
                    ? Array.from({ length: 5 }).map((_, index) => (
                        <ProductCardSkeleton
                            key={index}
                            className="w-[214px] shrink-0 snap-start sm:w-[224px] lg:w-[236px]"
                        />
                    ))
                    : products.map((product) => (
                        <HomeProductCard
                            key={product.id}
                            product={product}
                            className="w-[214px] shrink-0 snap-start sm:w-[224px] lg:w-[236px]"
                        />
                    ))}
            </div>

            {!isLoading && products.length === 0 && <EmptyProducts />}

            <button
                type="button"
                className="absolute left-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-main)] shadow-md transition-colors hover:bg-[var(--color-secondary)] disabled:hidden"
                disabled={!scrollState.canScrollLeft}
                aria-label={translate('text.previous_products')}
                onClick={() => scrollByPage(-1)}
            >
                <ChevronLeft className="h-4 w-4" />
            </button>
            <button
                type="button"
                className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-main)] shadow-md transition-colors hover:bg-[var(--color-secondary)] disabled:hidden"
                disabled={!scrollState.canScrollRight}
                aria-label={translate('text.next_products')}
                onClick={() => scrollByPage(1)}
            >
                <ChevronRight className="h-4 w-4" />
            </button>
        </div>
    );
}

function ProductRailPanel({ title, products, isLoading, viewAllTo, children }) {
    return (
        <div className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-black/5 sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-lg font-bold text-[var(--color-text-main)]">
                    {title}
                </h3>
            </div>

            {children}
            <ProductRail products={products} isLoading={isLoading} />

            <div className="mt-4 flex justify-center">
                <Link
                    to={viewAllTo}
                    className="inline-flex h-8 items-center rounded-md bg-[var(--color-text-main)] px-3 text-xs font-semibold !text-white transition-colors hover:bg-[var(--color-primary-hover)]"
                >
                    {translate('text.view_all_products')}
                </Link>
            </div>
        </div>
    );
}

function MerchandisingProductSection({ section }) {
    const params = useMemo(
        () => ({
            page: 1,
            limit: HOME_PRODUCT_LIMIT,
            ...section.params,
        }),
        [section.params]
    );
    const productsQuery = useProducts(params);
    const products = productsQuery.data?.data || [];

    return (
        <section className="space-y-3">
            <ProductSectionBanner
                title={section.title}
                tone={section.bannerTone}
                imageSrc={section.imageSrc}
            />
            <ProductRailPanel
                title={section.title}
                products={products}
                isLoading={productsQuery.isLoading}
                viewAllTo={buildProductsUrl(section.linkParams)}
            />
        </section>
    );
}

function FilterPills({ options, value, onChange }) {
    return (
        <div className="mb-3 flex h-24 content-start flex-wrap gap-2 overflow-y-auto pr-1 [scrollbar-color:#d1d5db_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-track]:bg-transparent">
            {options.map((option) => {
                const isActive = option.value === value;

                return (
                    <button
                        key={option.value}
                        type="button"
                        className={cn(
                            'h-8 shrink-0 rounded-full border px-3 text-xs font-semibold transition-colors',
                            isActive
                                ? 'border-[var(--color-primary)] bg-[var(--color-primary)] !text-white'
                                : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-main)] hover:bg-[var(--color-secondary)]'
                        )}
                        onClick={() => onChange(option.value)}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}

function FruitTypeProductSection({ categories }) {
    const fruitOptions = useMemo(
        () =>
            FRUIT_CATEGORY_SLUGS
                .map((slug) => categories.find((category) => category.slug === slug))
                .filter(Boolean)
                .map((category) => ({
                    label: category.name,
                    value: category.id,
                })),
        [categories]
    );
    const [activeCategoryId, setActiveCategoryId] = useState('');
    const selectedCategoryId = fruitOptions.some(
        (option) => option.value === activeCategoryId
    )
        ? activeCategoryId
        : fruitOptions[0]?.value || '';
    const params = useMemo(
        () => compactParams({
            page: 1,
            limit: HOME_PRODUCT_LIMIT,
            sortBy: 'newest',
            category_id: selectedCategoryId,
        }),
        [selectedCategoryId]
    );
    const productsQuery = useProducts(params);
    const viewAllTo = buildProductsUrl({ category_id: selectedCategoryId });

    return (
        <ProductRailPanel
            title={translate('text.home_by_fruit_type')}
            products={productsQuery.data?.data || []}
            isLoading={productsQuery.isLoading}
            viewAllTo={viewAllTo}
        >
            {fruitOptions.length > 0 && (
                <FilterPills
                    options={fruitOptions}
                    value={selectedCategoryId}
                    onChange={setActiveCategoryId}
                />
            )}
        </ProductRailPanel>
    );
}

function BagTypeProductSection() {
    const [activeBagType, setActiveBagType] = useState(BAG_TYPE_OPTIONS[0].value);
    const params = useMemo(
        () => ({
            page: 1,
            limit: HOME_PRODUCT_LIMIT,
            sortBy: 'newest',
            bag_type: activeBagType,
        }),
        [activeBagType]
    );
    const productsQuery = useProducts(params);

    return (
        <ProductRailPanel
            title={translate('text.home_by_bag_type')}
            products={productsQuery.data?.data || []}
            isLoading={productsQuery.isLoading}
            viewAllTo={buildProductsUrl({ bag_type: activeBagType })}
        >
            <FilterPills
                options={BAG_TYPE_OPTIONS}
                value={activeBagType}
                onChange={setActiveBagType}
            />
        </ProductRailPanel>
    );
}

function CategoryProductLayout() {
    const categoryTreeQuery = useCategoryTree();
    const categories = useMemo(
        () => flattenCategoryTree(categoryTreeQuery.data?.data || []),
        [categoryTreeQuery.data?.data]
    );

    return (
        <section className="space-y-3">
            <ProductSectionBanner
                title={translate('text.home_product_categories')}
                tone="category"
            />
            <div className="grid gap-4 lg:grid-cols-2">
                <FruitTypeProductSection categories={categories} />
                <BagTypeProductSection />
            </div>
        </section>
    );
}

function AllProductsLayout() {
    const params = useMemo(
        () => ({
            page: 1,
            limit: HOME_GRID_LIMIT,
            sortBy: 'newest',
        }),
        []
    );
    const productsQuery = useProducts(params);
    const products = productsQuery.data?.data || [];

    return (
        <section className="space-y-3">
            <ProductSectionBanner title={translate('text.all_products')} tone="all" />
            <div className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-black/5 sm:p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-lg font-bold text-[var(--color-text-main)]">
                        {translate('text.home_all_products_title')}
                    </h3>
                </div>

                {productsQuery.isLoading ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        {Array.from({ length: HOME_GRID_LIMIT }).map((_, index) => (
                            <ProductCardSkeleton key={index} />
                        ))}
                    </div>
                ) : products.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        {products.slice(0, HOME_GRID_LIMIT).map((product) => (
                            <HomeProductCard key={product.id} product={product} />
                        ))}
                    </div>
                ) : (
                    <EmptyProducts />
                )}

                <div className="mt-4 flex justify-center">
                    <Link
                        to={ROUTES.PRODUCTS}
                        className="inline-flex h-9 items-center rounded-md bg-[var(--color-text-main)] px-4 text-xs font-semibold !text-white transition-colors hover:bg-[var(--color-primary-hover)]"
                    >
                        {translate('text.view_all_products')}
                    </Link>
                </div>
            </div>
        </section>
    );
}

export default function HomeProductShowcase() {
    return (
        <div className="space-y-7">
            {merchandisingSections.map((section) => (
                <MerchandisingProductSection key={section.key} section={section} />
            ))}

            <CategoryProductLayout />
            <AllProductsLayout />
        </div>
    );
}
