import { getLocale, translate } from '../../../shared/i18n/index';
import {
    CheckCircle2,
    ExternalLink,
    Flag,
    MessageSquare,
    RefreshCw,
    ShieldCheck,
    Star,
    XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Badge from '../../../shared/components/Badge';
import Button from '../../../shared/components/Button';
import Card, { CardBody, CardHeader } from '../../../shared/components/Card';
import EmptyState from '../../../shared/components/EmptyState';
import Loading from '../../../shared/components/Loading';
import Modal from '../../../shared/components/Modal';
import Pagination from '../../../shared/components/Pagination';
import Textarea from '../../../shared/components/Textarea';
import { ROUTES } from '../../../shared/constants/routes';
import { cn } from '../../../shared/utils/cn';
import {
    useAdminFlaggedReviews,
    useAdminPendingReviews,
    useApproveReview,
    useRejectReview,
} from '../../reviews/hooks/useReviews';

const PAGE_SIZE = 20;

const tabs = [
    {
        key: 'pending',
        label: translate('text.waiting_for_approval'),
        icon: MessageSquare,
    },
    {
        key: 'flagged',
        label: translate('text.reported'),
        icon: Flag,
    },
];

const flagReasonLabels = {
    spam: translate('text.spam_or_advertising'),
    inappropriate: translate('text.inappropriate_content'),
    fake: translate('text.fake_review'),
    duplicate: translate('text.duplicate_review'),
    other: translate('text.other_reasons'),
};

function getRating(review) {
    return Number(review?.rating?.overall || review?.rating || 0);
}

function getTotalPages(pagination = {}) {
    return Math.max(
        Number(pagination.totalPages || pagination.total_pages) || 1,
        1
    );
}

function formatDateTime(value) {
    if (!value) {
        return '-';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '-';
    }

    return date.toLocaleString(getLocale());
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

function ReviewMeta({ label, value }) {
    return (
        <div className="min-w-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3">
            <p className="text-xs font-medium uppercase text-[var(--color-text-muted)]">
                {label}
            </p>
            <p className="mt-1 break-words text-sm font-medium text-[var(--color-text-main)]">
                {value || '-'}
            </p>
        </div>
    );
}

function ReviewBadges({ review }) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            {review.is_approved ? (
                <Badge variant="success">{translate('text.approved')}</Badge>
            ) : review.rejected_at ? (
                <Badge variant="error">{translate('text.rejected')}</Badge>
            ) : (
                <Badge variant="warning">{translate('text.waiting_for_approval')}</Badge>
            )}
            {review.is_verified_purchase && (
                <Badge variant="success" className="gap-1">
                    <ShieldCheck className="h-3 w-3" /> {translate('text.purchased')} </Badge>
            )}
            {review.is_flagged && (
                <Badge variant="error" className="gap-1">
                    <Flag className="h-3 w-3" />
                    {flagReasonLabels[review.flag_reason] ||
                        review.flag_reason ||
                        translate('text.reported')}
                </Badge>
            )}
        </div>
    );
}

function ReviewCard({
    review,
    onApprove,
    onReject,
    isApproving,
    isRejecting,
}) {
    return (
        <article className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1 space-y-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-3">
                                <RatingStars value={getRating(review)} />
                                <ReviewBadges review={review} />
                            </div>
                            <h2 className="break-words text-base font-semibold text-[var(--color-text-main)]">
                                {review.title || translate('text.product_review')}
                            </h2>
                        </div>
                        <p className="shrink-0 text-sm text-[var(--color-text-muted)]">
                            {formatDateTime(review.created_at)}
                        </p>
                    </div>

                    <p className="whitespace-pre-line break-words text-sm leading-6 text-[var(--color-text-main)]">
                        {review.content}
                    </p>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <ReviewMeta label={translate('text.user')} value={review.user_id} />
                        <ReviewMeta label={translate('text.product')} value={review.product_id} />
                        <ReviewMeta label={translate('text.variant_cc91b1ea')} value={review.variant_id} />
                        <ReviewMeta
                            label={translate('text.interaction')}
                            value={translate('text.useful_value_not_yet_useful_value', { value0: review.helpful_count || 0, value1: review.unhelpful_count || 0 })}
                        />
                    </div>

                    {(review.rejection_reason || review.rejected_at) && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-[var(--color-error)]">
                            <p className="font-medium">{translate('text.reason_for_rejection')}</p>
                            <p className="mt-1">
                                {review.rejection_reason || '-'}
                            </p>
                        </div>
                    )}
                </div>

                <div className="grid shrink-0 gap-2 sm:flex sm:flex-wrap xl:w-44 xl:flex-col">
                    {review.product_id && (
                        <Link
                            to={`${ROUTES.PRODUCTS}/${review.product_id}`}
                            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-medium text-[var(--color-text-main)] transition-colors hover:bg-[var(--color-background)] sm:w-auto xl:w-full"
                        >
                            <ExternalLink className="h-4 w-4" /> {translate('text.product')} </Link>
                    )}
                    <Button
                        className="w-full sm:w-auto xl:w-full"
                        size="sm"
                        variant="outline"
                        isLoading={isApproving}
                        disabled={isRejecting}
                        onClick={() => onApprove(review)}
                    >
                        <CheckCircle2 className="h-4 w-4" /> {translate('text.browse')} </Button>
                    <Button
                        className="w-full sm:w-auto xl:w-full"
                        size="sm"
                        variant="danger"
                        isLoading={isRejecting}
                        disabled={isApproving}
                        onClick={() => onReject(review)}
                    >
                        <XCircle className="h-4 w-4" /> {translate('text.reject')} </Button>
                </div>
            </div>
        </article>
    );
}

