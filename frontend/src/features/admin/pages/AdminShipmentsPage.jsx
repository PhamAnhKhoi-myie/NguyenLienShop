import {
    AlertTriangle,
    CheckCircle2,
    ClipboardEdit,
    Eye,
    Filter,
    RefreshCw,
    RotateCcw,
    Search,
    Trash2,
    Truck,
    XCircle,
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
    carrierOptions,
    createShipmentStatusFormConfig,
    hasNextShipmentStatus,
    shipmentCancelFormConfig,
    shipmentFailureFormConfig,
    shipmentInfoFormConfig,
    shipmentStatusOptions,
} from '../resources/adminShipmentForms';
import {
    formatDateTime,
    StatusBadge,
} from '../utils/adminFormat';

const actionTitles = {
    info: 'Cập nhật vận đơn',
    status: 'Cập nhật trạng thái',
    failure: 'Ghi nhận lỗi giao hàng',
    cancel: 'Hủy vận đơn',
};

const timelineLabels = {
    created_at: 'Tạo vận đơn',
    picked_up_at: 'Đã lấy hàng',
    in_transit_at: 'Đang vận chuyển',
    at_destination_at: 'Tới kho giao',
    delivered_at: 'Đã giao',
    failed_at: 'Giao thất bại',
    cancelled_at: 'Đã hủy',
    returned_at: 'Đã trả lại',
};

function getShipmentId(shipment) {
    return shipment?.id || shipment?._id;
}

function getRows(response) {
    return Array.isArray(response?.data) ? response.data : [];
}

function getPages(pagination = {}) {
    return pagination.totalPages || pagination.pages || pagination.total_pages || 1;
}

