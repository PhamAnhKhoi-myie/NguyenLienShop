import { zodResolver } from '@hookform/resolvers/zod';
import {
    ArrowLeft,
    Star,
    Truck,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Link, useParams } from 'react-router-dom';
import Badge from '../../../shared/components/Badge';
import Button from '../../../shared/components/Button';
import Card, { CardBody, CardHeader } from '../../../shared/components/Card';
import EmptyState from '../../../shared/components/EmptyState';
import Loading from '../../../shared/components/Loading';
import Modal from '../../../shared/components/Modal';
import Select from '../../../shared/components/Select';
import Textarea from '../../../shared/components/Textarea';
import { ROUTES } from '../../../shared/constants/routes';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import AccountNav from '../../profile/components/AccountNav';
import {
    useCancelOrder,
    useOrder,
    useWriteOrderReview,
} from '../hooks/useOrders';
import { cancelOrderSchema, reviewSchema } from '../schemas/orderFormSchemas';

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

function InfoRow({ label, value }) {
    if (!value && value !== 0) {
        return null;
    }

    return (
        <div className="flex justify-between gap-4 border-b border-[var(--color-border)] py-3 last:border-b-0">
            <span className="text-sm text-[var(--color-text-muted)]">
                {label}
            </span>
            <span className="text-right text-sm font-medium text-[var(--color-text-main)]">
                {value}
            </span>
        </div>
    );
}

