import { getLocale, translate } from '../../../shared/i18n/index';
import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    Clock3,
    RefreshCw,
    XCircle,
} from 'lucide-react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import Badge from '../../../shared/components/Badge';
import Button from '../../../shared/components/Button';
import Card, { CardBody, CardHeader } from '../../../shared/components/Card';
import Loading from '../../../shared/components/Loading';
import { ROUTES } from '../../../shared/constants/routes';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { useOrder } from '../../orders/hooks/useOrders';
import {
    usePayment,
    usePaymentByOrder,
    useRetryPayment,
} from '../hooks/usePayments';

const statusConfig = {
    success: {
        icon: CheckCircle2,
        title: translate('text.payment_results_received'),
        description:
            translate('text.payment_provider_returned_the_result_and_the_order_status_is_being_checked'),
        iconClass: 'bg-green-100 text-green-700',
    },
    failed: {
        icon: XCircle,
        title: translate('text.payment_failed'),
        description:
            translate('text.transaction_not_completed_you_can_check_your_order_again_or_try_payment_'),
        iconClass: 'bg-red-100 text-red-700',
    },
    invalid: {
        icon: AlertTriangle,
        title: translate('text.unable_to_authenticate_payment_results'),
        description:
            translate('text.return_url_missing_data_or_invalid_signature_please_check_your_order_sta'),
        iconClass: 'bg-amber-100 text-amber-700',
    },
    pending: {
        icon: Clock3,
        title: translate('text.waiting_for_be_to_confirm'),
        description:
            translate('text.payment_provider_returned_the_result_but_the_payment_order_status_still_needs_to_be_refetched'),
        iconClass: 'bg-amber-100 text-amber-700',
    },
};

function normalizeReturnStatus({ provider, rawStatus, cancel, code }) {
    if (provider !== 'payos') {
        return rawStatus || 'invalid';
    }

    if (['success', 'failed', 'invalid', 'pending'].includes(rawStatus)) {
        return rawStatus;
    }

    if (cancel === 'true' || rawStatus === 'CANCELLED') {
        return 'failed';
    }

    if (rawStatus === 'PAID') {
        return 'success';
    }

    if (['PENDING', 'PROCESSING'].includes(rawStatus)) {
        return 'pending';
    }

    if (code && code !== '00') {
        return 'invalid';
    }

    return 'pending';
}

function getBadgeVariant(status) {
    if (['paid', 'PAID'].includes(status)) {
        return 'success';
    }

    if (['failed', 'FAILED', 'CANCELED'].includes(status)) {
        return 'error';
    }

    if (['pending', 'PENDING'].includes(status)) {
        return 'warning';
    }

    return 'muted';
}

function formatDateTime(value) {
    if (!value) {
        return null;
    }

    return new Date(value).toLocaleString(getLocale());
}

function InfoRow({ label, value }) {
    if (!value && value !== 0) {
        return null;
    }

    return (
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] py-3 last:border-b-0">
            <span className="text-sm text-[var(--color-text-muted)]">
                {label}
            </span>
            <span className="max-w-[65%] text-right text-sm font-medium text-[var(--color-text-main)]">
                {value}
            </span>
        </div>
    );
}