export default function AdminReviewsPage() {
    const [activeTab, setActiveTab] = useState('pending');
    const [page, setPage] = useState(1);
    const [rejectingReview, setRejectingReview] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const params = useMemo(() => ({ page, limit: PAGE_SIZE }), [page]);
    const pendingQuery = useAdminPendingReviews(params, {
        enabled: activeTab === 'pending',
    });
    const flaggedQuery = useAdminFlaggedReviews(params, {
        enabled: activeTab === 'flagged',
    });
    const approveReviewMutation = useApproveReview();
    const rejectReviewMutation = useRejectReview();
    const activeQuery = activeTab === 'pending' ? pendingQuery : flaggedQuery;
    const reviews = activeQuery.data?.data || [];
    const pagination = activeQuery.data?.pagination || {};
    const total = Number(pagination.total || reviews.length);
    const totalPages = getTotalPages(pagination);

    const handleTabChange = (nextTab) => {
        setActiveTab(nextTab);
        setPage(1);
    };

    const handleRefresh = () => {
        activeQuery.refetch();
    };

    const handleApprove = async (review) => {
        try {
            await approveReviewMutation.mutateAsync(review.id);
        } catch {
            return;
        }
    };

    const openRejectModal = (review) => {
        setRejectingReview(review);
        setRejectReason('');
        rejectReviewMutation.reset();
    };

    const closeRejectModal = () => {
        setRejectingReview(null);
        setRejectReason('');
        rejectReviewMutation.reset();
    };

    const handleReject = async () => {
        if (!rejectingReview?.id || rejectReason.trim().length < 5) {
            return;
        }

        try {
            await rejectReviewMutation.mutateAsync({
                reviewId: rejectingReview.id,
                reason: rejectReason.trim(),
            });
            closeRejectModal();
        } catch {
            return;
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div>
                            <h1 className="text-xl font-semibold text-[var(--color-text-main)]"> {translate('text.browse_reviews')} </h1>
                            <p className="mt-1 text-sm text-[var(--color-text-muted)]"> {translate('text.moderate_new_reviews_and_reviews_reported_by_customers')} </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;

                                return (
                                    <Button
                                        key={tab.key}
                                        variant={
                                            activeTab === tab.key
                                                ? 'primary'
                                                : 'outline'
                                        }
                                        onClick={() => handleTabChange(tab.key)}
                                    >
                                        <Icon className="h-4 w-4" />
                                        {tab.label}
                                    </Button>
                                );
                            })}
                            <Button
                                variant="outline"
                                isLoading={activeQuery.isFetching}
                                onClick={handleRefresh}
                            >
                                <RefreshCw className="h-4 w-4" /> {translate('text.refresh')} </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardBody className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="muted">{total} {translate('text.reviews')}</Badge>
                        <Badge variant={activeTab === 'pending' ? 'warning' : 'error'}>
                            {tabs.find((tab) => tab.key === activeTab)?.label}
                        </Badge>
                    </div>

                    {approveReviewMutation.isError && (
                        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--color-error)]">
                            {approveReviewMutation.error.message}
                        </p>
                    )}

                    {activeQuery.isLoading ? (
                        <Loading label={translate('text.loading_review')} />
                    ) : activeQuery.isError ? (
                        <div className="flex flex-col gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-[var(--color-error)]">
                                {activeQuery.error.message}
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRefresh}
                            >
                                <RefreshCw className="h-4 w-4" /> {translate('text.reload')} </Button>
                        </div>
                    ) : reviews.length === 0 ? (
                        <EmptyState
                            icon={activeTab === 'pending' ? MessageSquare : Flag}
                            title={
                                activeTab === 'pending'
                                    ? translate('text.no_reviews_pending')
                                    : translate('text.no_reviews_reported')
                            }
                            description={translate('text.the_list_will_automatically_update_when_there_are_reviews_that_need_to_b')}
                        />
                    ) : (
                        <div className="space-y-4">
                            {reviews.map((review) => (
                                <ReviewCard
                                    key={review.id}
                                    review={review}
                                    isApproving={
                                        approveReviewMutation.isPending
                                    }
                                    isRejecting={rejectReviewMutation.isPending}
                                    onApprove={handleApprove}
                                    onReject={openRejectModal}
                                />
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

            <Modal
                open={Boolean(rejectingReview)}
                title={translate('text.refuse_to_rate')}
                onClose={closeRejectModal}
                panelClassName="max-w-3xl"
                footer={
                    <>
                        <Button variant="outline" onClick={closeRejectModal}> {translate('text.close')} </Button>
                        <Button
                            variant="danger"
                            disabled={rejectReason.trim().length < 5}
                            isLoading={rejectReviewMutation.isPending}
                            onClick={handleReject}
                        > {translate('text.reject')} </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <p className="text-sm text-[var(--color-text-muted)]"> {translate('text.enter_the_reason_for_rejection_to_save_in_the_moderation_record')} </p>
                    <Textarea
                        label={translate('text.reason')}
                        rows={5}
                        value={rejectReason}
                        onChange={(event) => setRejectReason(event.target.value)}
                    />
                    {rejectReviewMutation.isError && (
                        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--color-error)]">
                            {rejectReviewMutation.error.message}
                        </p>
                    )}
                </div>
            </Modal>
        </div>
    );
}
