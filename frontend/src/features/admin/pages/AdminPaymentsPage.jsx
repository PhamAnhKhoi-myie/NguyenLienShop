import {
    Eye,
    Filter,
    RefreshCw,
    Search,
    ShieldCheck,
    Trash2,
    WalletCards,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import Button from '../../../shared/components/Button';
import Card, { CardBody, CardHeader } from '../../../shared/components/Card';
import EmptyState from '../../../shared/components/EmptyState';
import Input from '../../../shared/components/Input';
import Loading from '../../../shared/components/Loading';
import Modal from '../../../shared/components/Modal';
import Pagination from '../../../shared/components/Pagination';
import Select from '../../../shared/components/Select';
import {
    useAdminDetail,
    useAdminList,
    useAdminMutation,
} from '../hooks/useAdminResource';
import {
    formatDateTime,
    formatMoney,
    StatusBadge,
} from '../utils/adminFormat';

const paymentStatusOptions = [
    { value: '', label: 'Tất cả trạng thái' },
    { value: 'pending', label: 'pending' },
    { value: 'paid', label: 'paid' },
    { value: 'failed', label: 'failed' },
];

const providerOptions = [
    { value: '', label: 'Tất cả provider' },
    { value: 'vnpay', label: 'vnpay' },
];

function getPaymentId(payment) {
    return payment?.id || payment?._id;
}

function getRows(response) {
    return Array.isArray(response?.data) ? response.data : [];
}

function getPages(pagination = {}) {
    return pagination.totalPages || pagination.pages || pagination.total_pages || 1;
}

function getStatCount(items = []) {
    return Array.isArray(items) && items[0]?.count ? items[0].count : 0;
}

function getRevenue(items = []) {
    return Array.isArray(items) && items[0]?.total ? items[0].total : 0;
}

function buildPaymentParams({ page, filters }) {
    const params = {
        page,
        limit: 20,
    };

    Object.entries(filters).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
            params[key] = value;
        }
    });

    return params;
}

function DetailRow({ label, value, children }) {
    return (
        <div className="flex flex-col gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            <span className="text-xs font-medium uppercase text-[var(--color-text-muted)]">
                {label}
            </span>
            <span className="break-words text-sm font-medium text-[var(--color-text-main)]">
                {children || value || '-'}
            </span>
        </div>
    );
}

function StatsPanel({ stats }) {
    const statusItems = stats?.statusBreakdown || [];
    const providerItems = stats?.providerBreakdown || [];
    const failedVerifications = getStatCount(stats?.failedVerifications);

    return (
        <div className="grid gap-4 lg:grid-cols-4">
            <Card>
                <CardBody>
                    <p className="text-sm text-[var(--color-text-muted)]">
                        Tổng payment
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--color-text-main)]">
                        {getStatCount(stats?.totalPayments)}
                    </p>
                </CardBody>
            </Card>
            <Card>
                <CardBody>
                    <p className="text-sm text-[var(--color-text-muted)]">
                        Doanh thu đã thanh toán
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--color-primary-hover)]">
                        {formatMoney(getRevenue(stats?.totalRevenue))}
                    </p>
                </CardBody>
            </Card>
            <Card>
                <CardBody>
                    <p className="text-sm text-[var(--color-text-muted)]">
                        Xác thực lỗi
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--color-warning)]">
                        {failedVerifications}
                    </p>
                </CardBody>
            </Card>
            <Card>
                <CardBody>
                    <p className="text-sm text-[var(--color-text-muted)]">
                        Provider
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {providerItems.length ? (
                            providerItems.map((item) => (
                                <StatusBadge
                                    key={item._id}
                                    value={item._id}
                                    label={`${item._id}: ${item.count}`}
                                />
                            ))
                        ) : (
                            <span className="text-sm text-[var(--color-text-muted)]">
                                -
                            </span>
                        )}
                    </div>
                </CardBody>
            </Card>
            <Card className="lg:col-span-4">
                <CardBody>
                    <p className="text-sm text-[var(--color-text-muted)]">
                        Trạng thái thanh toán
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {statusItems.length ? (
                            statusItems.map((item) => (
                                <StatusBadge
                                    key={item._id}
                                    value={item._id}
                                    label={`${item._id}: ${item.count}`}
                                />
                            ))
                        ) : (
                            <span className="text-sm text-[var(--color-text-muted)]">
                                -
                            </span>
                        )}
                    </div>
                </CardBody>
            </Card>
        </div>
    );
}

