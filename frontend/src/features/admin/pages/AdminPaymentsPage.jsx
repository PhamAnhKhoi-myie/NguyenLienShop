import { translate } from '../../../shared/i18n/index';
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
    { value: '', label: translate('text.all_statuses') },
    { value: 'pending', label: translate('text.pending_e2258693') },
    { value: 'paid', label: translate('text.paid_9e1f1120') },
    { value: 'failed', label: translate('text.failed') },
    { value: 'refund_pending', label: translate('text.refund_pending') },
    { value: 'refunded', label: translate('text.refunded') },
];

const providerOptions = [
    { value: '', label: translate('text.all_providers') },
    { value: 'vnpay', label: translate('text.vnpay') },
    { value: 'payos', label: translate('text.payos') },
    { value: 'paypal', label: translate('text.paypal') },
];

const paymentStatusLabels = {
    pending: translate('text.pending_e2258693'),
    paid: translate('text.paid_9e1f1120'),
    failed: translate('text.failed'),
    refund_pending: translate('text.refund_pending'),
    refunded: translate('text.refunded'),
};

function getPaymentStatusLabel(status) {
    return paymentStatusLabels[status] || status;
}

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

    return {
        ...params,
        ...buildFilterParams(filters),
    };
}

function buildFilterParams(filters) {
    const params = {};

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
                    <p className="text-sm text-[var(--color-text-muted)]"> {translate('text.total_payment')} </p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--color-text-main)]">
                        {getStatCount(stats?.totalPayments)}
                    </p>
                </CardBody>
            </Card>
            <Card>
                <CardBody>
                    <p className="text-sm text-[var(--color-text-muted)]"> {translate('text.paid_revenue')} </p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--color-primary-hover)]">
                        {formatMoney(getRevenue(stats?.totalRevenue))}
                    </p>
                </CardBody>
            </Card>
            <Card>
                <CardBody>
                    <p className="text-sm text-[var(--color-text-muted)]"> {translate('text.error_validation')} </p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--color-warning)]">
                        {failedVerifications}
                    </p>
                </CardBody>
            </Card>
            <Card>
                <CardBody>
                    <p className="text-sm text-[var(--color-text-muted)]"> {translate('text.provider')} </p>
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
                    <p className="text-sm text-[var(--color-text-muted)]"> {translate('text.payment_status_4032b469')} </p>
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
                label={translate('text.status')}
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
                label={translate('text.provider')}
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
                label={translate('text.from_date')}
                type="date"
                value={values.date_from}
                onChange={(event) => onChange('date_from', event.target.value)}
            />
            <Input
                label={translate('text.until_date')}
                type="date"
                value={values.date_to}
                onChange={(event) => onChange('date_to', event.target.value)}
            />
            <div className="flex items-end gap-2">
                <Button type="button" onClick={onApply}>
                    <Filter className="h-4 w-4" /> {translate('text.filter')} </Button>
                <Button type="button" variant="outline" onClick={onReset}> {translate('text.clear_filter')} </Button>
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
            <p className="text-sm text-[var(--color-text-muted)]"> {translate('text.no_provider_data_yet')} </p>
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
                        <StatusBadge
                            value={payment.status}
                            label={getPaymentStatusLabel(payment.status)}
                        />
                        <StatusBadge
                            value={payment.verification_status}
                            label={translate('text.authentication_value', { value0: payment.verification_status })}
                        />
                    </div>
                    <p className="mt-2 text-sm text-[var(--color-text-muted)]"> {translate('text.order')} {payment.order_id}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        isLoading={isVerifying}
                        onClick={onVerify}
                    >
                        <ShieldCheck className="h-4 w-4" /> {translate('text.control_record')} </Button>
                    <Button
                        size="sm"
                        variant="danger"
                        isLoading={isDeleting}
                        onClick={onDelete}
                    >
                        <Trash2 className="h-4 w-4" /> {translate('text.soft_delete')} </Button>
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <h3 className="font-semibold text-[var(--color-text-main)]"> {translate('text.checkout')} </h3>
                    </CardHeader>
                    <CardBody className="space-y-3">
                        <DetailRow label={translate('text.amount')}>
                            {formatMoney(payment.amount)}
                        </DetailRow>
                        <DetailRow label={translate('text.provider')} value={payment.provider} />
                        <DetailRow label={translate('text.transaction_ref')} value={transactionRef} />
                    </CardBody>
                </Card>
                <Card>
                    <CardHeader>
                        <h3 className="font-semibold text-[var(--color-text-main)]"> {translate('text.link')} </h3>
                    </CardHeader>
                    <CardBody className="space-y-3">
                        <DetailRow label={translate('text.order_id')} value={payment.order_id} />
                        <DetailRow label={translate('text.user_id')} value={payment.user_id} />
                        <DetailRow
                            label={translate('text.idempotency')}
                            value={payment.idempotency_key}
                        />
                    </CardBody>
                </Card>
                <Card>
                    <CardHeader>
                        <h3 className="font-semibold text-[var(--color-text-main)]"> {translate('text.time')} </h3>
                    </CardHeader>
                    <CardBody className="space-y-3">
                        <DetailRow label={translate('text.created_at')}>
                            {formatDateTime(payment.created_at)}
                        </DetailRow>
                        <DetailRow label={translate('text.expires')}>
                            {formatDateTime(payment.expires_at) || '-'}
                        </DetailRow>
                        <DetailRow label={translate('text.payment_at')}>
                            {formatDateTime(payment.paid_at) || '-'}
                        </DetailRow>
                        <DetailRow label={translate('text.refund_requested_at')}>
                            {formatDateTime(payment.refund_requested_at) || '-'}
                        </DetailRow>
                        <DetailRow label={translate('text.refunded_at')}>
                            {formatDateTime(payment.refund_completed_at) || '-'}
                        </DetailRow>
                        <DetailRow
                            label={translate('text.refund_reference')}
                            value={payment.refund_reference}
                        />
                    </CardBody>
                </Card>
            </div>

            {payment.failure && (
                <Card>
                    <CardHeader>
                        <h3 className="font-semibold text-[var(--color-error)]"> {translate('text.payment_error')} </h3>
                    </CardHeader>
                    <CardBody className="grid gap-3 md:grid-cols-3">
                        <DetailRow label={translate('text.reason')} value={payment.failure.reason} />
                        <DetailRow label={translate('text.code')} value={payment.failure.code} />
                        <DetailRow label={translate('text.message')} value={payment.failure.message} />
                    </CardBody>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <h3 className="font-semibold text-[var(--color-text-main)]"> {translate('text.provider_data')} </h3>
                </CardHeader>
                <CardBody>
                    <ProviderDataPanel providerData={payment.provider_data} />
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <h3 className="font-semibold text-[var(--color-text-main)]"> {translate('text.webhook')} </h3>
                </CardHeader>
                <CardBody className="grid gap-3 md:grid-cols-3">
                    <DetailRow label={translate('text.webhook_verified')}>
                        {formatDateTime(payment.webhook_verified_at) || '-'}
                    </DetailRow>
                    <DetailRow label={translate('text.raw_ipn')}>
                        {webhookData.raw_ipn_present ? translate('text.yes') : translate('text.no')}
                    </DetailRow>
                    <DetailRow label={translate('text.raw_return')}>
                        {webhookData.raw_return_present ? translate('text.yes') : translate('text.no')}
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
    const statsParams = useMemo(
        () => buildFilterParams(appliedFilters),
        [appliedFilters]
    );
    const paymentsQuery = useAdminList('/payments/admin', queryParams);
    const statsQuery = useAdminDetail('/payments/admin/stats', {
        params: statsParams,
    });
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
            translate('text.payment_reconciliation_record_value', { value0: getPaymentId(paymentDetail) })
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
            translate('text.soft_delete_payment_value', { value0: getPaymentId(paymentDetail) })
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
                    <p className="text-sm font-medium text-[var(--color-primary-hover)]"> {translate('text.admin')} </p>
                    <h1 className="mt-1 text-2xl font-semibold text-[var(--color-text-main)]"> {translate('text.payment_management')} </h1>
                    <p className="mt-2 text-sm text-[var(--color-text-muted)]"> {translate('text.admin_monitors_online_payment_authentication_status_and_webhook_control')} </p>
                </div>
                <Button
                    variant="outline"
                    isLoading={paymentsQuery.isFetching || statsQuery.isFetching}
                    onClick={refreshPayments}
                >
                    <RefreshCw className="h-4 w-4" /> {translate('text.reload')} </Button>
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
                        <Loading label={translate('text.loading_payment')} />
                    ) : paymentsQuery.isError ? (
                        <EmptyState
                            icon={Search}
                            title={translate('text.unable_to_load_payment')}
                            description={paymentsQuery.error.message}
                        />
                    ) : payments.length === 0 ? (
                        <EmptyState
                            icon={WalletCards}
                            title={translate('text.no_payment_yet')}
                            description={translate('text.payment_created_after_online_checkout_will_be_displayed_here')}
                        />
                    ) : (
                        <div className="space-y-4">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
                                    <thead>
                                        <tr className="bg-[var(--color-background)] text-left text-xs font-semibold uppercase text-[var(--color-text-muted)]">
                                            <th className="px-4 py-3">{translate('text.payment_b41a92be')}</th>
                                            <th className="px-4 py-3">{translate('text.order')}</th>
                                            <th className="px-4 py-3">{translate('text.provider')}</th>
                                            <th className="px-4 py-3">{translate('text.amount')}</th>
                                            <th className="px-4 py-3">{translate('text.status')}</th>
                                            <th className="px-4 py-3">{translate('text.validate')}</th>
                                            <th className="px-4 py-3">{translate('text.creation_date')}</th>
                                            <th className="px-4 py-3 text-right">{translate('text.task')}</th>
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
                                                    <StatusBadge
                                                        value={payment.status}
                                                        label={getPaymentStatusLabel(payment.status)}
                                                    />
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
                                                        <Eye className="h-4 w-4" /> {translate('text.details')} </Button>
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
                title={paymentDetail ? `Payment ${getPaymentId(paymentDetail)}` : translate('text.payment_details')}
                onClose={closeDetail}
                panelClassName="max-w-7xl"
            >
                {detailQuery.isLoading ? (
                    <Loading label={translate('text.loading_payment_details')} />
                ) : detailQuery.isError ? (
                    <EmptyState
                        title={translate('text.unable_to_load_payment_details')}
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
