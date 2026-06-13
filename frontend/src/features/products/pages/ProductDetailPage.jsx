import { getLocale, translate } from '../../../shared/i18n/index';
import {
    ArrowLeft,
    Boxes,
    CheckCircle2,
    Flag,
    Layers,
    MessageSquare,
    Minus,
    PackageOpen,
    Plus,
    RefreshCw,
    Ruler,
    ShieldCheck,
    ShoppingCart,
    Star,
    Tag,
    ThumbsDown,
    ThumbsUp,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
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
import { useProductDetail } from '../hooks/useProducts';

const REVIEW_PAGE_SIZE = 5;

const FLAG_REASON_OPTIONS = [
    { value: 'spam', label: translate('text.spam_or_advertising') },
    { value: 'inappropriate', label: translate('text.inappropriate_content') },
    { value: 'fake', label: translate('text.fake_review') },
    { value: 'duplicate', label: translate('text.duplicate_review') },
    { value: 'other', label: translate('text.other_reasons') },
];

function formatPriceRange(min, max, currency = 'VND') {
    const start = Number(min || 0);
    const end = Number(max || 0);

    if (!start && !end) {
        return translate('text.contact');
    }

    if (start === end || !end) {
        return formatCurrency(start, currency);
    }

    return `${formatCurrency(start, currency)} - ${formatCurrency(end, currency)}`;
}

function formatPackSize(packSize) {
    if (!packSize) {
        return translate('text.updating');
    }

    return translate('text.value_the', { value0: packSize });
}

function formatTierQuantity(tier) {
    if (!tier?.max_qty) {
        return translate('text.from_value', { value0: tier?.min_qty || 1 });
    }

    return `${tier.min_qty} - ${tier.max_qty}`;
}

function getUnitPricePerItem(tier, packSize, currency) {
    if (!tier?.unit_price || !packSize) {
        return null;
    }

    return formatCurrency(tier.unit_price / packSize, currency);
}

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

function SpecItem({ icon: Icon, label, value }) {
    return (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-muted)]">
                <Icon className="h-4 w-4 text-[var(--color-primary)]" />
                {label}
            </div>
            <p className="mt-2 text-base font-semibold text-[var(--color-text-main)]">
                {value || translate('text.updating')}
            </p>
        </div>
    );
}

