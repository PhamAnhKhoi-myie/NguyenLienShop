import { translate } from '../../../shared/i18n/index';
import {
    CheckCircle2,
    ClipboardEdit,
    Eye,
    Filter,
    PackageCheck,
    RefreshCw,
    Search,
    Truck,
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
import AdminResourceForm from '../components/AdminResourceForm';
import {
    useAdminDetail,
    useAdminList,
    useAdminMutation,
} from '../hooks/useAdminResource';
import {
    createFulfillmentFormConfig,
    orderNotesFormConfig,
    orderStatusFormConfig,
    orderStatusOptions,
    paymentStatusOptions,
    shipmentFormConfig,
} from '../resources/adminOrderForms';
import {
    formatDateTime,
    formatMoney,
    StatusBadge,
} from '../utils/adminFormat';

const actionTitles = {
    status: translate('text.status_update'),
    notes: translate('text.internal_notes'),
    fulfill: translate('text.fulfill_product'),
    shipment: translate('text.create_bill_of_lading'),
};

function getOrderId(order) {
    return order?.id || order?._id;
}

function getRows(response) {
    return Array.isArray(response?.data) ? response.data : [];
}

function getPages(pagination = {}) {
    return pagination.pages || pagination.total_pages || pagination.totalPages || 1;
}

function formatAddress(address = {}) {
    return (
        address.full_address ||
        [
            address.detail,
            address.ward_name,
            address.province_name,
            address.street,
            address.district,
            address.city,
            address.postal_code,
        ]
            .filter(Boolean)
            .join(', ')
    );
}

function getStatTotal(items = []) {
    return Array.isArray(items) && items[0]?.count ? items[0].count : 0;
}

function getRevenue(stats = {}) {
    return Array.isArray(stats.totalRevenue) && stats.totalRevenue[0]?.total
        ? stats.totalRevenue[0].total
        : 0;
}

function getPendingItemCount(order = {}) {
    return (order.items || []).filter(
        (item) =>
            Number(item.quantity_fulfilled || 0) <
            Number(item.quantity_ordered || 0)
    ).length;
}

function buildOrderParams({ page, filters }) {
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

function StatsPanel({ stats }) {
    const statusItems = stats?.statusBreakdown || [];

    return (
        <div className="grid gap-4 md:grid-cols-3">
            <Card>
                <CardBody>
                    <p className="text-sm text-[var(--color-text-muted)]"> {translate('text.order_total')} </p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--color-text-main)]">
                        {getStatTotal(stats?.totalOrders)}
                    </p>
                </CardBody>
            </Card>
            <Card>
                <CardBody>
                    <p className="text-sm text-[var(--color-text-muted)]"> {translate('text.total_revenue')} </p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--color-primary-hover)]">
                        {formatMoney(getRevenue(stats))}
                    </p>
                </CardBody>
            </Card>
            <Card>
                <CardBody>
                    <p className="text-sm text-[var(--color-text-muted)]"> {translate('text.status')} </p>
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

