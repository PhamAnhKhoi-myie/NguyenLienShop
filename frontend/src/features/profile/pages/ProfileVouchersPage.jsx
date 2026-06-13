import { getLocale, translate } from '../../../shared/i18n/index';
import { RefreshCw, ShoppingCart, TicketPercent } from 'lucide-react';
import { Link } from 'react-router-dom';

import Badge from '../../../shared/components/Badge';
import Button from '../../../shared/components/Button';
import Card, { CardBody, CardHeader } from '../../../shared/components/Card';
import EmptyState from '../../../shared/components/EmptyState';
import Loading from '../../../shared/components/Loading';
import { ROUTES } from '../../../shared/constants/routes';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { useClaimedDiscounts } from '../../discounts/hooks/useHomepageDiscounts';
import AccountNav from '../components/AccountNav';

const statusLabels = {
    available: translate('text.can_use'),
    claimed: translate('text.received'),
    used: translate('text.used'),
    expired: translate('text.expires'),
    revoked: translate('text.revoked'),
};

function getBadgeVariant(status) {
    if (status === 'available') {
        return 'success';
    }

    if (status === 'used') {
        return 'muted';
    }

    if (status === 'expired' || status === 'revoked') {
        return 'error';
    }

    return 'primary';
}

function formatDate(value) {
    if (!value) {
        return '-';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '-';
    }

    return date.toLocaleDateString(getLocale());
}

function formatVoucherValue(claim) {
    const discount = claim.discount || {};

    if (discount.type === 'percent') {
        return `${discount.value}%`;
    }

    if (discount.type === 'fixed') {
        return formatCurrency(discount.value || 0);
    }

    return '-';
}

export default function ProfileVouchersPage() {
    const vouchersQuery = useClaimedDiscounts({
        status: 'all',
        limit: 100,
    });
    const vouchers = vouchersQuery.data?.data || [];
    const availableCount = vouchers.filter((voucher) => voucher.is_available).length;

    return (
        <div className="space-y-6">
            <AccountNav />

            <Card>
                <CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-xl font-semibold text-[var(--color-text-main)]"> {translate('text.my_voucher')} </h1>
                            <p className="mt-1 text-sm text-[var(--color-text-muted)]"> {translate('text.received_vouchers_will_be_here_for_you_to_quickly_select_when_checking_o')} </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="success">{availableCount} {translate('text.can_use_9c9bbc29')}</Badge>
                            <Button
                                variant="outline"
                                size="sm"
                                isLoading={vouchersQuery.isFetching}
                                onClick={() => vouchersQuery.refetch()}
                            >
                                <RefreshCw className="h-4 w-4" /> {translate('text.reload')} </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardBody>
                    {vouchersQuery.isLoading ? (
                        <Loading label={translate('text.loading_your_voucher')} />
                    ) : vouchersQuery.isError ? (
                        <div className="flex flex-col gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-[var(--color-error)]">
                                {vouchersQuery.error.message}
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => vouchersQuery.refetch()}
                            >
                                <RefreshCw className="h-4 w-4" /> {translate('text.reload')} </Button>
                        </div>
                    ) : vouchers.length === 0 ? (
                        <EmptyState
                            icon={TicketPercent}
                            title={translate('text.you_don_t_have_a_voucher_yet')}
                            description={translate('text.when_receiving_a_voucher_on_the_home_page_the_voucher_will_appear_in_thi')}
                            actionLabel={translate('text.back_to_home_page')}
                            onAction={() => {
                                window.location.href = ROUTES.HOME;
                            }}
                        />
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {vouchers.map((voucher) => {
                                const status = voucher.effective_status || voucher.status;

                                return (
                                    <article
                                        key={voucher.claim_id || voucher.id}
                                        className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="truncate text-lg font-semibold text-[var(--color-text-main)]">
                                                    {voucher.code}
                                                </p>
                                                <p className="mt-1 text-sm text-[var(--color-text-muted)]"> {translate('text.reduce')} {formatVoucherValue(voucher)}
                                                </p>
                                            </div>
                                            <Badge variant={getBadgeVariant(status)}>
                                                {statusLabels[status] || status}
                                            </Badge>
                                        </div>

                                        <div className="mt-4 space-y-2 text-sm text-[var(--color-text-muted)]">
                                            <div className="flex justify-between gap-3">
                                                <span>{translate('text.minimum_order')}</span>
                                                <span className="font-medium text-[var(--color-text-main)]">
                                                    {formatCurrency(voucher.discount?.min_order_value || 0)}
                                                </span>
                                            </div>
                                            {voucher.discount?.max_discount_amount ? (
                                                <div className="flex justify-between gap-3">
                                                    <span>{translate('text.maximum')}</span>
                                                    <span className="font-medium text-[var(--color-text-main)]">
                                                        {formatCurrency(voucher.discount.max_discount_amount)}
                                                    </span>
                                                </div>
                                            ) : null}
                                            <div className="flex justify-between gap-3">
                                                <span>{translate('text.still_using')}</span>
                                                <span className="font-medium text-[var(--color-text-main)]">
                                                    {voucher.remaining_user_uses || 0}
                                                </span>
                                            </div>
                                            <div className="flex justify-between gap-3">
                                                <span>{translate('text.expiry_date')}</span>
                                                <span className="font-medium text-[var(--color-text-main)]">
                                                    {formatDate(voucher.discount?.expiry_date)}
                                                </span>
                                            </div>
                                        </div>

                                        {voucher.is_available && (
                                            <Link
                                                to={ROUTES.CHECKOUT}
                                                className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[var(--color-primary)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)]"
                                            >
                                                <ShoppingCart className="h-4 w-4" /> {translate('text.used_when_checking_out')} </Link>
                                        )}
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </CardBody>
            </Card>
        </div>
    );
}
