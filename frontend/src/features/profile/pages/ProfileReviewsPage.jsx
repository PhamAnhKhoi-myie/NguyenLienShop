import {
    ExternalLink,
    MessageSquare,
    RefreshCw,
    ShieldCheck,
    Star,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Badge from '../../../shared/components/Badge';
import Button from '../../../shared/components/Button';
import Card, { CardBody, CardHeader } from '../../../shared/components/Card';
import EmptyState from '../../../shared/components/EmptyState';
import Loading from '../../../shared/components/Loading';
import Pagination from '../../../shared/components/Pagination';
import { ROUTES } from '../../../shared/constants/routes';
import { cn } from '../../../shared/utils/cn';
import { useMyReviews } from '../../reviews/hooks/useReviews';
import AccountNav from '../components/AccountNav';

const PAGE_SIZE = 8;

function getReviewRating(review) {
    return Number(review?.rating?.overall || review?.rating || 0);
}

function formatDateTime(value) {
    if (!value) {
        return 'Đang cập nhật';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return 'Đang cập nhật';
    }

    return date.toLocaleString('vi-VN');
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

function ReviewStatusBadge({ review }) {
    if (review.is_approved) {
        return <Badge variant="success">Đã duyệt</Badge>;
    }

    return <Badge variant="warning">Chờ duyệt</Badge>;
}

export default function ProfileReviewsPage() {
    const [page, setPage] = useState(1);
    const queryParams = useMemo(
        () => ({ page, limit: PAGE_SIZE }),
        [page]
    );
    const reviewsQuery = useMyReviews(queryParams);
    const reviews = reviewsQuery.data?.data || [];
    const pagination = reviewsQuery.data?.pagination || {};
    const total = Number(pagination.total || reviews.length);
    const totalPages = Math.max(
        Number(pagination.totalPages || pagination.total_pages) || 1,
        1
    );

    return (
        <div className="space-y-6">
            <AccountNav />

            <Card>
                <CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-xl font-semibold text-[var(--color-text-main)]">
                                Đánh giá của tôi
                            </h1>
                            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                                Xem lại các đánh giá đã gửi sau khi đơn hàng hoàn tất.
                            </p>
                        </div>
                        <Badge variant="muted">{total} đánh giá</Badge>
                    </div>
                </CardHeader>

                <CardBody>
                    {reviewsQuery.isLoading ? (
                        <Loading label="Đang tải đánh giá của bạn..." />
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
                                <RefreshCw className="h-4 w-4" />
                                Tải lại
                            </Button>
                        </div>
                    ) : reviews.length === 0 ? (
                        <EmptyState
                            icon={MessageSquare}
                            title="Bạn chưa có đánh giá"
                            description="Sau khi đơn hàng được giao, bạn có thể đánh giá sản phẩm trong chi tiết đơn hàng."
                            actionLabel="Xem đơn hàng"
                            onAction={() => {
                                window.location.href = ROUTES.ORDERS;
                            }}
                        />
                    ) : (
                        <div className="space-y-4">
                            {reviews.map((review) => (
                                <article
                                    key={review.id}
                                    className="min-w-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
                                >
                                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                        <div className="min-w-0 space-y-3">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <RatingStars
                                                    value={getReviewRating(review)}
                                                />
                                                <ReviewStatusBadge review={review} />
                                                {review.is_verified_purchase && (
                                                    <Badge
                                                        variant="success"
                                                        className="gap-1"
                                                    >
                                                        <ShieldCheck className="h-3 w-3" />
                                                        Đã mua hàng
                                                    </Badge>
                                                )}
                                            </div>

                                            <div>
                                                <h2 className="break-words text-base font-semibold text-[var(--color-text-main)]">
                                                    {review.title ||
                                                        'Đánh giá sản phẩm'}
                                                </h2>
                                                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                                                    {formatDateTime(
                                                        review.created_at
                                                    )}
                                                    {review.edited_at
                                                        ? ` · Đã sửa ${formatDateTime(review.edited_at)}`
                                                        : ''}
                                                </p>
                                            </div>

                                            <p className="whitespace-pre-line break-words text-sm leading-6 text-[var(--color-text-main)]">
                                                {review.content}
                                            </p>

                                            <div className="flex flex-wrap gap-2 text-xs text-[var(--color-text-muted)]">
                                                <span>
                                                    Có ích:{' '}
                                                    {review.helpful_count || 0}
                                                </span>
                                                <span>
                                                    Chưa hữu ích:{' '}
                                                    {review.unhelpful_count || 0}
                                                </span>
                                            </div>
                                        </div>

                                        {review.product_id && (
                                            <Link
                                                to={`${ROUTES.PRODUCTS}/${review.product_id}`}
                                                className="inline-flex h-9 w-full shrink-0 items-center justify-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-medium text-[var(--color-text-main)] transition-colors hover:bg-[var(--color-background)] sm:w-auto"
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                                Xem sản phẩm
                                            </Link>
                                        )}
                                    </div>
                                </article>
                            ))}

                            <Pagination
                                page={pagination.page || page}
                                totalPages={totalPages}
                                onPageChange={setPage}
                            />
                        </div>
                    )}
                </CardBody>
            </Card>
        </div>
    );
}