function buildShipmentParams({ page, filters }) {
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

function getStatCount(items = []) {
    return Array.isArray(items) && items[0]?.count ? items[0].count : 0;
}

function getRate(stats = {}, key) {
    const item = Array.isArray(stats.deliveryRate)
        ? stats.deliveryRate[0]
        : null;

    return Number(item?.[key] || 0).toFixed(1);
}

function isInProgress(status) {
    return ['pending', 'picked_up', 'in_transit', 'at_destination'].includes(
        status
    );
}

function canConfirmDelivery(shipment) {
    return ['in_transit', 'at_destination'].includes(shipment?.status);
}

function canRetryShipment(shipment) {
    return Boolean(
        shipment?.actions?.can_retry ||
            (shipment?.status === 'failed' &&
                Number(shipment?.retry_count || 0) <
                    Number(shipment?.max_retries || 3))
    );
}

function canCancelShipment(shipment) {
    return Boolean(shipment?.actions?.can_cancel || isInProgress(shipment?.status));
}

function formatFullAddress(address = {}) {
    return [
        address.address,
        address.ward,
        address.district,
        address.province,
        address.postal_code,
    ]
        .filter(Boolean)
        .join(', ');
}

function StatsPanel({ stats }) {
    const statusItems = stats?.statusBreakdown || [];
    const carrierItems = stats?.carrierBreakdown || [];

    return (
        <div className="grid gap-4 lg:grid-cols-4">
            <Card>
                <CardBody>
                    <p className="text-sm text-[var(--color-text-muted)]">
                        Tổng vận đơn
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--color-text-main)]">
                        {getStatCount(stats?.totalShipments)}
                    </p>
                </CardBody>
            </Card>
            <Card>
                <CardBody>
                    <p className="text-sm text-[var(--color-text-muted)]">
                        Tỷ lệ giao thành công
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--color-primary-hover)]">
                        {getRate(stats, 'deliveryRate')}%
                    </p>
                </CardBody>
            </Card>
            <Card>
                <CardBody>
                    <p className="text-sm text-[var(--color-text-muted)]">
                        Tỷ lệ thất bại
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--color-warning)]">
                        {getRate(stats, 'failureRate')}%
                    </p>
                </CardBody>
            </Card>
            <Card>
                <CardBody>
                    <p className="text-sm text-[var(--color-text-muted)]">
                        Đơn vị vận chuyển
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {carrierItems.length ? (
                            carrierItems.map((item) => (
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
                        Trạng thái vận chuyển
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

function ShipmentFilters({
    values,
    onChange,
    onApply,
    onReset,
}) {
    return (
        <div className="grid gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4 lg:grid-cols-6">
            <Select
                label="Trạng thái"
                value={values.status}
                onChange={(event) => onChange('status', event.target.value)}
            >
                {shipmentStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </Select>
            <Select
                label="Đơn vị"
                value={values.carrier}
                onChange={(event) => onChange('carrier', event.target.value)}
            >
                {carrierOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </Select>
            <Input
                label="Order ID"
                value={values.order_id}
                onChange={(event) => onChange('order_id', event.target.value)}
            />
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

function TimelinePanel({ timeline = {} }) {
    const events = Object.entries(timeline)
        .map(([key, value]) => {
            const timestamp = value?.timestamp || value;

            return {
                key,
                timestamp,
                label: value?.label_vi || timelineLabels[key] || key,
            };
        })
        .filter((event) => event.timestamp)
        .sort((left, right) => new Date(left.timestamp) - new Date(right.timestamp));

    if (!events.length) {
        return (
            <p className="text-sm text-[var(--color-text-muted)]">
                Chưa có mốc vận chuyển.
            </p>
        );
    }

    return (
        <div className="space-y-3">
            {events.map((event) => (
                <div
                    key={event.key}
                    className="rounded-lg border border-[var(--color-border)] p-3"
                >
                    <p className="text-sm font-medium text-[var(--color-text-main)]">
                        {event.label}
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                        {formatDateTime(event.timestamp)}
                    </p>
                </div>
            ))}
        </div>
    );
}

function ShipmentDetailPanel({
    shipment,
    onOpenAction,
    onRetry,
    onConfirmDelivery,
    onDelete,
    isRetrying,
    isConfirming,
    isDeleting,
}) {
    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-semibold text-[var(--color-text-main)]">
                            {shipment.tracking_code}
                        </h2>
                        <StatusBadge value={shipment.status} />
                        <StatusBadge value={shipment.carrier} label={shipment.carrier} />
                    </div>
                    <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                        Order {shipment.order_id}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onOpenAction('info')}
                    >
                        <ClipboardEdit className="h-4 w-4" />
                        Sửa
                    </Button>
                    {hasNextShipmentStatus(shipment.status) && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onOpenAction('status')}
                        >
                            <Truck className="h-4 w-4" />
                            Trạng thái
                        </Button>
                    )}
                    {isInProgress(shipment.status) && (
                        <Button
                            size="sm"
                            variant="warning"
                            onClick={() => onOpenAction('failure')}
                        >
                            <AlertTriangle className="h-4 w-4" />
                            Ghi lỗi
                        </Button>
                    )}
                    {canCancelShipment(shipment) && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onOpenAction('cancel')}
                        >
                            <XCircle className="h-4 w-4" />
                            Hủy
                        </Button>
                    )}
                    {canRetryShipment(shipment) && (
                        <Button
                            size="sm"
                            variant="outline"
                            isLoading={isRetrying}
                            onClick={onRetry}
                        >
                            <RotateCcw className="h-4 w-4" />
                            Retry
                        </Button>
                    )}
                    {canConfirmDelivery(shipment) && (
                        <Button
                            size="sm"
                            isLoading={isConfirming}
                            onClick={onConfirmDelivery}
                        >
                            <CheckCircle2 className="h-4 w-4" />
                            Đã giao
                        </Button>
                    )}
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
                            Người nhận
                        </h3>
                    </CardHeader>
                    <CardBody className="space-y-2 text-sm">
                        <p className="font-medium text-[var(--color-text-main)]">
                            {shipment.shipping_address?.recipient_name || '-'}
                        </p>
                        <p className="text-[var(--color-text-muted)]">
                            {shipment.shipping_address?.phone || '-'}
                        </p>
                        <p className="text-[var(--color-text-main)]">
                            {shipment.shipping_address?.formatted_address ||
                                formatFullAddress(shipment.shipping_address) ||
                                '-'}
                        </p>
                    </CardBody>
                </Card>
                <Card>
                    <CardHeader>
                        <h3 className="font-semibold text-[var(--color-text-main)]">
                            Theo dõi
                        </h3>
                    </CardHeader>
                    <CardBody className="space-y-2 text-sm">
                        <div className="flex justify-between gap-3">
                            <span className="text-[var(--color-text-muted)]">
                                Tiến độ
                            </span>
                            <span className="font-semibold text-[var(--color-primary-hover)]">
                                {shipment.progress || 0}%
                            </span>
                        </div>
                        <div className="flex justify-between gap-3">
                            <span className="text-[var(--color-text-muted)]">
                                Tạo lúc
                            </span>
                            <span className="text-right font-medium text-[var(--color-text-main)]">
                                {formatDateTime(shipment.created_at)}
                            </span>
                        </div>
                        <div className="flex justify-between gap-3">
                            <span className="text-[var(--color-text-muted)]">
                                Giao lúc
                            </span>
                            <span className="text-right font-medium text-[var(--color-text-main)]">
                                {formatDateTime(shipment.delivered_at || shipment.timeline?.delivered_at?.timestamp) || '-'}
                            </span>
                        </div>
                    </CardBody>
                </Card>
                <Card>
                    <CardHeader>
                        <h3 className="font-semibold text-[var(--color-text-main)]">
                            Ghi chú
                        </h3>
                    </CardHeader>
                    <CardBody className="space-y-3 text-sm">
                        <p className="text-[var(--color-text-muted)]">
                            {shipment.admin_notes || '-'}
                        </p>
                        {shipment.failure && (
                            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-[var(--color-error)]">
                                <p className="font-medium">
                                    {shipment.failure.reason_label || shipment.failure.reason}
                                </p>
                                <p className="mt-1">
                                    {shipment.failure.notes}
                                </p>
                            </div>
                        )}
                    </CardBody>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <h3 className="font-semibold text-[var(--color-text-main)]">
                        Timeline
                    </h3>
                </CardHeader>
                <CardBody>
                    <TimelinePanel timeline={shipment.timeline} />
                </CardBody>
            </Card>
        </div>
    );
}

export default function AdminShipmentsPage() {
    const [page, setPage] = useState(1);
    const [draftFilters, setDraftFilters] = useState({
        status: '',
        carrier: '',
        order_id: '',
        date_from: '',
        date_to: '',
    });
    const [appliedFilters, setAppliedFilters] = useState(draftFilters);
    const [selectedShipment, setSelectedShipment] = useState(null);
    const [actionType, setActionType] = useState(null);
    const queryParams = useMemo(
        () => buildShipmentParams({ page, filters: appliedFilters }),
        [appliedFilters, page]
    );
    const statsParams = useMemo(
        () => buildFilterParams(appliedFilters),
        [appliedFilters]
    );
    const shipmentsQuery = useAdminList('/shipments/admin', queryParams);
    const statsQuery = useAdminDetail('/shipments/admin/stats', {
        params: statsParams,
    });
    const detailEndpoint = selectedShipment
        ? `/shipments/admin/${getShipmentId(selectedShipment)}`
        : null;
    const detailQuery = useAdminDetail(detailEndpoint, {
        enabled: Boolean(detailEndpoint),
    });
    const infoMutation = useAdminMutation({ method: 'patch' });
    const statusMutation = useAdminMutation({ method: 'patch' });
    const failureMutation = useAdminMutation({ method: 'patch' });
    const cancelMutation = useAdminMutation({ method: 'patch' });
    const retryMutation = useAdminMutation({ method: 'post' });
    const confirmMutation = useAdminMutation({ method: 'post' });
    const deleteMutation = useAdminMutation({ method: 'delete' });
    const shipments = getRows(shipmentsQuery.data);
    const pagination = shipmentsQuery.data?.pagination || {};
    const totalPages = getPages(pagination);
    const shipmentDetail = detailQuery.data?.data || selectedShipment;
    const statusFormConfig = useMemo(
        () => createShipmentStatusFormConfig(shipmentDetail || {}),
        [shipmentDetail]
    );
    const actionForm = useMemo(() => {
        if (actionType === 'info') {
            return shipmentInfoFormConfig;
        }

        if (actionType === 'status') {
            return statusFormConfig;
        }

        if (actionType === 'failure') {
            return shipmentFailureFormConfig;
        }

        if (actionType === 'cancel') {
            return shipmentCancelFormConfig;
        }

        return null;
    }, [actionType, statusFormConfig]);
    const actionMutation =
        actionType === 'info'
            ? infoMutation
            : actionType === 'status'
              ? statusMutation
              : actionType === 'failure'
                ? failureMutation
                : cancelMutation;

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
            carrier: '',
            order_id: '',
            date_from: '',
            date_to: '',
        };

        setDraftFilters(nextFilters);
        setAppliedFilters(nextFilters);
        setPage(1);
    };

    const refreshShipments = async () => {
        await shipmentsQuery.refetch();
        await statsQuery.refetch();

        if (detailEndpoint) {
            await detailQuery.refetch();
        }
    };

    const resetActionMutations = () => {
        infoMutation.reset();
        statusMutation.reset();
        failureMutation.reset();
        cancelMutation.reset();
    };

    const openDetail = (shipment) => {
        setSelectedShipment(shipment);
        setActionType(null);
    };

    const closeDetail = () => {
        setSelectedShipment(null);
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
        if (!actionForm || !shipmentDetail) {
            return;
        }

        const shipmentId = getShipmentId(shipmentDetail);
        const payload = actionForm.toPayload(values, {
            mode: 'edit',
            initialData: shipmentDetail,
        });

        if (actionType === 'info') {
            await infoMutation.mutateAsync({
                endpoint: `/shipments/admin/${shipmentId}`,
                payload,
            });
        }

        if (actionType === 'status') {
            await statusMutation.mutateAsync({
                endpoint: `/shipments/${shipmentId}/status`,
                payload,
            });
        }

        if (actionType === 'failure') {
            await failureMutation.mutateAsync({
                endpoint: `/shipments/${shipmentId}/failure`,
                payload,
            });
        }

        if (actionType === 'cancel') {
            await cancelMutation.mutateAsync({
                endpoint: `/shipments/${shipmentId}/cancel`,
                payload,
            });
        }

        closeAction();
        await refreshShipments();
    };

    const handleRetry = async () => {
        if (!shipmentDetail) {
            return;
        }

        const confirmed = window.confirm(`Retry vận đơn ${shipmentDetail.tracking_code}?`);

        if (!confirmed) {
            return;
        }

        await retryMutation.mutateAsync({
            endpoint: `/shipments/${getShipmentId(shipmentDetail)}/retry`,
        });
        await refreshShipments();
    };

    const handleConfirmDelivery = async () => {
        if (!shipmentDetail) {
            return;
        }

        const confirmed = window.confirm(`Xác nhận vận đơn ${shipmentDetail.tracking_code} đã giao?`);

        if (!confirmed) {
            return;
        }

        await confirmMutation.mutateAsync({
            endpoint: `/shipments/${getShipmentId(shipmentDetail)}/confirm-delivery`,
        });
        await refreshShipments();
    };

    const handleDelete = async () => {
        if (!shipmentDetail) {
            return;
        }

        const confirmed = window.confirm(`Xóa mềm vận đơn ${shipmentDetail.tracking_code}?`);

        if (!confirmed) {
            return;
        }

        await deleteMutation.mutateAsync({
            endpoint: `/shipments/admin/${getShipmentId(shipmentDetail)}`,
        });
        closeDetail();
        await refreshShipments();
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <p className="text-sm font-medium text-[var(--color-primary-hover)]">
                        Admin
                    </p>
                    <h1 className="mt-1 text-2xl font-semibold text-[var(--color-text-main)]">
                        Quản lý vận chuyển
                    </h1>
                    <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                        ADMIN theo dõi vận đơn, cập nhật trạng thái giao hàng và xử lý lỗi vận chuyển.
                    </p>
                </div>
                <Button
                    variant="outline"
                    isLoading={shipmentsQuery.isFetching || statsQuery.isFetching}
                    onClick={refreshShipments}
                >
                    <RefreshCw className="h-4 w-4" />
                    Tải lại
                </Button>
            </div>

            <StatsPanel stats={statsQuery.data?.data} />

            <Card>
                <CardHeader>
                    <ShipmentFilters
                        values={draftFilters}
                        onChange={handleFilterChange}
                        onApply={handleApplyFilters}
                        onReset={handleResetFilters}
                    />
                </CardHeader>
                <CardBody>
                    {shipmentsQuery.isLoading ? (
                        <Loading label="Đang tải vận đơn..." />
                    ) : shipmentsQuery.isError ? (
                        <EmptyState
                            icon={Search}
                            title="Không tải được vận đơn"
                            description={shipmentsQuery.error.message}
                        />
                    ) : shipments.length === 0 ? (
                        <EmptyState
                            icon={Truck}
                            title="Chưa có vận đơn"
                            description="Vận đơn tạo từ order PROCESSING sẽ hiển thị tại đây."
                        />
                    ) : (
                        <div className="space-y-4">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
                                    <thead>
                                        <tr className="bg-[var(--color-background)] text-left text-xs font-semibold uppercase text-[var(--color-text-muted)]">
                                            <th className="px-4 py-3">Mã vận đơn</th>
                                            <th className="px-4 py-3">Order</th>
                                            <th className="px-4 py-3">Đơn vị</th>
                                            <th className="px-4 py-3">Trạng thái</th>
                                            <th className="px-4 py-3">Người nhận</th>
                                            <th className="px-4 py-3">Ngày tạo</th>
                                            <th className="px-4 py-3 text-right">Tác vụ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-surface)]">
                                        {shipments.map((shipment) => (
                                            <tr key={getShipmentId(shipment)}>
                                                <td className="px-4 py-3 font-medium text-[var(--color-text-main)]">
                                                    {shipment.tracking_code}
                                                </td>
                                                <td className="px-4 py-3 text-[var(--color-text-main)]">
                                                    {shipment.order_id}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <StatusBadge value={shipment.carrier} label={shipment.carrier} />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <StatusBadge value={shipment.status} />
                                                </td>
                                                <td className="px-4 py-3 text-[var(--color-text-main)]">
                                                    {shipment.shipping_address?.recipient_name ||
                                                        shipment.recipient_name ||
                                                        '-'}
                                                </td>
                                                <td className="px-4 py-3 text-[var(--color-text-main)]">
                                                    {formatDateTime(shipment.created_at)}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => openDetail(shipment)}
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
                open={Boolean(selectedShipment)}
                title={shipmentDetail?.tracking_code || 'Chi tiết vận đơn'}
                onClose={closeDetail}
                panelClassName="max-w-7xl"
            >
                {detailQuery.isLoading ? (
                    <Loading label="Đang tải chi tiết vận đơn..." />
                ) : detailQuery.isError ? (
                    <EmptyState
                        title="Không tải được chi tiết vận đơn"
                        description={detailQuery.error.message}
                    />
                ) : (
                    <ShipmentDetailPanel
                        shipment={shipmentDetail}
                        isRetrying={retryMutation.isPending}
                        isConfirming={confirmMutation.isPending}
                        isDeleting={deleteMutation.isPending}
                        onOpenAction={openAction}
                        onRetry={handleRetry}
                        onConfirmDelivery={handleConfirmDelivery}
                        onDelete={handleDelete}
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
                        initialData={shipmentDetail}
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
