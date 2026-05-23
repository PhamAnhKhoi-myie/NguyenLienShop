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
    { value: '', label: 'Tất cả' },
    { value: 'PENDING', label: 'Chờ xử lý' },
    { value: 'PAID', label: 'Đã thanh toán' },
    { value: 'PROCESSING', label: 'Đang chuẩn bị' },
    { value: 'SHIPPED', label: 'Đang giao' },
    { value: 'DELIVERED', label: 'Đã giao' },
    { value: 'CANCELED', label: 'Đã hủy' },
    { value: 'FAILED', label: 'Thất bại' },
];

const statusLabels = {
    PENDING: 'Chờ xử lý',
    PAID: 'Đã thanh toán',
    PROCESSING: 'Đang chuẩn bị',
    SHIPPED: 'Đang giao',
    DELIVERED: 'Đã giao',
    CANCELED: 'Đã hủy',
    FAILED: 'Thất bại',
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
    return ['PENDING', 'PAID', 'PROCESSING'].includes(status);
}

function formatDateTime(value) {
    if (!value) {
        return '';
    }

    return new Date(value).toLocaleString('vi-VN');
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
                            <h1 className="text-xl font-semibold text-[var(--color-text-main)]">
                                Đơn hàng của tôi
                            </h1>
                            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                                Theo dõi trạng thái, hủy đơn và đánh giá sản phẩm sau khi nhận hàng.
                            </p>
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
                        <Loading label="Đang tải đơn hàng..." />
                    ) : orders.length === 0 ? (
                        <EmptyState
                            icon={PackageCheck}
                            title="Chưa có đơn hàng"
                            description="Các đơn hàng đã tạo sẽ hiển thị tại đây."
                            actionLabel="Mua sản phẩm"
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
                                                {order.item_count || 0} dòng sản phẩm · {order.total_items || 0} sản phẩm
                                            </p>
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
                                                    <Eye className="h-4 w-4" />
                                                    Chi tiết
                                                </Link>
                                                {canCancelOrder(order.status) && (
                                                    <Button
                                                        variant="danger"
                                                        size="sm"
                                                        onClick={() =>
                                                            openCancelModal(order)
                                                        }
                                                    >
                                                        <XCircle className="h-4 w-4" />
                                                        Hủy đơn
                                                    </Button>
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
                title="Hủy đơn hàng"
                onClose={closeCancelModal}
                footer={
                    <>
                        <Button variant="outline" onClick={closeCancelModal}>
                            Đóng
                        </Button>
                        <Button
                            variant="danger"
                            disabled={!cancelReason.trim()}
                            isLoading={cancelOrderMutation.isPending}
                            onClick={handleCancelOrder}
                        >
                            Hủy đơn
                        </Button>
                    </>
                }
            >
                <div className="space-y-3">
                    <p className="text-sm text-[var(--color-text-muted)]">
                        Nhập lý do hủy đơn {cancelOrder?.order_code}.
                    </p>
                    <Textarea
                        rows={4}
                        placeholder="Ví dụ: muốn đổi địa chỉ giao hàng..."
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
