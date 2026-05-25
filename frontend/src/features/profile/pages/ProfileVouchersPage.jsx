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
    available: 'Có thể dùng',
    claimed: 'Đã nhận',
    used: 'Đã dùng',
    expired: 'Hết hạn',
    revoked: 'Đã thu hồi',
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

    return date.toLocaleDateString('vi-VN');
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
                            <h1 className="text-xl font-semibold text-[var(--color-text-main)]">
                                Voucher của tôi
                            </h1>
                            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                                Các voucher đã nhận sẽ nằm ở đây để bạn chọn nhanh khi checkout.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="success">{availableCount} có thể dùng</Badge>
                            <Button
                                variant="outline"
                                size="sm"
                                isLoading={vouchersQuery.isFetching}
                                onClick={() => vouchersQuery.refetch()}
                            >
                                <RefreshCw className="h-4 w-4" />
                                Tải lại
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardBody>
                    {vouchersQuery.isLoading ? (
                        <Loading label="Đang tải voucher của bạn..." />
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
                                <RefreshCw className="h-4 w-4" />
                                Tải lại
                            </Button>
                        </div>
                    ) : vouchers.length === 0 ? (
                        <EmptyState
                            icon={TicketPercent}
                            title="Bạn chưa có voucher"
                            description="Khi nhận voucher ở trang chủ, voucher sẽ xuất hiện trong danh sách này."
                            actionLabel="Về trang chủ"
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
                                                <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                                                    Giảm {formatVoucherValue(voucher)}
                                                </p>
                                            </div>
                                            <Badge variant={getBadgeVariant(status)}>
                                                {statusLabels[status] || status}
                                            </Badge>
                                        </div>

                                        <div className="mt-4 space-y-2 text-sm text-[var(--color-text-muted)]">
                                            <div className="flex justify-between gap-3">
                                                <span>Đơn tối thiểu</span>
                                                <span className="font-medium text-[var(--color-text-main)]">
                                                    {formatCurrency(voucher.discount?.min_order_value || 0)}
                                                </span>
                                            </div>
                                            {voucher.discount?.max_discount_amount ? (
                                                <div className="flex justify-between gap-3">
                                                    <span>Tối đa</span>
                                                    <span className="font-medium text-[var(--color-text-main)]">
                                                        {formatCurrency(voucher.discount.max_discount_amount)}
                                                    </span>
                                                </div>
                                            ) : null}
                                            <div className="flex justify-between gap-3">
                                                <span>Còn lượt dùng</span>
                                                <span className="font-medium text-[var(--color-text-main)]">
                                                    {voucher.remaining_user_uses || 0}
                                                </span>
                                            </div>
                                            <div className="flex justify-between gap-3">
                                                <span>Hạn dùng</span>
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
                                                <ShoppingCart className="h-4 w-4" />
                                                Dùng khi checkout
                                            </Link>
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
