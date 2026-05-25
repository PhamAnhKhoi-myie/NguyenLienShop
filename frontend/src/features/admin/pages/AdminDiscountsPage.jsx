import {
    Copy,
    Eye,
    Filter,
    Plus,
    PowerOff,
    RefreshCw,
    Search,
    TicketPercent,
    Trash2,
    Upload,
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
    bulkDiscountsFormConfig,
    discountFormConfig,
    discountSortOptions,
    discountStatusOptions,
    discountTypeOptions,
    duplicateDiscountFormConfig,
} from '../resources/adminDiscountForms';
import {
    formatDateTime,
    formatMoney,
    StatusBadge,
} from '../utils/adminFormat';

const actionTitles = {
    create: 'Tạo mã giảm giá',
    edit: 'Cập nhật mã giảm giá',
    duplicate: 'Nhân bản mã giảm giá',
    bulk: 'Import mã giảm giá',
};

function getDiscountId(discount) {
    return discount?.id || discount?._id;
}

function getRows(response) {
    return Array.isArray(response?.data) ? response.data : [];
}

function getPages(pagination = {}) {
    return pagination.totalPages || pagination.pages || pagination.total_pages || 1;
}

function buildDiscountParams({ page, filters }) {
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

function formatDiscountValue(discount = {}) {
    if (discount.display_value) {
        return discount.display_value;
    }

    if (discount.type === 'percent') {
        return `${discount.value}%`;
    }

    return formatMoney(discount.value);
}

function formatIds(values = []) {
    if (!Array.isArray(values) || values.length === 0) {
        return '-';
    }

    return values.map((value) => String(value)).join(', ');
}

function DetailRow({ label, value, children }) {
    return (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            <p className="text-xs font-medium uppercase text-[var(--color-text-muted)]">
                {label}
            </p>
            <div className="mt-1 break-words text-sm font-medium text-[var(--color-text-main)]">
                {children || value || '-'}
            </div>
        </div>
    );
}

function StatsPanel({
    total,
    nearExpiryTotal,
    activeOnPage,
    usageOnPage,
}) {
    return (
        <div className="grid gap-4 lg:grid-cols-4">
            <Card>
                <CardBody>
                    <p className="text-sm text-[var(--color-text-muted)]">
                        Tổng mã
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--color-text-main)]">
                        {total}
                    </p>
                </CardBody>
            </Card>
            <Card>
                <CardBody>
                    <p className="text-sm text-[var(--color-text-muted)]">
                        Active trên trang
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--color-primary-hover)]">
                        {activeOnPage}
                    </p>
                </CardBody>
            </Card>
            <Card>
                <CardBody>
                    <p className="text-sm text-[var(--color-text-muted)]">
                        Gần hết hạn 7 ngày
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--color-warning)]">
                        {nearExpiryTotal}
                    </p>
                </CardBody>
            </Card>
            <Card>
                <CardBody>
                    <p className="text-sm text-[var(--color-text-muted)]">
                        Lượt dùng trên trang
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--color-text-main)]">
                        {usageOnPage}
                    </p>
                </CardBody>
            </Card>
        </div>
    );
}