export default function ProductDetailPage() {
    const { productId } = useParams();
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
    const variants = useMemo(() => product?.variants || [], [product?.variants]);
    const images = useMemo(() => product?.images || [], [product?.images]);
    const primaryImage = useMemo(() => getPrimaryImage(images), [images]);
    const [selectedImageUrl, setSelectedImageUrl] = useState('');
    const [failedImageUrls, setFailedImageUrls] = useState([]);
    const selectedImage =
        images.find((image) => image.url === selectedImageUrl) || primaryImage;
    const selectedImageFailed =
        selectedImage?.url && failedImageUrls.includes(selectedImage.url);
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
    const priceTiers = selectedUnit?.price_tiers || [];
    const currency = selectedUnit?.currency || 'VND';
    const minOrderQuantity = selectedUnit?.min_order_qty || 1;
    const maxOrderQuantity = selectedUnit?.max_order_qty || 999;
    const quantityStep = selectedUnit?.qty_step || 1;
    const cartQuantity = Math.min(
        maxOrderQuantity,
        Math.max(minOrderQuantity, quantity)
    );
    const canAddToCart = Boolean(
        product?.id &&
            selectedVariant?.id &&
            selectedUnit?.id &&
            !addCartItemMutation.isPending
    );

    const handleAddToCart = async () => {
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
            <Link
                to={ROUTES.PRODUCTS}
                className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-primary-hover)] hover:text-[var(--color-primary)]"
            >
                <ArrowLeft className="h-4 w-4" /> {translate('text.back_to_catalog')} </Link>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,520px)_1fr]">
                <div className="space-y-4">
                    <Card className="overflow-hidden">
                        <div className="aspect-square bg-[var(--color-surface)]">
                            {selectedImage?.url && !selectedImageFailed ? (
                                <img
                                    src={selectedImage.url}
                                    alt={selectedImage.alt || product.name}
                                    className="h-full w-full object-contain p-6"
                                    onError={() =>
                                        setFailedImageUrls((current) =>
                                            current.includes(selectedImage.url)
                                                ? current
                                                : [...current, selectedImage.url]
                                        )
                                    }
                                />
                            ) : (
                                <div className="flex h-full items-center justify-center bg-[var(--color-background)] text-[var(--color-text-muted)]">
                                    <PackageOpen className="h-20 w-20" />
                                </div>
                            )}
                        </div>
                    </Card>

                    {images.length > 1 && (
                        <div className="grid grid-cols-5 gap-3">
                            {images.map((image) => (
                                <button
                                    key={`${image.url}-${image.sort_order}`}
                                    type="button"
                                    className={cn(
                                        'aspect-square rounded-lg border bg-[var(--color-surface)] p-2 transition-colors',
                                        selectedImage?.url === image.url
                                            ? 'border-[var(--color-primary)]'
                                            : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'
                                    )}
                                    onClick={() => setSelectedImageUrl(image.url)}
                                >
                                    <img
                                        src={image.url}
                                        alt={image.alt || product.name}
                                        className="h-full w-full object-contain"
                                    />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="space-y-5">
                    <div>
                        <div className="flex flex-wrap gap-2">
                            <Badge>{translate('text.on_sale')}</Badge>
                            {product.brand && (
                                <Badge variant="muted">{product.brand}</Badge>
                            )}
                            {product.sold_count > 0 && (
                                <Badge variant="accent">{translate('text.best_seller')}</Badge>
                            )}
                        </div>

                        <h1 className="mt-3 text-3xl font-semibold leading-tight text-[var(--color-text-main)]">
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

                        <p className="mt-4 text-3xl font-semibold text-[var(--color-primary-hover)]">
                            {formatPriceRange(
                                product.min_price,
                                product.max_price,
                                currency
                            )}
                        </p>

                        {(product.short_description || product.description) && (
                            <p className="mt-4 text-sm leading-6 text-[var(--color-text-muted)]">
                                {product.short_description || product.description}
                            </p>
                        )}
                    </div>

                    <Card>
                        <CardHeader>
                            <h2 className="text-base font-semibold text-[var(--color-text-main)]"> {translate('text.product_variant')} </h2>
                        </CardHeader>
                        <CardBody className="space-y-4">
                            {variants.length === 0 ? (
                                <p className="text-sm text-[var(--color-text-muted)]"> {translate('text.product_has_no_variations_yet')} </p>
                            ) : (
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {variants.map((variant) => (
                                        <button
                                            key={variant.id}
                                            type="button"
                                            className={cn(
                                                'rounded-lg border p-4 text-left transition-colors',
                                                selectedVariant?.id === variant.id
                                                    ? 'border-[var(--color-primary)] bg-[var(--color-secondary)]'
                                                    : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]'
                                            )}
                                            onClick={() =>
                                                setSelectedVariantId(variant.id)
                                            }
                                        >
                                            <p className="font-semibold text-[var(--color-text-main)]">
                                                {variant.size ||
                                                    translate('text.updating_dimension')}
                                            </p>
                                            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                                                {variant.fabric_type ||
                                                    translate('text.material_is_updating')}
                                            </p>
                                            <p className="mt-2 text-sm font-medium text-[var(--color-primary-hover)]">
                                                {formatPriceRange(
                                                    variant.min_price,
                                                    variant.max_price,
                                                    currency
                                                )}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader>
                            <h2 className="text-base font-semibold text-[var(--color-text-main)]"> {translate('text.sales_unit')} </h2>
                        </CardHeader>
                        <CardBody className="space-y-4">
                            {units.length === 0 ? (
                                <p className="text-sm text-[var(--color-text-muted)]"> {translate('text.this_variant_has_no_units_for_sale_yet')} </p>
                            ) : (
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {units.map((unit) => (
                                        <button
                                            key={unit.id}
                                            type="button"
                                            className={cn(
                                                'rounded-lg border p-4 text-left transition-colors',
                                                selectedUnit?.id === unit.id
                                                    ? 'border-[var(--color-primary)] bg-[var(--color-secondary)]'
                                                    : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]'
                                            )}
                                            onClick={() => setSelectedUnitId(unit.id)}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="font-semibold text-[var(--color-text-main)]">
                                                        {unit.display_name}
                                                    </p>
                                                    <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                                                        {formatPackSize(
                                                            unit.pack_size
                                                        )}{' '} {translate('text.package')} </p>
                                                </div>
                                                {unit.is_default && (
                                                    <CheckCircle2 className="h-5 w-5 text-[var(--color-primary)]" />
                                                )}
                                            </div>
                                            <p className="mt-3 text-sm text-[var(--color-text-muted)]"> {translate('text.minimum')} {unit.min_order_qty || 1} {translate('text.package_08ffada9')} {unit.max_order_qty
                                                    ? translate('text.maximum_value_package', { value0: unit.max_order_qty })
                                                    : ''}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </CardBody>
                    </Card>

                    {selectedUnit && (
                        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm font-medium text-[var(--color-text-main)]"> {translate('text.number_of_packages')} </p>
                                    <p className="mt-1 text-sm text-[var(--color-text-muted)]"> {translate('text.minimum')} {minOrderQuantity} {translate('text.package_08ffada9')} {selectedUnit.max_order_qty
                                            ? translate('text.maximum_value_package', { value0: selectedUnit.max_order_qty })
                                            : ''}
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
                                    <span className="flex h-9 min-w-14 items-center justify-center rounded-md border border-[var(--color-border)] px-3 text-sm font-semibold">
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
                        </div>
                    )}

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

                    <div className="grid gap-3 sm:grid-cols-2">
                        <Button
                            fullWidth
                            disabled={!canAddToCart}
                            isLoading={addCartItemMutation.isPending}
                            onClick={handleAddToCart}
                        >
                            <ShoppingCart className="h-4 w-4" /> {translate('text.add_to_cart')} </Button>
                        <Button variant="outline" fullWidth> {translate('text.contact_for_consultation')} </Button>
                    </div>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <h2 className="text-base font-semibold text-[var(--color-text-main)]"> {translate('text.specifications')} </h2>
                </CardHeader>
                <CardBody>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <SpecItem
                            icon={Ruler}
                            label={translate('text.bag_size')}
                            value={selectedVariant?.size}
                        />
                        <SpecItem
                            icon={ShieldCheck}
                            label={translate('text.material')}
                            value={selectedVariant?.fabric_type}
                        />
                        <SpecItem
                            icon={Boxes}
                            label={translate('text.quantity_package')}
                            value={formatPackSize(selectedUnit?.pack_size)}
                        />
                        <SpecItem
                            icon={Layers}
                            label={translate('text.uses')}
                            value={
                                product.short_description ||
                                product.description ||
                                translate('text.updating')
                            }
                        />
                    </div>
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

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-[var(--color-primary)]" />
                        <h2 className="text-base font-semibold text-[var(--color-text-main)]"> {translate('text.price_based_on_quantity')} </h2>
                    </div>
                </CardHeader>
                <CardBody>
                    {priceTiers.length === 0 ? (
                        <p className="text-sm text-[var(--color-text-muted)]"> {translate('text.this_unit_does_not_have_a_price_list_based_on_quantity')} </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                                <thead>
                                    <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
                                        <th className="py-3 pr-4 font-medium"> {translate('text.number_of_packages')} </th>
                                        <th className="py-3 pr-4 font-medium"> {translate('text.selling_price_unit')} </th>
                                        <th className="py-3 pr-4 font-medium"> {translate('text.conversion_price_piece')} </th>
                                        <th className="py-3 font-medium"> {translate('text.specification')} </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {priceTiers.map((tier) => (
                                        <tr
                                            key={`${tier.min_qty}-${tier.max_qty || 'plus'}`}
                                            className="border-b border-[var(--color-border)] last:border-0"
                                        >
                                            <td className="py-3 pr-4 font-medium text-[var(--color-text-main)]">
                                                {formatTierQuantity(tier)}
                                            </td>
                                            <td className="py-3 pr-4 text-[var(--color-primary-hover)]">
                                                {formatCurrency(
                                                    tier.unit_price,
                                                    currency
                                                )}
                                            </td>
                                            <td className="py-3 pr-4 text-[var(--color-text-muted)]">
                                                {getUnitPricePerItem(
                                                    tier,
                                                    selectedUnit?.pack_size,
                                                    currency
                                                ) || translate('text.updating')}
                                            </td>
                                            <td className="py-3 text-[var(--color-text-muted)]">
                                                {selectedUnit?.display_name ||
                                                    translate('text.updating')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
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
