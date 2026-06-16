import { getLocale, translate } from '../../../shared/i18n/index';
import {
    CheckCircle2,
    Flag,
    MessageSquare,
    Minus,
    PackageOpen,
    Plus,
    RefreshCw,
    ShieldCheck,
    ShoppingCart,
    Star,
    ThumbsDown,
    ThumbsUp,
    Zap,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Link,
    useNavigate,
    useParams,
    useSearchParams,
} from 'react-router-dom';
import Badge from '../../../shared/components/Badge';
import Button from '../../../shared/components/Button';
import Card, { CardBody, CardHeader } from '../../../shared/components/Card';
import EmptyState from '../../../shared/components/EmptyState';
import Loading from '../../../shared/components/Loading';
import Modal from '../../../shared/components/Modal';
import Pagination from '../../../shared/components/Pagination';
import Select from '../../../shared/components/Select';
import { ROUTES } from '../../../shared/constants/routes';
import { cn } from '../../../shared/utils/cn';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { getPrimaryImage } from '../../../shared/utils/getPrimaryImage';
import { useAuthStore } from '../../auth/store/auth.store';
import { useAddCartItem } from '../../cart/hooks/useCart';
import {
    useFlagReview,
    useMarkReviewHelpful,
    useProductReviews,
} from '../../reviews/hooks/useReviews';
import ProductPrice from '../components/ProductPrice';
import { useProductDetail } from '../hooks/useProducts';
import {
    calculateOrderTotal,
    calculateOriginalOrderTotal,
    findTierForQuantity,
    getTierOriginalUnitPrice,
    getTierUnitPrice,
} from '../utils/pricing';

const REVIEW_PAGE_SIZE = 5;

const FLAG_REASON_OPTIONS = [
    { value: 'spam', label: translate('text.spam_or_advertising') },
    { value: 'inappropriate', label: translate('text.inappropriate_content') },
    { value: 'fake', label: translate('text.fake_review') },
    { value: 'duplicate', label: translate('text.duplicate_review') },
    { value: 'other', label: translate('text.other_reasons') },
];

function getReviewRating(review) {
    return Number(review?.rating?.overall || review?.rating || 0);
}