export default function PaymentReturnPage() {
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const orderId = searchParams.get('order_id');
    const paymentId = searchParams.get('payment_id');
    const txnRef = searchParams.get('txn_ref');
    const paymentLinkId = searchParams.get('id');
    const provider = searchParams.get('provider') ||
        (searchParams.has('orderCode') || searchParams.has('cancel') ? 'payos' : 'vnpay');
    const providerOrderCode = searchParams.get('orderCode');
    const code = searchParams.get('code');
    const returnStatus = normalizeReturnStatus({
        provider,
        rawStatus: searchParams.get('status'),
        cancel: searchParams.get('cancel'),
        code,
    });
    const stateMessage = location.state?.message;

    const orderQuery = useOrder(orderId, {
        enabled: Boolean(orderId),
    });
    const paymentQuery = usePayment(paymentId, {
        enabled: Boolean(paymentId),
    });
    const paymentByOrderQuery = usePaymentByOrder(orderId, {
        enabled: Boolean(orderId) && !paymentId,
    });
    const retryPaymentMutation = useRetryPayment();

    const activePaymentQuery = paymentId ? paymentQuery : paymentByOrderQuery;
    const order = orderQuery.data?.data;
    const payment = activePaymentQuery.data?.data;
    const isPaid =
        payment?.status === 'paid' || order?.payment?.status === 'PAID';
    const isFailed =
        returnStatus === 'failed' ||
        payment?.status === 'failed' ||
        order?.payment?.status === 'FAILED';
    const viewStatus =
        returnStatus === 'success' && !isPaid
            ? 'pending'
            : returnStatus === 'success'
                ? 'success'
                : isFailed
                    ? 'failed'
                    : 'invalid';
    const config = statusConfig[viewStatus] || statusConfig.invalid;
    const Icon = config.icon;
    const isLoading = orderQuery.isLoading || activePaymentQuery.isLoading;
    const paymentError = activePaymentQuery.error?.message;
    const orderError = orderQuery.error?.message;
    const providerFallbackLabel = provider === 'payos' ? 'PayOS' : 'VNPAY';
    const providerTransactionRef = txnRef || paymentLinkId || providerOrderCode;

    const handleRefetch = () => {
        if (orderId) {
            orderQuery.refetch();
        }

        if (paymentId || orderId) {
            activePaymentQuery.refetch();
        }
    };

    const handleRetryPayment = async () => {
        if (!payment?.id) {
            return;
        }

        const response = await retryPaymentMutation.mutateAsync(payment.id);
        const paymentUrl =
            response.data?.paymentUrl ||
            response.data?.payment_url ||
            response.data?.redirectUrl ||
            response.data?.redirect_url;

        if (paymentUrl) {
            window.location.assign(paymentUrl);
        }
    };

    return (
        <div className="space-y-6">
            <Link
                to={ROUTES.ORDERS}
                className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-primary-hover)] hover:text-[var(--color-primary)]"
            >
                <ArrowLeft className="h-4 w-4" /> {translate('text.return_to_order')} </Link>

            <Card>
                <CardBody className="mx-auto max-w-3xl py-10 text-center">
                    <div
                        className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${config.iconClass}`}
                    >
                        <Icon className="h-7 w-7" />
                    </div>

                    <h1 className="mt-5 text-2xl font-semibold text-[var(--color-text-main)]">
                        {config.title}
                    </h1>
                    <p className="mx-auto mt-3 max-w-xl text-sm text-[var(--color-text-muted)]">
                        {stateMessage || config.description}
                    </p>

                    {isLoading && (
                        <div className="mt-6">
                            <Loading label={translate('text.checking_payment_status')} />
                        </div>
                    )}

                    <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleRefetch}
                            isLoading={
                                orderQuery.isFetching ||
                                activePaymentQuery.isFetching
                            }
                        >
                            <RefreshCw className="h-4 w-4" /> {translate('text.check_again')} </Button>

                        {payment?.can_retry && (
                            <Button
                                type="button"
                                isLoading={retryPaymentMutation.isPending}
                                onClick={handleRetryPayment}
                            > {translate('text.repayment')} </Button>
                        )}

                        <Link
                            to={ROUTES.PRODUCTS}
                            className="inline-flex h-10 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-medium text-[var(--color-text-main)] transition-colors hover:bg-[var(--color-background)]"
                        > {translate('text.continue_shopping')} </Link>
                    </div>
                </CardBody>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <h2 className="font-semibold text-[var(--color-text-main)]"> {translate('text.payment_information')} </h2>
                    </CardHeader>
                    <CardBody>
                        <InfoRow label={translate('text.provider_transaction_reference')} value={providerTransactionRef} />
                        <InfoRow label={translate('text.payos_order_code')} value={provider === 'payos' ? providerOrderCode : null} />
                        <InfoRow label={translate('text.payment_code')} value={payment?.id || paymentId} />
                        <InfoRow label={translate('text.provider')} value={payment?.provider_label || payment?.provider || providerFallbackLabel} />
                        <InfoRow
                            label={translate('text.payment_status')}
                            value={
                                payment?.status ? (
                                    <Badge variant={getBadgeVariant(payment.status)}>
                                        {payment.status_label || payment.status}
                                    </Badge>
                                ) : null
                            }
                        />
                        <InfoRow
                            label={translate('text.amount')}
                            value={
                                payment?.amount !== undefined
                                    ? formatCurrency(payment.amount)
                                    : null
                            }
                        />
                        <InfoRow label={translate('text.response_code')} value={code} />
                        <InfoRow label={translate('text.created_at')} value={formatDateTime(payment?.created_at)} />
                        <InfoRow label={translate('text.payment_at')} value={formatDateTime(payment?.paid_at)} />
                        {paymentError && (
                            <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                                {paymentError}
                            </p>
                        )}
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader>
                        <h2 className="font-semibold text-[var(--color-text-main)]"> {translate('text.order_information')} </h2>
                    </CardHeader>
                    <CardBody>
                        <InfoRow label={translate('text.item_code')} value={order?.order_code} />
                        <InfoRow label={translate('text.order_code')} value={order?.id || orderId} />
                        <InfoRow
                            label={translate('text.single_status')}
                            value={
                                order?.status ? (
                                    <Badge variant={getBadgeVariant(order.status)}>
                                        {order.status}
                                    </Badge>
                                ) : null
                            }
                        />
                        <InfoRow
                            label={translate('text.payment_status_4032b469')}
                            value={
                                order?.payment?.status ? (
                                    <Badge
                                        variant={getBadgeVariant(
                                            order.payment.status
                                        )}
                                    >
                                        {order.payment.status}
                                    </Badge>
                                ) : null
                            }
                        />
                        <InfoRow
                            label={translate('text.order_total')}
                            value={
                                order?.pricing?.total_amount !== undefined
                                    ? formatCurrency(order.pricing.total_amount)
                                    : null
                            }
                        />
                        <InfoRow label={translate('text.creation_date')} value={formatDateTime(order?.created_at)} />
                        {orderError && (
                            <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                                {orderError}
                            </p>
                        )}
                    </CardBody>
                </Card>
            </div>
        </div>
    );
}
