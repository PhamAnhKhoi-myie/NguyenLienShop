import { getLocale, translate } from '../../../shared/i18n/index';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, PackageCheck, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
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
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import AccountNav from '../../profile/components/AccountNav';
import { useCancelOrder, useOrders } from '../hooks/useOrders';
import { cancelOrderSchema } from '../schemas/orderFormSchemas';

const orderStatusOptions = [
    { value: '', label: translate('text.all') },
    { value: 'PENDING', label: translate('text.pending') },
    { value: 'PAID', label: translate('text.paid') },
    { value: 'PROCESSING', label: translate('text.preparing') },
    { value: 'SHIPPED', label: translate('text.delivering') },
    { value: 'DELIVERED', label: translate('text.delivered') },
    { value: 'CANCELED', label: translate('text.canceled') },
    { value: 'FAILED', label: translate('text.failure') },
];

const statusLabels = {
    PENDING: translate('text.pending'),
    PAID: translate('text.paid'),
    PROCESSING: translate('text.preparing'),
    SHIPPED: translate('text.delivering'),
    DELIVERED: translate('text.delivered'),
    CANCELED: translate('text.canceled'),
    FAILED: translate('text.failure'),
};

function getStatusVariant(status) {
    if (status === 'DELIVERED' || status === 'PAID') {
        return 'success';
    }

    if (status === 'CANCELED' || status === 'FAILED') {
        return 'error';
    }

    if (status === 'PENDING' || status === 'PROCESSING' || status === 'SHIPPED') {
        return 'warning';
    }

    return 'muted';
}

function canCancelOrder(status) {
    return ['PENDING', 'PAID'].includes(status);
}

function formatDateTime(value) {
    if (!value) {
        return '';
    }

    return new Date(value).toLocaleString(getLocale());
}

export default function OrderListPage() {
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState('');
    const [cancelOrder, setCancelOrder] = useState(null);
    const cancelOrderMutation = useCancelOrder();
    const {
        register,
        control,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(cancelOrderSchema),
        defaultValues: {
            reason: '',
        },
    });
    const cancelReason = useWatch({ control, name: 'reason' }) || '';
    const queryParams = useMemo(
        () => ({
            page,
            limit: 8,
            ...(status ? { status } : {}),
        }),
        [page, status]
    );
    const ordersQuery = useOrders(queryParams);
    const orders = ordersQuery.data?.data || [];
    const pagination = ordersQuery.data?.pagination || {};

    const handleStatusChange = (nextStatus) => {
        setStatus(nextStatus);
        setPage(1);
    };

    const openCancelModal = (order) => {
        setCancelOrder(order);
        reset({ reason: '' });
    };

    const closeCancelModal = () => {
        setCancelOrder(null);
        reset({ reason: '' });
    };

    const handleCancelOrder = handleSubmit(async (values) => {
        if (!cancelOrder?.id) {
            return;
        }

        await cancelOrderMutation.mutateAsync({
            orderId: cancelOrder.id,
            payload: { reason: values.reason.trim() },
        });
        closeCancelModal();
    });

    return (
        <div className="space-y-6">
            <AccountNav />

            <Card>
                <CardHeader>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h1 className="text-xl font-semibold text-[var(--color-text-main)]"> {translate('text.my_order')} </h1>
                            <p className="mt-1 text-sm text-[var(--color-text-muted)]"> {translate('text.track_status_cancel_orders_and_evaluate_products_after_receiving_goods')} </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {orderStatusOptions.map((option) => (
                                <Button
                                    key={option.value}
                                    size="sm"
                                    variant={
                                        status === option.value
                                            ? 'primary'
                                            : 'outline'
                                    }
                                    onClick={() => handleStatusChange(option.value)}
                                >
                                    {option.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                </CardHeader>

                <CardBody>
                    {ordersQuery.isLoading ? (
                        <Loading label={translate('text.loading_orders')} />
                    ) : orders.length === 0 ? (
                        <EmptyState
                            icon={PackageCheck}
                            title={translate('text.no_orders_yet')}
                            description={translate('text.created_orders_will_be_displayed_here')}
                            actionLabel={translate('text.buy_product')}
                            onAction={() => {
                                window.location.href = ROUTES.PRODUCTS;
                            }}
                        />
                    ) : (
                        <div className="space-y-4">
                            {orders.map((order) => (
                                <div
                                    key={order.id}
                                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
                                >
                                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h2 className="font-semibold text-[var(--color-text-main)]">
                                                    {order.order_code}
                                                </h2>
                                                <Badge
                                                    variant={getStatusVariant(
                                                        order.status
                                                    )}
                                                >
                                                    {statusLabels[order.status] ||
                                                        order.status}
                                                </Badge>
                                                {order.payment_status && (
                                                    <Badge
                                                        variant={getStatusVariant(
                                                            order.payment_status
                                                        )}
                                                    >
                                                        {order.payment_status}
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                                                {formatDateTime(order.created_at)}
                                            </p>
                                            <p className="mt-2 text-sm text-[var(--color-text-main)]">
                                                {order.item_count || 0} {translate('text.product_line')} {order.total_items || 0} {translate('text.product_4e46ed68')} </p>
                                        </div>

                                        <div className="flex flex-col gap-3 md:items-end">
                                            <p className="text-lg font-semibold text-[var(--color-primary-hover)]">
                                                {formatCurrency(order.total_amount || 0)}
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                <Link
                                                    to={`${ROUTES.ORDERS}/${order.id}`}
                                                    className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-medium text-[var(--color-text-main)] transition-colors hover:bg-[var(--color-background)]"
                                                >
                                                    <Eye className="h-4 w-4" /> {translate('text.details')} </Link>
                                                {canCancelOrder(order.status) && (
                                                    <Button
                                                        variant="danger"
                                                        size="sm"
                                                        onClick={() =>
                                                            openCancelModal(order)
                                                        }
                                                    >
                                                        <XCircle className="h-4 w-4" /> {translate('text.cancel_order')} </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <Pagination
                                page={pagination.page || page}
                                totalPages={pagination.total_pages || 1}
                                onPageChange={setPage}
                            />
                        </div>
                    )}
                </CardBody>
            </Card>

            <Modal
                open={Boolean(cancelOrder)}
                title={translate('text.cancel_order_c90e1488')}
                onClose={closeCancelModal}
                footer={
                    <>
                        <Button variant="outline" onClick={closeCancelModal}> {translate('text.close')} </Button>
                        <Button
                            variant="danger"
                            disabled={!cancelReason.trim()}
                            isLoading={cancelOrderMutation.isPending}
                            onClick={handleCancelOrder}
                        > {translate('text.cancel_order')} </Button>
                    </>
                }
            >
                <div className="space-y-3">
                    <p className="text-sm text-[var(--color-text-muted)]"> {translate('text.enter_reason_for_cancellation')} {cancelOrder?.order_code}.
                    </p>
                    <Textarea
                        rows={4}
                        placeholder={translate('text.for_example_want_to_change_shipping_address')}
                        error={errors.reason?.message}
                        {...register('reason')}
                    />
                    {cancelOrderMutation.isError && (
                        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--color-error)]">
                            {cancelOrderMutation.error.message}
                        </p>
                    )}
                </div>
            </Modal>
        </div>
    );
}