function formatReviewDate(value) {
    if (!value) {
        return translate('text.updating');
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return translate('text.updating');
    }

    return new Intl.DateTimeFormat(getLocale(), {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(date);
}

function RatingStars({ value }) {
    const rating = Math.round(Number(value) || 0);

    return (
        <div className="flex items-center gap-1" aria-label={`${rating} sao`}>
            {[1, 2, 3, 4, 5].map((star) => (
                <Star
                    key={star}
                    className={cn(
                        'h-4 w-4',
                        star <= rating
                            ? 'fill-[var(--color-accent)] text-[var(--color-accent)]'
                            : 'text-[var(--color-border)]'
                    )}
                />
            ))}
        </div>
    );
}

export default function ProductDetailPage() {
    const { productId } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const isBuyNowIntent = searchParams.get('intent') === 'buy-now';
    const purchaseOptionsRef = useRef(null);
    const hasFocusedPurchaseOptions = useRef(false);
    const accessToken = useAuthStore((state) => state.accessToken);
    const productQuery = useProductDetail(productId, { include_units: true });
    const [reviewsPage, setReviewsPage] = useState(1);
    const reviewParams = useMemo(
        () => ({ page: reviewsPage, limit: REVIEW_PAGE_SIZE }),
        [reviewsPage]
    );
    const reviewsQuery = useProductReviews(productId, reviewParams);
    const markReviewHelpfulMutation = useMarkReviewHelpful();
    const flagReviewMutation = useFlagReview();
    const addCartItemMutation = useAddCartItem();
    const product = productQuery.data?.data;
    const isSimpleProduct = product?.product_type === 'SIMPLE';
    const reviews = reviewsQuery.data?.data || [];
    const reviewsPagination = reviewsQuery.data?.pagination || {};
    const reviewsTotalPages = Math.max(
        Number(reviewsPagination.totalPages || reviewsPagination.total_pages) || 1,
        1
    );
    const reviewsTotal = Number(
        reviewsPagination.total ?? product?.rating_count ?? reviews.length
    );
    const ratingAverage = reviewsTotal > 0 ? Number(product?.rating_avg || 0) : 0;
    const variants = useMemo(
        () =>
            (product?.variants || []).filter(
                (variant) => variant.status === 'ACTIVE'
            ),
        [product?.variants]
    );
    const images = useMemo(() => product?.images || [], [product?.images]);
    const primaryImage = useMemo(() => getPrimaryImage(images), [images]);
    const [selectedImageUrl, setSelectedImageUrl] = useState('');
    const [failedImageUrls, setFailedImageUrls] = useState([]);
    const selectedImage =
        images.find((image) => image.url === selectedImageUrl) || primaryImage;
    const selectedImageFailed =
        selectedImage?.url && failedImageUrls.includes(selectedImage.url);
    const thumbnailSlots = images.length
        ? images
        : Array.from({ length: 5 }, (_, index) => ({
            id: `placeholder-${index}`,
        }));
    const [selectedVariantId, setSelectedVariantId] = useState('');
    const selectedVariant = useMemo(
        () =>
            variants.find((variant) => variant.id === selectedVariantId) ||
            variants[0],
        [selectedVariantId, variants]
    );
    const units = useMemo(
        () => selectedVariant?.units || [],
        [selectedVariant?.units]
    );
    const [selectedUnitId, setSelectedUnitId] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [cartNotice, setCartNotice] = useState(null);
    const [flaggedReview, setFlaggedReview] = useState(null);
    const [flagReason, setFlagReason] = useState('spam');
    const selectedUnit = useMemo(
        () =>
            units.find((unit) => unit.id === selectedUnitId) ||
            units.find((unit) => unit.is_default) ||
            units[0],
        [selectedUnitId, units]
    );
    const currency = selectedUnit?.currency || 'VND';
    const minOrderQuantity = selectedUnit?.min_order_qty || 1;
    const availableItems = Math.max(
        0,
        Number(selectedVariant?.stock?.available || 0)
    );
    const availablePacks =
        selectedUnit?.pack_size > 0
            ? Math.floor(
                availableItems / selectedUnit.pack_size
            )
            : 0;
    const maxOrderQuantity = Math.min(
        selectedUnit?.max_order_qty || 999,
        availablePacks
    );
    const quantityStep = selectedUnit?.qty_step || 1;
    const quantityLabel = isSimpleProduct
        ? 'Số lượng'
        : translate('text.number_of_packages');
    const unitLabel = isSimpleProduct
        ? selectedUnit?.display_name || 'sản phẩm'
        : translate('text.package_08ffada9');
    const cartQuantity = Math.min(
        maxOrderQuantity,
        Math.max(minOrderQuantity, quantity)
    );
    const selectedTier = useMemo(
        () => findTierForQuantity(selectedUnit, cartQuantity),
        [cartQuantity, selectedUnit]
    );
    const selectedUnitPrice = getTierUnitPrice(selectedTier);
    const selectedOriginalUnitPrice = getTierOriginalUnitPrice(selectedTier);
    const orderTotal = calculateOrderTotal(selectedTier, cartQuantity);
    const originalOrderTotal = calculateOriginalOrderTotal(
        selectedTier,
        cartQuantity
    );
    const canAddToCart = Boolean(
        product?.id &&
        selectedVariant?.id &&
        selectedUnit?.id &&
        product.in_stock &&
        selectedVariant.in_stock &&
        maxOrderQuantity >= minOrderQuantity &&
        !addCartItemMutation.isPending
    );

    useEffect(() => {
        if (
            !isBuyNowIntent ||
            !product?.id ||
            hasFocusedPurchaseOptions.current
        ) {
            return;
        }

        hasFocusedPurchaseOptions.current = true;
        const timeoutId = window.setTimeout(() => {
            purchaseOptionsRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        }, 150);

        return () => window.clearTimeout(timeoutId);
    }, [isBuyNowIntent, product?.id]);

    const handleAddToCart = async ({ checkout = false } = {}) => {
        setCartNotice(null);

        if (!selectedVariant?.id || !selectedUnit?.id) {
            setCartNotice({
                type: 'error',
                message: translate('text.please_select_variant_and_unit_of_sale'),
            });
            return;
        }

        try {
            await addCartItemMutation.mutateAsync({
                product_id: product.id,
                variant_id: selectedVariant.id,
                unit_id: selectedUnit.id,
                quantity: cartQuantity,
            });

            if (checkout) {
                navigate(ROUTES.CHECKOUT);
                return;
            }

            setCartNotice({
                type: 'success',
                message: translate('text.product_added_to_cart'),
            });
        } catch (error) {
            setCartNotice({
                type: 'error',
                message: error.message || translate('text.unable_to_add_product_to_cart'),
            });
        }
    };

    const handleMarkReviewHelpful = async (reviewId, helpful) => {
        try {
            await markReviewHelpfulMutation.mutateAsync({ reviewId, helpful });
        } catch {
            return;
        }
    };

    const openFlagModal = (review) => {
        setFlaggedReview(review);
        setFlagReason('spam');
        flagReviewMutation.reset();
    };

    const closeFlagModal = () => {
        setFlaggedReview(null);
        setFlagReason('spam');
        flagReviewMutation.reset();
    };

    const handleFlagReview = async () => {
        if (!flaggedReview?.id) {
            return;
        }

        try {
            await flagReviewMutation.mutateAsync({
                reviewId: flaggedReview.id,
                reason: flagReason,
            });
            closeFlagModal();
        } catch {
            return;
        }
    };

    if (productQuery.isLoading) {
        return (
            <Card>
                <CardBody>
                    <Loading label={translate('text.loading_product_details')} />
                </CardBody>
            </Card>
        );
    }

    if (productQuery.isError) {
        return (
            <EmptyState
                icon={PackageOpen}
                title={translate('text.unable_to_download_product')}
                description={productQuery.error.message}
                actionLabel={translate('text.back_to_catalog')}
                onAction={() => window.history.back()}
            />
        );
    }

    if (!product) {
        return (
            <EmptyState
                icon={PackageOpen}
                title={translate('text.no_product_found')}
                description={translate('text.the_product_may_have_been_discontinued_or_the_link_may_be_incorrect')}
            />
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,520px)_1fr]">
                <div className="space-y-4">
                    <Card className="overflow-hidden">
                        <div className="aspect-square bg-[var(--color-background)]">
                            {selectedImage?.url && !selectedImageFailed ? (
                                <img
                                    src={selectedImage.url}
                                    alt={selectedImage.alt || product.name}
                                    className="h-full w-full object-contain p-4 sm:p-6"
                                    onError={() =>
                                        setFailedImageUrls((current) =>
                                            current.includes(selectedImage.url)
                                                ? current
                                                : [...current, selectedImage.url]
                                        )
                                    }
                                />
                            ) : (
                                <div className="flex h-full items-center justify-center text-[var(--color-text-muted)]">
                                    <PackageOpen
                                        className="h-20 w-20"
                                        strokeWidth={1.6}
                                    />
                                </div>
                            )}
                        </div>
                    </Card>

                    <div className="relative z-40 grid grid-cols-5 gap-2 sm:gap-3">
                        {thumbnailSlots.map((image, index) => {
                            const hasImage = Boolean(image.url);
                            const isSelected =
                                hasImage && selectedImage?.url === image.url;
                            const imageFailed =
                                hasImage && failedImageUrls.includes(image.url);

                            return (
                                <button
                                    key={image.url || image.id || index}
                                    type="button"
                                    disabled={!hasImage}
                                    aria-label={
                                        hasImage
                                            ? `${product.name} ${index + 1}`
                                            : translate('text.updating')
                                    }
                                    className={cn(
                                        'aspect-square rounded-md border bg-[var(--color-surface)] p-1.5 transition-colors sm:p-2',
                                        hasImage
                                            ? 'hover:border-[var(--color-primary)]'
                                            : 'cursor-default border-dashed text-[var(--color-text-muted)]',
                                        isSelected
                                            ? 'border-[var(--color-primary)] bg-[var(--color-secondary)] ring-1 ring-[var(--color-primary)]'
                                            : 'border-[var(--color-border)]'
                                    )}
                                    onClick={() => {
                                        if (hasImage) {
                                            setSelectedImageUrl(image.url);
                                        }
                                    }}
                                >
                                    {hasImage && !imageFailed ? (
                                        <img
                                            src={image.url}
                                            alt={image.alt || product.name}
                                            className="h-full w-full object-contain"
                                            loading="lazy"
                                            onError={() =>
                                                setFailedImageUrls((current) =>
                                                    current.includes(image.url)
                                                        ? current
                                                        : [...current, image.url]
                                                )
                                            }
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center rounded-sm bg-[var(--color-background)]">
                                            <PackageOpen
                                                className="h-5 w-5 sm:h-6 sm:w-6"
                                                strokeWidth={1.6}
                                            />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="space-y-5">
                    <div>
                        <h1 className="text-3xl font-semibold leading-tight text-[var(--color-text-main)]">
                            {product.name}
                        </h1>

                        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-[var(--color-text-muted)]">
                            <span className="inline-flex items-center gap-1">
                                <Star className="h-4 w-4 fill-[var(--color-accent)] text-[var(--color-accent)]" />
                                {Number(product.rating_avg || 0).toFixed(1)} (
                                {product.rating_count || 0})
                            </span>
                            <span>{translate('text.sold')} {product.sold_count || 0}</span>
                        </div>

                        <ProductPrice
                            className="mt-4"
                            min={product.min_price}
                            max={product.max_price}
                            originalMin={product.original_min_price}
                            originalMax={product.original_max_price}
                            currency={currency}
                            isOnSale={product.is_on_sale}
                            priceClassName="text-3xl"
                        />

                        {product.short_description && (
                            <p className="mt-4 text-sm leading-6 text-[var(--color-text-muted)]">
                                {product.short_description}
                            </p>
                        )}
                    </div>

                    <Card
                        ref={purchaseOptionsRef}
                        className={
                            isBuyNowIntent
                                ? 'scroll-mt-24 border-[var(--color-primary)]'
                                : ''
                        }
                    >
                        {isBuyNowIntent && (
                            <CardHeader className="!p-4">
                                <div className="flex justify-end">
                                    <Badge variant="accent">
                                        {translate('text.buy_now')}
                                    </Badge>
                                </div>
                            </CardHeader>
                        )}
                        <CardBody className="space-y-4 !p-4">
                            {!isSimpleProduct && (
                                <div className="space-y-2">
                                    <h3 className="text-sm font-semibold text-[var(--color-text-main)]">
                                        {translate('text.fabric_type')}
                                    </h3>
                                    {variants.length === 0 ? (
                                        <p className="text-sm text-[var(--color-text-muted)]"> {translate('text.product_has_no_variations_yet')} </p>
                                    ) : (
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            {variants.map((variant) => (
                                                <button
                                                    key={variant.id}
                                                    type="button"
                                                    className={cn(
                                                        'rounded-md border px-3 py-2.5 text-left transition-colors',
                                                        selectedVariant?.id === variant.id
                                                            ? 'border-[var(--color-primary)] bg-[var(--color-secondary)]'
                                                            : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]'
                                                    )}
                                                    onClick={() =>
                                                        setSelectedVariantId(variant.id)
                                                    }
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-semibold text-[var(--color-text-main)]">
                                                                {variant.size ||
                                                                    translate('text.updating_dimension')}
                                                            </p>
                                                            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                                                                {variant.fabric_type ||
                                                                    translate('text.material_is_updating')}
                                                            </p>
                                                        </div>
                                                        {selectedVariant?.id ===
                                                            variant.id && (
                                                                <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
                                                            )}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {!isSimpleProduct && selectedVariant && (
                                <div className="space-y-2">
                                    <h3 className="text-sm font-semibold text-[var(--color-text-main)]">
                                        {translate('text.unit')}
                                    </h3>
                                    {units.length === 0 ? (
                                        <p className="text-sm text-[var(--color-text-muted)]"> {translate('text.this_variant_has_no_units_for_sale_yet')} </p>
                                    ) : (
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            {units.map((unit) => (
                                                <button
                                                    key={unit.id}
                                                    type="button"
                                                    className={cn(
                                                        'rounded-md border px-3 py-2.5 text-left transition-colors',
                                                        selectedUnit?.id === unit.id
                                                            ? 'border-[var(--color-primary)] bg-[var(--color-secondary)]'
                                                            : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]'
                                                    )}
                                                    onClick={() => setSelectedUnitId(unit.id)}
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-semibold text-[var(--color-text-main)]">
                                                                {unit.display_name}
                                                            </p>
                                                            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                                                                {translate('text.value_items', {
                                                                    value0:
                                                                        unit.pack_size,
                                                                })}{' '}
                                                                {translate('text.package')}
                                                            </p>
                                                            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                                                                {translate('text.minimum')} {unit.min_order_qty || 1} {translate('text.package_08ffada9')}
                                                                {unit.max_order_qty
                                                                    ? translate('text.maximum_value_package', {
                                                                        value0:
                                                                            unit.max_order_qty,
                                                                    })
                                                                    : ''}
                                                            </p>
                                                        </div>
                                                        {selectedUnit?.id ===
                                                            unit.id && (
                                                                <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
                                                            )}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {selectedUnit && (
                                <div className="grid gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                                    <div>
                                        <p className="text-sm font-semibold text-[var(--color-text-main)]"> {quantityLabel} </p>
                                        <p className="mt-0.5 text-xs text-[var(--color-text-muted)]"> {translate('text.minimum')} {minOrderQuantity} {unitLabel} {selectedUnit.max_order_qty
                                            ? translate('text.maximum_value_package', { value0: selectedUnit.max_order_qty })
                                            : ''}
                                        </p>
                                        <p
                                            className={cn(
                                                'mt-1 text-xs font-medium',
                                                availablePacks > 0
                                                    ? 'text-[var(--color-primary-hover)]'
                                                    : 'text-[var(--color-error)]'
                                            )}
                                        >
                                            {translate('text.remaining')} {availablePacks}{' '}
                                            {unitLabel}
                                            {selectedUnit.pack_size > 1 && (
                                                <span className="font-normal text-[var(--color-text-muted)]">
                                                    {' '}
                                                    ({translate('text.value_items', {
                                                        value0: availableItems,
                                                    })})
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={
                                                cartQuantity <= minOrderQuantity ||
                                                addCartItemMutation.isPending
                                            }
                                            onClick={() =>
                                                setQuantity(
                                                    Math.max(
                                                        minOrderQuantity,
                                                        cartQuantity - quantityStep
                                                    )
                                                )
                                            }
                                            aria-label={translate('text.reduce_quantity')}
                                        >
                                            <Minus className="h-4 w-4" />
                                        </Button>
                                        <span className="flex h-9 min-w-14 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-semibold">
                                            {cartQuantity}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={
                                                cartQuantity >= maxOrderQuantity ||
                                                addCartItemMutation.isPending
                                            }
                                            onClick={() =>
                                                setQuantity(
                                                    Math.min(
                                                        maxOrderQuantity,
                                                        cartQuantity + quantityStep
                                                    )
                                                )
                                            }
                                            aria-label={translate('text.increase_quantity')}
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {selectedUnit && (
                                <div className="rounded-md border border-green-200 bg-green-50 p-3">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-[var(--color-text-main)]">
                                                {translate('text.temporary')}
                                            </p>
                                            {selectedTier && (
                                                <p className="mt-0.5 text-xs text-green-700">
                                                    {cartQuantity} {unitLabel} x{' '}
                                                    {selectedOriginalUnitPrice >
                                                        selectedUnitPrice && (
                                                            <span className="mr-1 text-[var(--color-text-muted)] line-through">
                                                                {formatCurrency(
                                                                    selectedOriginalUnitPrice,
                                                                    currency
                                                                )}
                                                            </span>
                                                        )}
                                                    {formatCurrency(
                                                        selectedUnitPrice,
                                                        currency
                                                    )}
                                                    /{unitLabel}
                                                </p>
                                            )}
                                        </div>
                                        <div className="sm:text-right">
                                            {originalOrderTotal > orderTotal && (
                                                <p className="text-xs text-[var(--color-text-muted)] line-through">
                                                    {formatCurrency(
                                                        originalOrderTotal,
                                                        currency
                                                    )}
                                                </p>
                                            )}
                                            <p className="text-xl font-semibold text-[var(--color-primary-hover)]">
                                                {selectedTier
                                                    ? formatCurrency(
                                                        orderTotal,
                                                        currency
                                                    )
                                                    : translate('text.updating')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardBody>
                    </Card>

                    {cartNotice && (
                        <p
                            className={
                                cartNotice.type === 'success'
                                    ? 'rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700'
                                    : 'rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-[var(--color-error)]'
                            }
                        >
                            {cartNotice.message}{' '}
                            {cartNotice.type === 'success' && (
                                <Link
                                    to={ROUTES.CART}
                                    className="font-semibold text-[var(--color-primary-hover)] hover:text-[var(--color-primary)]"
                                > {translate('text.view_cart')} </Link>
                            )}
                        </p>
                    )}

                    <div className="grid gap-3 sm:grid-cols-3">
                        <Button
                            variant="outline"
                            fullWidth
                            disabled={!canAddToCart}
                            isLoading={addCartItemMutation.isPending}
                            onClick={() => handleAddToCart()}
                        >
                            <ShoppingCart className="h-4 w-4" />
                            {translate('text.add_to_cart')}
                        </Button>
                        <Button
                            fullWidth
                            disabled={!canAddToCart}
                            isLoading={addCartItemMutation.isPending}
                            onClick={() =>
                                handleAddToCart({ checkout: true })
                            }
                        >
                            <Zap className="h-4 w-4" />
                            {translate('text.buy_now')}
                        </Button>
                        <Button variant="outline" fullWidth>
                            {translate('text.contact_for_consultation')}
                        </Button>
                    </div>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <h2 className="text-base font-semibold text-[var(--color-text-main)]"> {translate('text.product_details')} </h2>
                </CardHeader>
                <CardBody>
                    {product.description ? (
                        <div className="max-w-none whitespace-pre-line break-words text-sm leading-7 text-[var(--color-text-main)]">
                            {product.description}
                        </div>
                    ) : (
                        <p className="text-sm text-[var(--color-text-muted)]">
                            {translate('text.updating')}
                        </p>
                    )}
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-[var(--color-primary)]" />
                            <h2 className="text-base font-semibold text-[var(--color-text-main)]"> {translate('text.product_review')} </h2>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--color-text-muted)]">
                            <span>{translate('text.trang')} {reviewsPage} / {reviewsTotalPages}</span>
                            <span>{reviewsTotal} {translate('text.reviews')}</span>
                        </div>
                    </div>
                </CardHeader>
                <CardBody className="space-y-5">
                    <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4">
                            <p className="text-sm font-medium text-[var(--color-text-muted)]"> {translate('text.average_score')} </p>
                            <div className="mt-3 flex items-end gap-2">
                                <span className="text-4xl font-semibold text-[var(--color-text-main)]">
                                    {ratingAverage.toFixed(1)}
                                </span>
                                <span className="pb-1 text-sm text-[var(--color-text-muted)]">
                                    / 5
                                </span>
                            </div>
                            <div className="mt-3">
                                <RatingStars value={ratingAverage} />
                            </div>
                        </div>
                        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4">
                            <p className="text-sm font-medium text-[var(--color-text-main)]">
                                {reviewsTotal > 0
                                    ? translate('text.value_customers_rated_this_product', { value0: reviewsTotal })
                                    : translate('text.this_product_has_no_reviews_yet')}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]"> {translate('text.reviews_displayed_here_are_approved_reviews_logged_in_guests_can_mark_us')} </p>
                        </div>
                    </div>

                    {markReviewHelpfulMutation.isError && (
                        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--color-error)]">
                            {markReviewHelpfulMutation.error.message}
                        </p>
                    )}

                    {reviewsQuery.isLoading ? (
                        <Loading label={translate('text.loading_review')} />
                    ) : reviewsQuery.isError ? (
                        <div className="flex flex-col gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-[var(--color-error)]">
                                {reviewsQuery.error.message}
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => reviewsQuery.refetch()}
                            >
                                <RefreshCw className="h-4 w-4" /> {translate('text.reload')} </Button>
                        </div>
                    ) : reviews.length === 0 ? (
                        <EmptyState
                            icon={MessageSquare}
                            title={translate('text.no_reviews_yet')}
                            description={translate('text.when_the_customer_completes_the_order_and_reviews_the_approved_content_w')}
                        />
                    ) : (
                        <div className="divide-y divide-[var(--color-border)] rounded-lg border border-[var(--color-border)]">
                            {reviews.map((review) => (
                                <article
                                    key={review.id}
                                    className="space-y-3 p-4"
                                >
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="min-w-0 space-y-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <RatingStars
                                                    value={getReviewRating(review)}
                                                />
                                                {review.is_verified_purchase ? (
                                                    <Badge
                                                        variant="success"
                                                        className="gap-1"
                                                    >
                                                        <ShieldCheck className="h-3 w-3" /> {translate('text.purchased')} </Badge>
                                                ) : (
                                                    <Badge variant="muted"> {translate('text.unverified')} </Badge>
                                                )}
                                            </div>
                                            <h3 className="break-words text-sm font-semibold text-[var(--color-text-main)]">
                                                {review.title || translate('text.product_review')}
                                            </h3>
                                        </div>
                                        <time className="shrink-0 text-sm text-[var(--color-text-muted)]">
                                            {formatReviewDate(review.created_at)}
                                        </time>
                                    </div>

                                    <p className="whitespace-pre-line break-words text-sm leading-6 text-[var(--color-text-main)]">
                                        {review.content}
                                    </p>

                                    <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center">
                                        {accessToken && (
                                            <>
                                                <Button
                                                    className="w-full sm:w-auto"
                                                    variant={
                                                        review.user_vote ===
                                                            'helpful'
                                                            ? 'secondary'
                                                            : 'ghost'
                                                    }
                                                    size="sm"
                                                    disabled={
                                                        markReviewHelpfulMutation.isPending
                                                    }
                                                    onClick={() =>
                                                        handleMarkReviewHelpful(
                                                            review.id,
                                                            true
                                                        )
                                                    }
                                                >
                                                    <ThumbsUp className="h-4 w-4" /> {translate('text.useful')} {review.helpful_count || 0}
                                                </Button>
                                                <Button
                                                    className="w-full sm:w-auto"
                                                    variant={
                                                        review.user_vote ===
                                                            'unhelpful'
                                                            ? 'secondary'
                                                            : 'ghost'
                                                    }
                                                    size="sm"
                                                    disabled={
                                                        markReviewHelpfulMutation.isPending
                                                    }
                                                    onClick={() =>
                                                        handleMarkReviewHelpful(
                                                            review.id,
                                                            false
                                                        )
                                                    }
                                                >
                                                    <ThumbsDown className="h-4 w-4" /> {translate('text.not_useful_yet')}{' '}
                                                    {review.unhelpful_count || 0}
                                                </Button>
                                                <Button
                                                    className="w-full sm:w-auto"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        openFlagModal(review)
                                                    }
                                                >
                                                    <Flag className="h-4 w-4" /> {translate('text.report')} </Button>
                                            </>
                                        )}
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}

                    {reviewsTotalPages > 1 && (
                        <Pagination
                            page={reviewsPage}
                            totalPages={reviewsTotalPages}
                            onPageChange={setReviewsPage}
                        />
                    )}
                </CardBody>
            </Card>

            <Modal
                open={Boolean(flaggedReview)}
                title={translate('text.assessment_report')}
                onClose={closeFlagModal}
                footer={
                    <>
                        <Button variant="outline" onClick={closeFlagModal}> {translate('text.close')} </Button>
                        <Button
                            isLoading={flagReviewMutation.isPending}
                            onClick={handleFlagReview}
                        > {translate('text.send_report')} </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <p className="text-sm leading-6 text-[var(--color-text-muted)]"> {translate('text.select_a_reason_to_send_this_review_to_the_moderation_queue')} </p>
                    <Select
                        label={translate('text.reason')}
                        value={flagReason}
                        onChange={(event) => setFlagReason(event.target.value)}
                    >
                        {FLAG_REASON_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </Select>
                    {flagReviewMutation.isError && (
                        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--color-error)]">
                            {flagReviewMutation.error.message}
                        </p>
                    )}
                </div>
            </Modal>
        </div>
    );
}
