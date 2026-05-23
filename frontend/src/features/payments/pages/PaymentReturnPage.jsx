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
        title: 'Đã nhận kết quả VNPAY',
        description:
            'FE đã nhận redirect từ VNPAY và đang đối chiếu lại trạng thái đơn hàng với BE.',
        iconClass: 'bg-green-100 text-green-700',
    },
    failed: {
        icon: XCircle,
        title: 'Thanh toán VNPAY thất bại',
        description:
            'Giao dịch chưa hoàn tất. Bạn có thể kiểm tra lại đơn hàng hoặc thử thanh toán lại nếu BE cho phép.',
        iconClass: 'bg-red-100 text-red-700',
    },
    invalid: {
        icon: AlertTriangle,
        title: 'Không xác thực được kết quả thanh toán',
        description:
            'Return URL thiếu dữ liệu hoặc chữ ký không hợp lệ. Vui lòng kiểm tra lại trạng thái đơn hàng.',
        iconClass: 'bg-amber-100 text-amber-700',
    },
    pending: {
        icon: Clock3,
        title: 'Đang chờ BE xác nhận',
        description:
            'VNPAY đã trả kết quả, nhưng trạng thái payment/order vẫn cần được refetch từ BE.',
        iconClass: 'bg-amber-100 text-amber-700',
    },
};

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

    return new Date(value).toLocaleString('vi-VN');
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
    const code = searchParams.get('code');
    const returnStatus = searchParams.get('status') || 'invalid';
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
                <ArrowLeft className="h-4 w-4" />
                Quay lại đơn hàng
            </Link>

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
                            <Loading label="Đang kiểm tra trạng thái thanh toán..." />
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
                            <RefreshCw className="h-4 w-4" />
                            Kiểm tra lại
                        </Button>

                        {payment?.can_retry && (
                            <Button
                                type="button"
                                isLoading={retryPaymentMutation.isPending}
                                onClick={handleRetryPayment}
                            >
                                Thanh toán lại
                            </Button>
                        )}

                        <Link
                            to={ROUTES.PRODUCTS}
                            className="inline-flex h-10 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-medium text-[var(--color-text-main)] transition-colors hover:bg-[var(--color-background)]"
                        >
                            Tiếp tục mua hàng
                        </Link>
                    </div>
                </CardBody>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <h2 className="font-semibold text-[var(--color-text-main)]">
                            Thông tin thanh toán
                        </h2>
                    </CardHeader>
                    <CardBody>
                        <InfoRow label="Mã giao dịch VNPAY" value={txnRef} />
                        <InfoRow label="Mã payment" value={payment?.id || paymentId} />
                        <InfoRow label="Provider" value={payment?.provider_label || payment?.provider || 'VNPAY'} />
                        <InfoRow
                            label="Trạng thái payment"
                            value={
                                payment?.status ? (
                                    <Badge variant={getBadgeVariant(payment.status)}>
                                        {payment.status_label || payment.status}
                                    </Badge>
                                ) : null
                            }
                        />
                        <InfoRow
                            label="Số tiền"
                            value={
                                payment?.amount !== undefined
                                    ? formatCurrency(payment.amount)
                                    : null
                            }
                        />
                        <InfoRow label="Mã phản hồi" value={code} />
                        <InfoRow label="Tạo lúc" value={formatDateTime(payment?.created_at)} />
                        <InfoRow label="Thanh toán lúc" value={formatDateTime(payment?.paid_at)} />
                        {paymentError && (
                            <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                                {paymentError}
                            </p>
                        )}
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader>
                        <h2 className="font-semibold text-[var(--color-text-main)]">
                            Thông tin đơn hàng
                        </h2>
                    </CardHeader>
                    <CardBody>
                        <InfoRow label="Mã đơn" value={order?.order_code} />
                        <InfoRow label="Mã order" value={order?.id || orderId} />
                        <InfoRow
                            label="Trạng thái đơn"
                            value={
                                order?.status ? (
                                    <Badge variant={getBadgeVariant(order.status)}>
                                        {order.status}
                                    </Badge>
                                ) : null
                            }
                        />
                        <InfoRow
                            label="Trạng thái thanh toán"
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
                            label="Tổng đơn"
                            value={
                                order?.pricing?.total_amount !== undefined
                                    ? formatCurrency(order.pricing.total_amount)
                                    : null
                            }
                        />
                        <InfoRow label="Ngày tạo" value={formatDateTime(order?.created_at)} />
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