function OrderFilters({
    values,
    onChange,
    onApply,
    onReset,
}) {
    return (
        <div className="grid gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4 lg:grid-cols-5">
            <Select
                label={translate('text.single_status')}
                value={values.status}
                onChange={(event) => onChange('status', event.target.value)}
            >
                {orderStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </Select>
            <Select
                label={translate('text.checkout')}
                value={values.payment_status}
                onChange={(event) =>
                    onChange('payment_status', event.target.value)
                }
            >
                {paymentStatusOptions.map((option) => (
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

function OrderItemsTable({ order, onOpenFulfill }) {
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
                <thead>
                    <tr className="bg-[var(--color-background)] text-left text-xs font-semibold uppercase text-[var(--color-text-muted)]">
                        <th className="px-4 py-3">{translate('text.product')}</th>
                        <th className="px-4 py-3">{translate('text.sku')}</th>
                        <th className="px-4 py-3">{translate('text.set')}</th>
                        <th className="px-4 py-3">{translate('text.fulfilled')}</th>
                        <th className="px-4 py-3">{translate('text.amount_7d7d7f4e')}</th>
                        {order.status === 'PROCESSING' && (
                            <th className="px-4 py-3 text-right">{translate('text.task')}</th>
                        )}
                    </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-surface)]">
                    {(order.items || []).map((item) => {
                        const remaining =
                            Number(item.quantity_ordered || 0) -
                            Number(item.quantity_fulfilled || 0);

                        return (
                            <tr key={item.id}>
                                <td className="px-4 py-3 align-top">
                                    <p className="font-medium text-[var(--color-text-main)]">
                                        {item.product_name}
                                    </p>
                                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                                        {item.variant_label} · {item.unit_label} · {item.pack_size} {translate('text.bag_package')} </p>
                                </td>
                                <td className="px-4 py-3 align-top text-[var(--color-text-main)]">
                                    {item.sku}
                                </td>
                                <td className="px-4 py-3 align-top text-[var(--color-text-main)]">
                                    {item.quantity_ordered}
                                </td>
                                <td className="px-4 py-3 align-top text-[var(--color-text-main)]">
                                    {item.quantity_fulfilled || 0}
                                </td>
                                <td className="px-4 py-3 align-top text-[var(--color-text-main)]">
                                    {formatMoney(item.line_total)}
                                </td>
                                {order.status === 'PROCESSING' && (
                                    <td className="px-4 py-3 text-right align-top">
                                        {remaining > 0 && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={onOpenFulfill}
                                            >
                                                <PackageCheck className="h-4 w-4" /> {translate('text.fulfill')} </Button>
                                        )}
                                    </td>
                                )}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function OrderDetailPanel({
    order,
    onOpenAction,
    onConfirmDelivery,
    isDelivering,
}) {
    const canFulfill =
        order.status === 'PROCESSING' && getPendingItemCount(order) > 0;
    const canRecordShipment = order.status === 'PROCESSING';
    const canDeliver = order.status === 'SHIPPED';

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-semibold text-[var(--color-text-main)]">
                            {order.order_code}
                        </h2>
                        <StatusBadge value={order.status} />
                        <StatusBadge
                            value={order.payment?.status}
                            label={translate('text.payment_value', { value0: order.payment?.status })}
                        />
                    </div>
                    <p className="mt-2 text-sm text-[var(--color-text-muted)]"> {translate('text.created_at')} {formatDateTime(order.created_at)}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onOpenAction('status')}
                    >
                        <ClipboardEdit className="h-4 w-4" /> {translate('text.status')} </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onOpenAction('notes')}
                    >
                        <ClipboardEdit className="h-4 w-4" /> {translate('text.note')} </Button>
                    {canFulfill && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onOpenAction('fulfill')}
                        >
                            <PackageCheck className="h-4 w-4" /> {translate('text.fulfill')} </Button>
                    )}
                    {canRecordShipment && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onOpenAction('shipment')}
                        >
                            <Truck className="h-4 w-4" /> {translate('text.bill_of_lading')} </Button>
                    )}
                    {canDeliver && (
                        <Button
                            size="sm"
                            isLoading={isDelivering}
                            onClick={onConfirmDelivery}
                        >
                            <CheckCircle2 className="h-4 w-4" /> {translate('text.delivered')} </Button>
                    )}
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <h3 className="font-semibold text-[var(--color-text-main)]"> {translate('text.recipient')} </h3>
                    </CardHeader>
                    <CardBody className="space-y-2 text-sm">
                        <p className="font-medium text-[var(--color-text-main)]">
                            {order.customer?.full_name ||
                                order.address_snapshot?.receiver_name ||
                                order.address_snapshot?.recipient_name ||
                                '-'}
                        </p>
                        <p className="text-[var(--color-text-muted)]">
                            {order.customer?.email || '-'}
                        </p>
                        <p className="text-[var(--color-text-muted)]">
                            {order.customer?.phone ||
                                order.address_snapshot?.phone ||
                                '-'}
                        </p>
                        <p className="text-[var(--color-text-main)]">
                            {formatAddress(order.address_snapshot) || '-'}
                        </p>
                    </CardBody>
                </Card>
                <Card>
                    <CardHeader>
                        <h3 className="font-semibold text-[var(--color-text-main)]"> {translate('text.checkout')} </h3>
                    </CardHeader>
                    <CardBody className="space-y-2 text-sm">
                        <div className="flex justify-between gap-3">
                            <span className="text-[var(--color-text-muted)]"> {translate('text.method')} </span>
                            <span className="font-medium text-[var(--color-text-main)]">
                                {order.payment?.method || '-'}
                            </span>
                        </div>
                        <div className="flex justify-between gap-3">
                            <span className="text-[var(--color-text-muted)]"> {translate('text.total_amount')} </span>
                            <span className="font-semibold text-[var(--color-primary-hover)]">
                                {formatMoney(order.pricing?.total_amount || 0)}
                            </span>
                        </div>
                        <div className="flex justify-between gap-3">
                            <span className="text-[var(--color-text-muted)]"> {translate('text.discount')} </span>
                            <span className="font-medium text-[var(--color-text-main)]">
                                {formatMoney(order.pricing?.discount_amount || 0)}
                            </span>
                        </div>
                    </CardBody>
                </Card>
                <Card>
                    <CardHeader>
                        <h3 className="font-semibold text-[var(--color-text-main)]"> {translate('text.shipping')} </h3>
                    </CardHeader>
                    <CardBody className="space-y-2 text-sm">
                        <p className="text-[var(--color-text-main)]">
                            {order.shipment?.carrier || '-'}
                        </p>
                        <p className="font-medium text-[var(--color-text-main)]">
                            {order.shipment?.tracking_code || '-'}
                        </p>
                        <p className="text-[var(--color-text-muted)]">
                            {order.shipment?.shipped_at
                                ? formatDateTime(order.shipment.shipped_at)
                                : translate('text.not_yet_delivered')}
                        </p>
                    </CardBody>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <h3 className="font-semibold text-[var(--color-text-main)]"> {translate('text.product')} </h3>
                </CardHeader>
                <CardBody>
                    <OrderItemsTable
                        order={order}
                        onOpenFulfill={() => onOpenAction('fulfill')}
                    />
                </CardBody>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <h3 className="font-semibold text-[var(--color-text-main)]"> {translate('text.note')} </h3>
                    </CardHeader>
                    <CardBody className="space-y-4 text-sm">
                        <div>
                            <p className="font-medium text-[var(--color-text-main)]"> {translate('text.customer')} </p>
                            <p className="mt-1 text-[var(--color-text-muted)]">
                                {order.customer_notes || '-'}
                            </p>
                        </div>
                        <div>
                            <p className="font-medium text-[var(--color-text-main)]"> {translate('text.internal')} </p>
                            <p className="mt-1 text-[var(--color-text-muted)]">
                                {order.admin_notes || '-'}
                            </p>
                        </div>
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader>
                        <h3 className="font-semibold text-[var(--color-text-main)]"> {translate('text.status_history')} </h3>
                    </CardHeader>
                    <CardBody>
                        <div className="space-y-3">
                            {(order.status_history || []).map((record) => (
                                <div
                                    key={`${record.to}-${record.changed_at}`}
                                    className="rounded-lg border border-[var(--color-border)] p-3"
                                >
                                    <div className="flex flex-wrap items-center gap-2">
                                        <StatusBadge value={record.to} />
                                        <span className="text-sm text-[var(--color-text-muted)]">
                                            {formatDateTime(record.changed_at)}
                                        </span>
                                    </div>
                                    {record.note && (
                                        <p className="mt-2 text-sm text-[var(--color-text-main)]">
                                            {record.note}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardBody>
                </Card>
            </div>
        </div>
    );
}

export default function AdminOrdersPage() {
    const [page, setPage] = useState(1);
    const [draftFilters, setDraftFilters] = useState({
        status: '',
        payment_status: '',
        date_from: '',
        date_to: '',
    });
    const [appliedFilters, setAppliedFilters] = useState(draftFilters);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [actionType, setActionType] = useState(null);
    const queryParams = useMemo(
        () => buildOrderParams({ page, filters: appliedFilters }),
        [appliedFilters, page]
    );
    const statsParams = useMemo(
        () => buildFilterParams(appliedFilters),
        [appliedFilters]
    );
    const ordersQuery = useAdminList('/orders/admin/orders', queryParams);
    const statsQuery = useAdminDetail('/orders/admin/orders/stats', {
        params: statsParams,
    });
    const detailEndpoint = selectedOrder
        ? `/orders/admin/orders/${getOrderId(selectedOrder)}`
        : null;
    const detailQuery = useAdminDetail(detailEndpoint, {
        enabled: Boolean(detailEndpoint),
    });
    const statusMutation = useAdminMutation({ method: 'patch' });
    const notesMutation = useAdminMutation({ method: 'patch' });
    const fulfillMutation = useAdminMutation({ method: 'post' });
    const shipmentMutation = useAdminMutation({ method: 'post' });
    const deliverMutation = useAdminMutation({ method: 'post' });
    const orders = getRows(ordersQuery.data);
    const pagination = ordersQuery.data?.pagination || {};
    const totalPages = getPages(pagination);
    const orderDetail = detailQuery.data?.data || selectedOrder;
    const fulfillmentFormConfig = useMemo(
        () => createFulfillmentFormConfig(orderDetail || {}),
        [orderDetail]
    );
    const actionForm = useMemo(() => {
        if (actionType === 'status') {
            return orderStatusFormConfig;
        }

        if (actionType === 'notes') {
            return orderNotesFormConfig;
        }

        if (actionType === 'fulfill') {
            return fulfillmentFormConfig;
        }

        if (actionType === 'shipment') {
            return shipmentFormConfig;
        }

        return null;
    }, [actionType, fulfillmentFormConfig]);
    const actionMutation =
        actionType === 'status'
            ? statusMutation
            : actionType === 'notes'
              ? notesMutation
              : actionType === 'fulfill'
                ? fulfillMutation
                : shipmentMutation;

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
            payment_status: '',
            date_from: '',
            date_to: '',
        };

        setDraftFilters(nextFilters);
        setAppliedFilters(nextFilters);
        setPage(1);
    };

    const refreshOrders = async () => {
        await ordersQuery.refetch();
        await statsQuery.refetch();

        if (detailEndpoint) {
            await detailQuery.refetch();
        }
    };

    const resetActionMutations = () => {
        statusMutation.reset();
        notesMutation.reset();
        fulfillMutation.reset();
        shipmentMutation.reset();
    };

    const openDetail = (order) => {
        setSelectedOrder(order);
        setActionType(null);
    };

    const closeDetail = () => {
        setSelectedOrder(null);
        setActionType(null);
    };

    const openAction = (type) => {
        resetActionMutations();
        setActionType(type);
    };

    const closeAction = () => {
        setActionType(null);
    };

    const handleSubmitAction = async (values) => {
        if (!actionForm || !orderDetail) {
            return;
        }

        const orderId = getOrderId(orderDetail);
        const payload = actionForm.toPayload(values, {
            mode: 'edit',
            initialData: orderDetail,
        });

        if (actionType === 'status') {
            await statusMutation.mutateAsync({
                endpoint: `/orders/admin/orders/${orderId}/status`,
                payload,
            });
        }

        if (actionType === 'notes') {
            await notesMutation.mutateAsync({
                endpoint: `/orders/admin/orders/${orderId}`,
                payload,
            });
        }

        if (actionType === 'fulfill') {
            await fulfillMutation.mutateAsync({
                endpoint: `/orders/admin/orders/${orderId}/fulfill`,
                payload,
            });
        }

        if (actionType === 'shipment') {
            await shipmentMutation.mutateAsync({
                endpoint: `/orders/admin/orders/${orderId}/shipment`,
                payload,
            });
        }

        closeAction();
        await refreshOrders();
    };

    const handleConfirmDelivery = async () => {
        if (!orderDetail) {
            return;
        }

        const confirmed = window.confirm(translate('text.confirm_order_value_has_been_delivered', { value0: orderDetail.order_code }));

        if (!confirmed) {
            return;
        }

        await deliverMutation.mutateAsync({
            endpoint: `/orders/admin/orders/${getOrderId(orderDetail)}/deliver`,
        });
        await refreshOrders();
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <p className="text-sm font-medium text-[var(--color-primary-hover)]"> {translate('text.admin')} </p>
                    <h1 className="mt-1 text-2xl font-semibold text-[var(--color-text-main)]"> {translate('text.order_management')} </h1>
                    <p className="mt-2 text-sm text-[var(--color-text-muted)]"> {translate('text.admin_handles_status_fulfillment_bills_of_lading_and_internal_notes')} </p>
                </div>
                <Button
                    variant="outline"
                    isLoading={ordersQuery.isFetching || statsQuery.isFetching}
                    onClick={refreshOrders}
                >
                    <RefreshCw className="h-4 w-4" /> {translate('text.reload')} </Button>
            </div>

            <StatsPanel stats={statsQuery.data?.data} />

            <Card>
                <CardHeader>
                    <OrderFilters
                        values={draftFilters}
                        onChange={handleFilterChange}
                        onApply={handleApplyFilters}
                        onReset={handleResetFilters}
                    />
                </CardHeader>
                <CardBody>
                    {ordersQuery.isLoading ? (
                        <Loading label={translate('text.loading_orders')} />
                    ) : ordersQuery.isError ? (
                        <EmptyState
                            icon={Search}
                            title={translate('text.unable_to_load_order')}
                            description={ordersQuery.error.message}
                        />
                    ) : orders.length === 0 ? (
                        <EmptyState
                            icon={PackageCheck}
                            title={translate('text.no_orders_yet')}
                            description={translate('text.new_orders_will_display_here')}
                        />
                    ) : (
                        <div className="space-y-4">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
                                    <thead>
                                        <tr className="bg-[var(--color-background)] text-left text-xs font-semibold uppercase text-[var(--color-text-muted)]">
                                            <th className="px-4 py-3">{translate('text.item_code')}</th>
                                            <th className="px-4 py-3">{translate('text.status')}</th>
                                            <th className="px-4 py-3">{translate('text.checkout')}</th>
                                            <th className="px-4 py-3">{translate('text.total_amount')}</th>
                                            <th className="px-4 py-3">{translate('text.quantity')}</th>
                                            <th className="px-4 py-3">{translate('text.creation_date')}</th>
                                            <th className="px-4 py-3 text-right">{translate('text.task')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-surface)]">
                                        {orders.map((order) => (
                                            <tr key={getOrderId(order)}>
                                                <td className="px-4 py-3 font-medium text-[var(--color-text-main)]">
                                                    {order.order_code}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <StatusBadge value={order.status} />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <StatusBadge value={order.payment?.status || order.payment_status} />
                                                </td>
                                                <td className="px-4 py-3 text-[var(--color-text-main)]">
                                                    {formatMoney(order.pricing?.total_amount ?? order.total_amount)}
                                                </td>
                                                <td className="px-4 py-3 text-[var(--color-text-main)]">
                                                    {order.fulfillment?.total_ordered ?? order.total_items ?? 0}
                                                </td>
                                                <td className="px-4 py-3 text-[var(--color-text-main)]">
                                                    {formatDateTime(order.created_at)}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => openDetail(order)}
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
                open={Boolean(selectedOrder)}
                title={orderDetail?.order_code || translate('text.order_details')}
                onClose={closeDetail}
                panelClassName="max-w-7xl"
            >
                {detailQuery.isLoading ? (
                    <Loading label={translate('text.loading_order_details')} />
                ) : detailQuery.isError ? (
                    <EmptyState
                        title={translate('text.unable_to_load_single_item')}
                        description={detailQuery.error.message}
                    />
                ) : (
                    <OrderDetailPanel
                        order={orderDetail}
                        isDelivering={deliverMutation.isPending}
                        onOpenAction={openAction}
                        onConfirmDelivery={handleConfirmDelivery}
                    />
                )}
            </Modal>

            {actionForm && (
                <Modal
                    open={Boolean(actionType)}
                    title={actionTitles[actionType]}
                    onClose={closeAction}
                    panelClassName="max-w-5xl"
                >
                    <AdminResourceForm
                        form={actionForm}
                        mode="edit"
                        initialData={orderDetail}
                        optionData={{}}
                        isLoading={actionMutation.isPending}
                        error={actionMutation.error}
                        onCancel={closeAction}
                        onSubmit={handleSubmitAction}
                    />
                </Modal>
            )}
        </div>
    );
}