function PaymentFilters({
    values,
    onChange,
    onApply,
    onReset,
}) {
    return (
        <div className="grid gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4 lg:grid-cols-5">
            <Select
                label="Trạng thái"
                value={values.status}
                onChange={(event) => onChange('status', event.target.value)}
            >
                {paymentStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </Select>
            <Select
                label="Provider"
                value={values.provider}
                onChange={(event) => onChange('provider', event.target.value)}
            >
                {providerOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </Select>
            <Input
                label="Từ ngày"
                type="date"
                value={values.date_from}
                onChange={(event) => onChange('date_from', event.target.value)}
            />
            <Input
                label="Đến ngày"
                type="date"
                value={values.date_to}
                onChange={(event) => onChange('date_to', event.target.value)}
            />
            <div className="flex items-end gap-2">
                <Button type="button" onClick={onApply}>
                    <Filter className="h-4 w-4" />
                    Lọc
                </Button>
                <Button type="button" variant="outline" onClick={onReset}>
                    Xóa lọc
                </Button>
            </div>
        </div>
    );
}

function ProviderDataPanel({ providerData }) {
    const entries = Object.entries(providerData || {}).filter(
        ([, value]) => value !== null && value !== undefined && value !== ''
    );

    if (!entries.length) {
        return (
            <p className="text-sm text-[var(--color-text-muted)]">
                Chưa có dữ liệu provider.
            </p>
        );
    }

    return (
        <div className="grid gap-3 md:grid-cols-2">
            {entries.map(([key, value]) => (
                <DetailRow key={key} label={key} value={String(value)} />
            ))}
        </div>
    );
}

function PaymentDetailPanel({
    payment,
    onVerify,
    onDelete,
    isVerifying,
    isDeleting,
}) {
    const webhookData = payment.webhook_data || {};
    const transactionRef =
        payment.transaction_ref ||
        payment.provider_data?.vnp_txn_ref ||
        payment.provider_data?.vnp_transaction_no;

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="break-all text-xl font-semibold text-[var(--color-text-main)]">
                            {getPaymentId(payment)}
                        </h2>
                        <StatusBadge value={payment.status} />
                        <StatusBadge
                            value={payment.verification_status}
                            label={`Xác thực: ${payment.verification_status}`}
                        />
                    </div>
                    <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                        Order {payment.order_id}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        isLoading={isVerifying}
                        onClick={onVerify}
                    >
                        <ShieldCheck className="h-4 w-4" />
                        Ghi nhận đối soát
                    </Button>
                    <Button
                        size="sm"
                        variant="danger"
                        isLoading={isDeleting}
                        onClick={onDelete}
                    >
                        <Trash2 className="h-4 w-4" />
                        Xóa mềm
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <h3 className="font-semibold text-[var(--color-text-main)]">
                            Thanh toán
                        </h3>
                    </CardHeader>
                    <CardBody className="space-y-3">
                        <DetailRow label="Số tiền">
                            {formatMoney(payment.amount)}
                        </DetailRow>
                        <DetailRow label="Provider" value={payment.provider} />
                        <DetailRow label="Transaction ref" value={transactionRef} />
                    </CardBody>
                </Card>
                <Card>
                    <CardHeader>
                        <h3 className="font-semibold text-[var(--color-text-main)]">
                            Liên kết
                        </h3>
                    </CardHeader>
                    <CardBody className="space-y-3">
                        <DetailRow label="Order ID" value={payment.order_id} />
                        <DetailRow label="User ID" value={payment.user_id} />
                        <DetailRow
                            label="Idempotency"
                            value={payment.idempotency_key}
                        />
                    </CardBody>
                </Card>
                <Card>
                    <CardHeader>
                        <h3 className="font-semibold text-[var(--color-text-main)]">
                            Thời gian
                        </h3>
                    </CardHeader>
                    <CardBody className="space-y-3">
                        <DetailRow label="Tạo lúc">
                            {formatDateTime(payment.created_at)}
                        </DetailRow>
                        <DetailRow label="Hết hạn">
                            {formatDateTime(payment.expires_at) || '-'}
                        </DetailRow>
                        <DetailRow label="Thanh toán lúc">
                            {formatDateTime(payment.paid_at) || '-'}
                        </DetailRow>
                    </CardBody>
                </Card>
            </div>

            {payment.failure && (
                <Card>
                    <CardHeader>
                        <h3 className="font-semibold text-[var(--color-error)]">
                            Lỗi thanh toán
                        </h3>
                    </CardHeader>
                    <CardBody className="grid gap-3 md:grid-cols-3">
                        <DetailRow label="Reason" value={payment.failure.reason} />
                        <DetailRow label="Code" value={payment.failure.code} />
                        <DetailRow label="Message" value={payment.failure.message} />
                    </CardBody>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <h3 className="font-semibold text-[var(--color-text-main)]">
                        Provider data
                    </h3>
                </CardHeader>
                <CardBody>
                    <ProviderDataPanel providerData={payment.provider_data} />
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <h3 className="font-semibold text-[var(--color-text-main)]">
                        Webhook
                    </h3>
                </CardHeader>
                <CardBody className="grid gap-3 md:grid-cols-3">
                    <DetailRow label="Webhook verified">
                        {formatDateTime(payment.webhook_verified_at) || '-'}
                    </DetailRow>
                    <DetailRow label="Raw IPN">
                        {webhookData.raw_ipn_present ? 'Có' : 'Không'}
                    </DetailRow>
                    <DetailRow label="Raw return">
                        {webhookData.raw_return_present ? 'Có' : 'Không'}
                    </DetailRow>
                </CardBody>
            </Card>
        </div>
    );
}

export default function AdminPaymentsPage() {
    const [page, setPage] = useState(1);
    const [draftFilters, setDraftFilters] = useState({
        status: '',
        provider: '',
        date_from: '',
        date_to: '',
    });
    const [appliedFilters, setAppliedFilters] = useState(draftFilters);
    const [selectedPayment, setSelectedPayment] = useState(null);
    const queryParams = useMemo(
        () => buildPaymentParams({ page, filters: appliedFilters }),
        [appliedFilters, page]
    );
    const paymentsQuery = useAdminList('/payments/admin', queryParams);
    const statsQuery = useAdminDetail('/payments/admin/stats');
    const detailEndpoint = selectedPayment
        ? `/payments/${getPaymentId(selectedPayment)}`
        : null;
    const detailQuery = useAdminDetail(detailEndpoint, {
        enabled: Boolean(detailEndpoint),
    });
    const verifyMutation = useAdminMutation({ method: 'post' });
    const deleteMutation = useAdminMutation({ method: 'delete' });
    const payments = getRows(paymentsQuery.data);
    const pagination = paymentsQuery.data?.pagination || {};
    const totalPages = getPages(pagination);
    const paymentDetail = detailQuery.data?.data || selectedPayment;

    const handleFilterChange = (name, value) => {
        setDraftFilters((current) => ({
            ...current,
            [name]: value,
        }));
    };

    const handleApplyFilters = () => {
        setAppliedFilters(draftFilters);
        setPage(1);
    };

    const handleResetFilters = () => {
        const nextFilters = {
            status: '',
            provider: '',
            date_from: '',
            date_to: '',
        };

        setDraftFilters(nextFilters);
        setAppliedFilters(nextFilters);
        setPage(1);
    };

    const refreshPayments = async () => {
        await paymentsQuery.refetch();
        await statsQuery.refetch();

        if (detailEndpoint) {
            await detailQuery.refetch();
        }
    };

    const openDetail = (payment) => {
        setSelectedPayment(payment);
    };

    const closeDetail = () => {
        setSelectedPayment(null);
        verifyMutation.reset();
        deleteMutation.reset();
    };

    const handleVerify = async () => {
        if (!paymentDetail) {
            return;
        }

        const confirmed = window.confirm(
            `Ghi nhận đối soát payment ${getPaymentId(paymentDetail)}?`
        );

        if (!confirmed) {
            return;
        }

        await verifyMutation.mutateAsync({
            endpoint: `/payments/admin/${getPaymentId(paymentDetail)}/verify`,
        });
        await refreshPayments();
    };

    const handleDelete = async () => {
        if (!paymentDetail) {
            return;
        }

        const confirmed = window.confirm(
            `Xóa mềm payment ${getPaymentId(paymentDetail)}?`
        );

        if (!confirmed) {
            return;
        }

        await deleteMutation.mutateAsync({
            endpoint: `/payments/admin/${getPaymentId(paymentDetail)}`,
        });
        closeDetail();
        await refreshPayments();
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <p className="text-sm font-medium text-[var(--color-primary-hover)]">
                        Admin
                    </p>
                    <h1 className="mt-1 text-2xl font-semibold text-[var(--color-text-main)]">
                        Quản lý thanh toán
                    </h1>
                    <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                        ADMIN theo dõi payment VNPAY, trạng thái xác thực và đối soát webhook.
                    </p>
                </div>
                <Button
                    variant="outline"
                    isLoading={paymentsQuery.isFetching || statsQuery.isFetching}
                    onClick={refreshPayments}
                >
                    <RefreshCw className="h-4 w-4" />
                    Tải lại
                </Button>
            </div>

            <StatsPanel stats={statsQuery.data?.data} />

            <Card>
                <CardHeader>
                    <PaymentFilters
                        values={draftFilters}
                        onChange={handleFilterChange}
                        onApply={handleApplyFilters}
                        onReset={handleResetFilters}
                    />
                </CardHeader>
                <CardBody>
                    {paymentsQuery.isLoading ? (
                        <Loading label="Đang tải thanh toán..." />
                    ) : paymentsQuery.isError ? (
                        <EmptyState
                            icon={Search}
                            title="Không tải được thanh toán"
                            description={paymentsQuery.error.message}
                        />
                    ) : payments.length === 0 ? (
                        <EmptyState
                            icon={WalletCards}
                            title="Chưa có thanh toán"
                            description="Payment tạo sau checkout VNPAY sẽ hiển thị tại đây."
                        />
                    ) : (
                        <div className="space-y-4">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
                                    <thead>
                                        <tr className="bg-[var(--color-background)] text-left text-xs font-semibold uppercase text-[var(--color-text-muted)]">
                                            <th className="px-4 py-3">Payment</th>
                                            <th className="px-4 py-3">Order</th>
                                            <th className="px-4 py-3">Provider</th>
                                            <th className="px-4 py-3">Số tiền</th>
                                            <th className="px-4 py-3">Trạng thái</th>
                                            <th className="px-4 py-3">Xác thực</th>
                                            <th className="px-4 py-3">Ngày tạo</th>
                                            <th className="px-4 py-3 text-right">Tác vụ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-surface)]">
                                        {payments.map((payment) => (
                                            <tr key={getPaymentId(payment)}>
                                                <td className="max-w-56 break-all px-4 py-3 font-medium text-[var(--color-text-main)]">
                                                    {getPaymentId(payment)}
                                                </td>
                                                <td className="max-w-56 break-all px-4 py-3 text-[var(--color-text-main)]">
                                                    {payment.order_id}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <StatusBadge
                                                        value={payment.provider}
                                                        label={payment.provider}
                                                    />
                                                </td>
                                                <td className="px-4 py-3 font-medium text-[var(--color-text-main)]">
                                                    {formatMoney(payment.amount)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <StatusBadge value={payment.status} />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <StatusBadge
                                                        value={payment.verification_status}
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-[var(--color-text-main)]">
                                                    {formatDateTime(payment.created_at)}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => openDetail(payment)}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                        Chi tiết
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

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
                open={Boolean(selectedPayment)}
                title={paymentDetail ? `Payment ${getPaymentId(paymentDetail)}` : 'Chi tiết payment'}
                onClose={closeDetail}
                panelClassName="max-w-6xl"
            >
                {detailQuery.isLoading ? (
                    <Loading label="Đang tải chi tiết thanh toán..." />
                ) : detailQuery.isError ? (
                    <EmptyState
                        title="Không tải được chi tiết thanh toán"
                        description={detailQuery.error.message}
                    />
                ) : (
                    <div className="space-y-4">
                        <PaymentDetailPanel
                            payment={paymentDetail}
                            isVerifying={verifyMutation.isPending}
                            isDeleting={deleteMutation.isPending}
                            onVerify={handleVerify}
                            onDelete={handleDelete}
                        />

                        {verifyMutation.isError && (
                            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--color-error)]">
                                {verifyMutation.error.message}
                            </p>
                        )}

                        {deleteMutation.isError && (
                            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--color-error)]">
                                {deleteMutation.error.message}
                            </p>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
}