export default function OrderDetailPage() {
    const { orderId } = useParams();
    const orderQuery = useOrder(orderId);
    const cancelOrderMutation = useCancelOrder();
    const writeReviewMutation = useWriteOrderReview();
    const [isCancelOpen, setIsCancelOpen] = useState(false);
    const [reviewItem, setReviewItem] = useState(null);
    const order = orderQuery.data?.data;
    const {
        register: registerCancel,
        control: cancelControl,
        handleSubmit: handleCancelSubmit,
        reset: resetCancelForm,
        formState: { errors: cancelErrors },
    } = useForm({
        resolver: zodResolver(cancelOrderSchema),
        defaultValues: {
            reason: '',
        },
    });
    const {
        register: registerReview,
        control: reviewControl,
        handleSubmit: handleReviewSubmit,
        reset: resetReviewForm,
        formState: { errors: reviewErrors },
    } = useForm({
        resolver: zodResolver(reviewSchema),
        defaultValues: {
            rating: '5',
            comment: '',
        },
    });
    const cancelReason =
        useWatch({ control: cancelControl, name: 'reason' }) || '';
    const reviewComment =
        useWatch({ control: reviewControl, name: 'comment' }) || '';

    const openCancelModal = () => {
        resetCancelForm({ reason: '' });
        setIsCancelOpen(true);
    };

    const closeCancelModal = () => {
        setIsCancelOpen(false);
        resetCancelForm({ reason: '' });
    };

    const openReviewModal = (item) => {
        setReviewItem(item);
        resetReviewForm({ rating: '5', comment: '' });
    };

    const closeReviewModal = () => {
        setReviewItem(null);
        resetReviewForm({ rating: '5', comment: '' });
    };

    const handleCancelOrder = handleCancelSubmit(async (values) => {
        if (!order?.id) {
            return;
        }

        await cancelOrderMutation.mutateAsync({
            orderId: order.id,
            payload: { reason: values.reason.trim() },
        });
        closeCancelModal();
    });

    const handleSubmitReview = handleReviewSubmit(async (values) => {
        if (!order?.id || !reviewItem?.id) {
            return;
        }

        await writeReviewMutation.mutateAsync({
            orderId: order.id,
            payload: {
                item_id: reviewItem.id,
                rating: values.rating,
                comment: values.comment.trim(),
            },
        });
        closeReviewModal();
    });

    if (orderQuery.isLoading) {
        return <Loading label="Đang tải chi tiết đơn hàng..." />;
    }

    if (orderQuery.isError || !order) {
        return (
            <EmptyState
                title="Không tải được đơn hàng"
                description={orderQuery.error?.message || 'Đơn hàng không tồn tại.'}
                actionLabel="Quay lại danh sách"
                onAction={() => {
                    window.location.href = ROUTES.ORDERS;
                }}
            />
        );
    }

    return (
        <div className="space-y-6">
            <AccountNav />

            <Link
                to={ROUTES.ORDERS}
                className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-primary-hover)] hover:text-[var(--color-primary)]"
            >
                <ArrowLeft className="h-4 w-4" />
                Quay lại đơn hàng
            </Link>

            <Card>
                <CardBody>
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-2xl font-semibold text-[var(--color-text-main)]">
                                    {order.order_code}
                                </h1>
                                <Badge variant={getStatusVariant(order.status)}>
                                    {statusLabels[order.status] || order.status}
                                </Badge>
                                {order.payment?.status && (
                                    <Badge
                                        variant={getStatusVariant(
                                            order.payment.status
                                        )}
                                    >
                                        {order.payment.status}
                                    </Badge>
                                )}
                            </div>
                            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                                Tạo lúc {formatDateTime(order.created_at)}
                            </p>
                        </div>

                        {canCancelOrder(order.status) && (
                            <Button
                                variant="danger"
                                onClick={openCancelModal}
                            >
                                <XCircle className="h-4 w-4" />
                                Hủy đơn
                            </Button>
                        )}
                    </div>
                </CardBody>
            </Card>

            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <h2 className="font-semibold text-[var(--color-text-main)]">
                                Sản phẩm
                            </h2>
                        </CardHeader>
                        <CardBody className="space-y-4">
                            {(order.items || []).map((item) => {
                                const canReview =
                                    order.status === 'DELIVERED' &&
                                    item.review_status !== 'reviewed';

                                return (
                                    <div
                                        key={item.id}
                                        className="flex flex-col gap-4 rounded-lg border border-[var(--color-border)] p-4 md:flex-row md:items-center md:justify-between"
                                    >
                                        <div>
                                            <p className="font-semibold text-[var(--color-text-main)]">
                                                {item.product_name}
                                            </p>
                                            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                                                {item.variant_label} · {item.unit_label} · SKU {item.sku}
                                            </p>
                                            <p className="mt-1 text-sm text-[var(--color-text-main)]">
                                                {item.quantity_ordered} gói x {formatCurrency(item.unit_price || 0)}
                                            </p>
                                        </div>
                                        <div className="flex flex-col gap-2 md:items-end">
                                            <p className="font-semibold text-[var(--color-primary-hover)]">
                                                {formatCurrency(item.line_total || 0)}
                                            </p>
                                            {item.review_status === 'reviewed' ? (
                                                <Badge variant="success">
                                                    Đã đánh giá
                                                </Badge>
                                            ) : canReview ? (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() =>
                                                        openReviewModal(item)
                                                    }
                                                >
                                                    <Star className="h-4 w-4" />
                                                    Đánh giá
                                                </Button>
                                            ) : null}
                                        </div>
                                    </div>
                                );
                            })}
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Truck className="h-4 w-4 text-[var(--color-primary)]" />
                                <h2 className="font-semibold text-[var(--color-text-main)]">
                                    Lịch sử trạng thái
                                </h2>
                            </div>
                        </CardHeader>
                        <CardBody>
                            <div className="space-y-3">
                                {(order.status_history || []).map((record) => (
                                    <div
                                        key={`${record.to}-${record.changed_at}`}
                                        className="rounded-lg border border-[var(--color-border)] p-3"
                                    >
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge
                                                variant={getStatusVariant(
                                                    record.to
                                                )}
                                            >
                                                {statusLabels[record.to] ||
                                                    record.to}
                                            </Badge>
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

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <h2 className="font-semibold text-[var(--color-text-main)]">
                                Tổng tiền
                            </h2>
                        </CardHeader>
                        <CardBody>
                            <InfoRow
                                label="Tạm tính"
                                value={formatCurrency(order.pricing?.subtotal || 0)}
                            />
                            <InfoRow
                                label="Giảm giá"
                                value={formatCurrency(
                                    order.pricing?.discount_amount || 0
                                )}
                            />
                            <InfoRow
                                label="Phí vận chuyển"
                                value={formatCurrency(
                                    order.pricing?.shipping_fee || 0
                                )}
                            />
                            <InfoRow
                                label="Tổng đơn"
                                value={formatCurrency(
                                    order.pricing?.total_amount || 0
                                )}
                            />
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader>
                            <h2 className="font-semibold text-[var(--color-text-main)]">
                                Giao hàng
                            </h2>
                        </CardHeader>
                        <CardBody>
                            <InfoRow
                                label="Người nhận"
                                value={
                                    order.address_snapshot?.receiver_name ||
                                    order.address_snapshot?.recipient_name
                                }
                            />
                            <InfoRow
                                label="Điện thoại"
                                value={order.address_snapshot?.phone}
                            />
                            <InfoRow
                                label="Địa chỉ"
                                value={
                                    order.address_snapshot?.full_address ||
                                    [
                                        order.address_snapshot?.detail,
                                        order.address_snapshot?.ward_name,
                                        order.address_snapshot?.province_name,
                                        order.address_snapshot?.street,
                                        order.address_snapshot?.district,
                                        order.address_snapshot?.city,
                                    ]
                                        .filter(Boolean)
                                        .join(', ')
                                }
                            />
                        </CardBody>
                    </Card>
                </div>
            </div>

            <Modal
                open={isCancelOpen}
                title="Hủy đơn hàng"
                onClose={closeCancelModal}
                footer={
                    <>
                        <Button
                            variant="outline"
                            onClick={closeCancelModal}
                        >
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
                        Nhập lý do hủy đơn {order.order_code}.
                    </p>
                    <Textarea
                        rows={4}
                        error={cancelErrors.reason?.message}
                        {...registerCancel('reason')}
                    />
                    {cancelOrderMutation.isError && (
                        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--color-error)]">
                            {cancelOrderMutation.error.message}
                        </p>
                    )}
                </div>
            </Modal>

            <Modal
                open={Boolean(reviewItem)}
                title="Đánh giá sản phẩm"
                onClose={closeReviewModal}
                footer={
                    <>
                        <Button variant="outline" onClick={closeReviewModal}>
                            Đóng
                        </Button>
                        <Button
                            disabled={reviewComment.trim().length < 10}
                            isLoading={writeReviewMutation.isPending}
                            onClick={handleSubmitReview}
                        >
                            Gửi đánh giá
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <p className="font-medium text-[var(--color-text-main)]">
                        {reviewItem?.product_name}
                    </p>
                    <Select
                        label="Số sao"
                        error={reviewErrors.rating?.message}
                        {...registerReview('rating')}
                    >
                        <option value="5">5 sao</option>
                        <option value="4">4 sao</option>
                        <option value="3">3 sao</option>
                        <option value="2">2 sao</option>
                        <option value="1">1 sao</option>
                    </Select>
                    <Textarea
                        label="Nội dung"
                        rows={5}
                        placeholder="Chia sẻ cảm nhận sau khi sử dụng sản phẩm..."
                        error={reviewErrors.comment?.message}
                        {...registerReview('comment')}
                    />
                    {writeReviewMutation.isError && (
                        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--color-error)]">
                            {writeReviewMutation.error.message}
                        </p>
                    )}
                </div>
            </Modal>
        </div>
    );
}