function DiscountFilters({
    values,
    onChange,
    onApply,
    onReset,
}) {
    return (
        <div className="grid gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4 lg:grid-cols-5">
            <Input
                label="Tìm mã"
                value={values.search}
                placeholder="BAOTRAI..."
                onChange={(event) => onChange('search', event.target.value)}
            />
            <Select
                label="Trạng thái"
                value={values.status}
                onChange={(event) => onChange('status', event.target.value)}
            >
                {discountStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </Select>
            <Select
                label="Loại"
                value={values.type}
                onChange={(event) => onChange('type', event.target.value)}
            >
                {discountTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </Select>
            <Select
                label="Sắp xếp"
                value={values.sortBy}
                onChange={(event) => onChange('sortBy', event.target.value)}
            >
                {discountSortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </Select>
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

function NearExpiryPanel({ discounts }) {
    return (
        <Card>
            <CardHeader>
                <h3 className="font-semibold text-[var(--color-text-main)]">
                    Sắp hết hạn
                </h3>
            </CardHeader>
            <CardBody>
                {discounts.length === 0 ? (
                    <p className="text-sm text-[var(--color-text-muted)]">
                        Không có mã nào hết hạn trong 7 ngày tới.
                    </p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {discounts.map((discount) => (
                            <StatusBadge
                                key={getDiscountId(discount)}
                                value="paused"
                                label={`${discount.code} · ${discount.time_remaining}`}
                            />
                        ))}
                    </div>
                )}
            </CardBody>
        </Card>
    );
}

function DiscountDetailPanel({
    discount,
    stats,
    onOpenAction,
    onRevoke,
    onDelete,
    isRevoking,
    isDeleting,
}) {
    const targets = discount.applicable_targets || {};
    const eligibility = discount.user_eligibility || {};

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-semibold text-[var(--color-text-main)]">
                            {discount.code}
                        </h2>
                        <StatusBadge value={discount.status} />
                        <StatusBadge value={discount.type} label={discount.type} />
                        {discount.show_on_homepage && (
                            <StatusBadge value="active" label="Homepage" />
                        )}
                        {discount.requires_claim && (
                            <StatusBadge value="paused" label="Claim trước" />
                        )}
                    </div>
                    <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                        {discount.application_strategy_label ||
                            discount.application_strategy}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onOpenAction('edit')}
                    >
                        <Plus className="h-4 w-4" />
                        Sửa
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onOpenAction('duplicate')}
                    >
                        <Copy className="h-4 w-4" />
                        Nhân bản
                    </Button>
                    {discount.status !== 'inactive' && discount.status !== 'expired' && (
                        <Button
                            size="sm"
                            variant="warning"
                            isLoading={isRevoking}
                            onClick={onRevoke}
                        >
                            <PowerOff className="h-4 w-4" />
                            Revoke
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
                            Giá trị
                        </h3>
                    </CardHeader>
                    <CardBody className="space-y-3">
                        <DetailRow label="Giảm">
                            {formatDiscountValue(discount)}
                        </DetailRow>
                        <DetailRow label="Tối đa">
                            {discount.max_discount_amount
                                ? formatMoney(discount.max_discount_amount)
                                : '-'}
                        </DetailRow>
                        <DetailRow label="Đơn tối thiểu">
                            {formatMoney(discount.min_order_value || 0)}
                        </DetailRow>
                    </CardBody>
                </Card>
                <Card>
                    <CardHeader>
                        <h3 className="font-semibold text-[var(--color-text-main)]">
                            Usage
                        </h3>
                    </CardHeader>
                    <CardBody className="space-y-3">
                        <DetailRow label="Đã dùng">
                            {discount.usage_count || 0}/{discount.usage_limit}
                        </DetailRow>
                        <DetailRow label="Mỗi user">
                            {discount.usage_per_user_limit}
                        </DetailRow>
                        <DetailRow label="Usage percentage">
                            {discount.usage_percentage || 0}%
                        </DetailRow>
                    </CardBody>
                </Card>
                <Card>
                    <CardHeader>
                        <h3 className="font-semibold text-[var(--color-text-main)]">
                            Thời gian
                        </h3>
                    </CardHeader>
                    <CardBody className="space-y-3">
                        <DetailRow label="Bắt đầu">
                            {formatDateTime(discount.started_at)}
                        </DetailRow>
                        <DetailRow label="Hết hạn">
                            {formatDateTime(discount.expiry_date)}
                        </DetailRow>
                        <DetailRow label="Còn lại" value={discount.time_remaining} />
                    </CardBody>
                </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <h3 className="font-semibold text-[var(--color-text-main)]">
                            Phạm vi sản phẩm
                        </h3>
                    </CardHeader>
                    <CardBody className="space-y-3">
                        <DetailRow
                            label="Loại"
                            value={targets.type_label || targets.type || 'all'}
                        />
                        <DetailRow label="Products">
                            {formatIds(targets.product_ids)}
                        </DetailRow>
                        <DetailRow label="Categories">
                            {formatIds(targets.category_ids)}
                        </DetailRow>
                        <DetailRow label="Variants">
                            {formatIds(targets.variant_ids)}
                        </DetailRow>
                    </CardBody>
                </Card>
                <Card>
                    <CardHeader>
                        <h3 className="font-semibold text-[var(--color-text-main)]">
                            Điều kiện user
                        </h3>
                    </CardHeader>
                    <CardBody className="space-y-3">
                        <DetailRow
                            label="Loại"
                            value={eligibility.type_label || eligibility.type || 'all'}
                        />
                        <DetailRow label="Users">
                            {formatIds(eligibility.user_ids)}
                        </DetailRow>
                        <DetailRow
                            label="Tier tối thiểu"
                            value={eligibility.min_user_tier}
                        />
                        <DetailRow label="Stacking">
                            {discount.is_stackable
                                ? `Có · priority ${discount.stack_priority || 0}`
                                : 'Không'}
                        </DetailRow>
                        <DetailRow label="Homepage">
                            {discount.show_on_homepage
                                ? `Có · priority ${discount.homepage_priority || 0}`
                                : 'Không'}
                        </DetailRow>
                        <DetailRow label="Claim voucher">
                            {discount.requires_claim ? 'Bắt buộc claim trước' : 'Không bắt buộc'}
                        </DetailRow>
                    </CardBody>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <h3 className="font-semibold text-[var(--color-text-main)]">
                        Thống kê sử dụng
                    </h3>
                </CardHeader>
                <CardBody className="grid gap-3 md:grid-cols-4">
                    <DetailRow label="Total used" value={stats?.total_used ?? 0} />
                    <DetailRow label="Unique users" value={stats?.unique_users ?? 0} />
                    <DetailRow label="Usage" value={`${stats?.usage_percentage ?? 0}%`} />
                    <DetailRow label="Last used">
                        {formatDateTime(stats?.last_used_at) || '-'}
                    </DetailRow>
                </CardBody>
            </Card>
        </div>
    );
}

export default function AdminDiscountsPage() {
    const [page, setPage] = useState(1);
    const [draftFilters, setDraftFilters] = useState({
        search: '',
        status: '',
        type: '',
        sortBy: '-created_at',
    });
    const [appliedFilters, setAppliedFilters] = useState(draftFilters);
    const [selectedDiscount, setSelectedDiscount] = useState(null);
    const [actionType, setActionType] = useState(null);
    const queryParams = useMemo(
        () => buildDiscountParams({ page, filters: appliedFilters }),
        [appliedFilters, page]
    );
    const nearExpiryParams = useMemo(
        () => ({ daysUntilExpiry: 7, page: 1, limit: 5 }),
        []
    );
    const discountsQuery = useAdminList('/discounts', queryParams);
    const nearExpiryQuery = useAdminList('/discounts/near-expiry', nearExpiryParams);
    const detailEndpoint = selectedDiscount
        ? `/discounts/${getDiscountId(selectedDiscount)}`
        : null;
    const detailQuery = useAdminDetail(detailEndpoint, {
        enabled: Boolean(detailEndpoint),
    });
    const statsEndpoint = selectedDiscount
        ? `/discounts/${getDiscountId(selectedDiscount)}/stats`
        : null;
    const statsQuery = useAdminDetail(statsEndpoint, {
        enabled: Boolean(statsEndpoint),
    });
    const createMutation = useAdminMutation({ method: 'post' });
    const updateMutation = useAdminMutation({ method: 'patch' });
    const duplicateMutation = useAdminMutation({ method: 'post' });
    const bulkMutation = useAdminMutation({ method: 'post' });
    const revokeMutation = useAdminMutation({ method: 'post' });
    const deleteMutation = useAdminMutation({ method: 'delete' });
    const discounts = getRows(discountsQuery.data);
    const nearExpiryDiscounts = getRows(nearExpiryQuery.data);
    const pagination = discountsQuery.data?.pagination || {};
    const totalPages = getPages(pagination);
    const discountDetail = detailQuery.data?.data || selectedDiscount;
    const actionForm =
        actionType === 'create' || actionType === 'edit'
            ? discountFormConfig
            : actionType === 'duplicate'
              ? duplicateDiscountFormConfig
              : actionType === 'bulk'
                ? bulkDiscountsFormConfig
                : null;
    const actionMutation =
        actionType === 'create'
            ? createMutation
            : actionType === 'edit'
              ? updateMutation
              : actionType === 'duplicate'
                ? duplicateMutation
                : bulkMutation;
    const totalDiscounts = pagination.total || 0;
    const activeOnPage = discounts.filter(
        (discount) => discount.status === 'active'
    ).length;
    const usageOnPage = discounts.reduce(
        (total, discount) => total + Number(discount.usage_count || 0),
        0
    );
    const nearExpiryTotal = nearExpiryQuery.data?.pagination?.total || 0;

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
            search: '',
            status: '',
            type: '',
            sortBy: '-created_at',
        };

        setDraftFilters(nextFilters);
        setAppliedFilters(nextFilters);
        setPage(1);
    };

    const refreshDiscounts = async () => {
        await discountsQuery.refetch();
        await nearExpiryQuery.refetch();

        if (detailEndpoint) {
            await detailQuery.refetch();
        }

        if (statsEndpoint) {
            await statsQuery.refetch();
        }
    };

    const resetActionMutations = () => {
        createMutation.reset();
        updateMutation.reset();
        duplicateMutation.reset();
        bulkMutation.reset();
    };

    const openAction = (type) => {
        resetActionMutations();
        setActionType(type);
    };

    const closeAction = () => {
        setActionType(null);
    };

    const openDetail = (discount) => {
        setSelectedDiscount(discount);
        setActionType(null);
    };

    const closeDetail = () => {
        setSelectedDiscount(null);
        setActionType(null);
        revokeMutation.reset();
        deleteMutation.reset();
    };

    const handleSubmitAction = async (values) => {
        if (!actionForm) {
            return;
        }

        const payload = actionForm.toPayload(values, {
            mode: actionType === 'create' || actionType === 'bulk' ? 'create' : 'edit',
            initialData: discountDetail,
        });

        if (actionType === 'create') {
            await createMutation.mutateAsync({
                endpoint: '/discounts',
                payload,
            });
        }

        if (actionType === 'edit' && discountDetail) {
            await updateMutation.mutateAsync({
                endpoint: `/discounts/${getDiscountId(discountDetail)}`,
                payload,
            });
        }

        if (actionType === 'duplicate' && discountDetail) {
            await duplicateMutation.mutateAsync({
                endpoint: `/discounts/${getDiscountId(discountDetail)}/duplicate`,
                payload,
            });
        }

        if (actionType === 'bulk') {
            await bulkMutation.mutateAsync({
                endpoint: '/discounts/bulk/import',
                payload,
            });
        }

        closeAction();
        await refreshDiscounts();
    };

    const handleRevoke = async () => {
        if (!discountDetail) {
            return;
        }

        const confirmed = window.confirm(`Revoke mã ${discountDetail.code}?`);

        if (!confirmed) {
            return;
        }

        await revokeMutation.mutateAsync({
            endpoint: `/discounts/${getDiscountId(discountDetail)}/revoke`,
        });
        await refreshDiscounts();
    };

    const handleDelete = async () => {
        if (!discountDetail) {
            return;
        }

        const confirmed = window.confirm(`Xóa mềm mã ${discountDetail.code}?`);

        if (!confirmed) {
            return;
        }

        await deleteMutation.mutateAsync({
            endpoint: `/discounts/${getDiscountId(discountDetail)}`,
        });
        closeDetail();
        await refreshDiscounts();
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <p className="text-sm font-medium text-[var(--color-primary-hover)]">
                        Admin
                    </p>
                    <h1 className="mt-1 text-2xl font-semibold text-[var(--color-text-main)]">
                        Quản lý mã giảm giá
                    </h1>
                    <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                        ADMIN tạo mã, giới hạn usage, phạm vi áp dụng và điều kiện user.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => openAction('bulk')}>
                        <Upload className="h-4 w-4" />
                        Import
                    </Button>
                    <Button onClick={() => openAction('create')}>
                        <Plus className="h-4 w-4" />
                        Tạo mã
                    </Button>
                    <Button
                        variant="outline"
                        isLoading={
                            discountsQuery.isFetching ||
                            nearExpiryQuery.isFetching
                        }
                        onClick={refreshDiscounts}
                    >
                        <RefreshCw className="h-4 w-4" />
                        Tải lại
                    </Button>
                </div>
            </div>

            <StatsPanel
                total={totalDiscounts}
                activeOnPage={activeOnPage}
                nearExpiryTotal={nearExpiryTotal}
                usageOnPage={usageOnPage}
            />

            <NearExpiryPanel discounts={nearExpiryDiscounts} />

            <Card>
                <CardHeader>
                    <DiscountFilters
                        values={draftFilters}
                        onChange={handleFilterChange}
                        onApply={handleApplyFilters}
                        onReset={handleResetFilters}
                    />
                </CardHeader>
                <CardBody>
                    {discountsQuery.isLoading ? (
                        <Loading label="Đang tải mã giảm giá..." />
                    ) : discountsQuery.isError ? (
                        <EmptyState
                            icon={Search}
                            title="Không tải được mã giảm giá"
                            description={discountsQuery.error.message}
                        />
                    ) : discounts.length === 0 ? (
                        <EmptyState
                            icon={TicketPercent}
                            title="Chưa có mã giảm giá"
                            description="Tạo mã giảm giá đầu tiên để dùng trong checkout."
                        />
                    ) : (
                        <div className="space-y-4">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
                                    <thead>
                                        <tr className="bg-[var(--color-background)] text-left text-xs font-semibold uppercase text-[var(--color-text-muted)]">
                                            <th className="px-4 py-3">Mã</th>
                                            <th className="px-4 py-3">Loại</th>
                                            <th className="px-4 py-3">Giá trị</th>
                                            <th className="px-4 py-3">Usage</th>
                                            <th className="px-4 py-3">Homepage</th>
                                            <th className="px-4 py-3">Trạng thái</th>
                                            <th className="px-4 py-3">Còn lại</th>
                                            <th className="px-4 py-3">Ngày tạo</th>
                                            <th className="px-4 py-3 text-right">Tác vụ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-surface)]">
                                        {discounts.map((discount) => (
                                            <tr key={getDiscountId(discount)}>
                                                <td className="px-4 py-3 font-medium text-[var(--color-text-main)]">
                                                    {discount.code}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <StatusBadge
                                                        value={discount.type}
                                                        label={discount.type}
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-[var(--color-text-main)]">
                                                    {formatDiscountValue(discount)}
                                                </td>
                                                <td className="px-4 py-3 text-[var(--color-text-main)]">
                                                    {discount.usage_count || 0}/{discount.usage_limit}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-wrap gap-2">
                                                        {discount.show_on_homepage ? (
                                                            <StatusBadge
                                                                value="active"
                                                                label={`Có · ${discount.homepage_priority || 0}`}
                                                            />
                                                        ) : (
                                                            <StatusBadge
                                                                value="inactive"
                                                                label="Không"
                                                            />
                                                        )}
                                                        {discount.requires_claim && (
                                                            <StatusBadge
                                                                value="paused"
                                                                label="Claim"
                                                            />
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <StatusBadge value={discount.status} />
                                                </td>
                                                <td className="px-4 py-3 text-[var(--color-text-main)]">
                                                    {discount.time_remaining}
                                                </td>
                                                <td className="px-4 py-3 text-[var(--color-text-main)]">
                                                    {formatDateTime(discount.created_at)}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => openDetail(discount)}
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
                open={Boolean(selectedDiscount)}
                title={discountDetail?.code || 'Chi tiết mã giảm giá'}
                onClose={closeDetail}
                panelClassName="max-w-7xl"
            >
                {detailQuery.isLoading || statsQuery.isLoading ? (
                    <Loading label="Đang tải chi tiết mã giảm giá..." />
                ) : detailQuery.isError ? (
                    <EmptyState
                        title="Không tải được chi tiết mã giảm giá"
                        description={detailQuery.error.message}
                    />
                ) : (
                    <div className="space-y-4">
                        <DiscountDetailPanel
                            discount={discountDetail}
                            stats={statsQuery.data?.data}
                            isRevoking={revokeMutation.isPending}
                            isDeleting={deleteMutation.isPending}
                            onOpenAction={openAction}
                            onRevoke={handleRevoke}
                            onDelete={handleDelete}
                        />

                        {revokeMutation.isError && (
                            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--color-error)]">
                                {revokeMutation.error.message}
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

            {actionForm && (
                <Modal
                    open={Boolean(actionType)}
                    title={actionTitles[actionType]}
                    onClose={closeAction}
                    panelClassName="max-w-6xl"
                >
                    <AdminResourceForm
                        form={actionForm}
                        mode={actionType === 'create' || actionType === 'bulk' ? 'create' : 'edit'}
                        initialData={
                            actionType === 'create' || actionType === 'bulk'
                                ? null
                                : discountDetail
                        }
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
