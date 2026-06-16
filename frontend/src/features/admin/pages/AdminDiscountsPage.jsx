import { translate } from '../../../shared/i18n/index';
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
    create: translate('text.create_discount_code'),
    edit: translate('text.update_discount_code'),
    duplicate: translate('text.duplicate_discount_code'),
    bulk: translate('text.import_discount_code'),
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
                    <p className="text-sm text-[var(--color-text-muted)]"> {translate('text.total_code')} </p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--color-text-main)]">
                        {total}
                    </p>
                </CardBody>
            </Card>
            <Card>
                <CardBody>
                    <p className="text-sm text-[var(--color-text-muted)]"> {translate('text.active_on_page')} </p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--color-primary-hover)]">
                        {activeOnPage}
                    </p>
                </CardBody>
            </Card>
            <Card>
                <CardBody>
                    <p className="text-sm text-[var(--color-text-muted)]"> {translate('text.expires_almost_7_days')} </p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--color-warning)]">
                        {nearExpiryTotal}
                    </p>
                </CardBody>
            </Card>
            <Card>
                <CardBody>
                    <p className="text-sm text-[var(--color-text-muted)]"> {translate('text.number_of_uses_on_page')} </p>
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
                label={translate('text.find_code')}
                value={values.search}
                placeholder={translate('text.baotrai')}
                onChange={(event) => onChange('search', event.target.value)}
            />
            <Select
                label={translate('text.status')}
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
                label={translate('text.type')}
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
                label={translate('text.sort')}
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
                    <Filter className="h-4 w-4" /> {translate('text.filter')} </Button>
                <Button type="button" variant="outline" onClick={onReset}> {translate('text.clear_filter')} </Button>
            </div>
        </div>
    );
}

function NearExpiryPanel({ discounts }) {
    return (
        <Card>
            <CardHeader>
                <h3 className="font-semibold text-[var(--color-text-main)]"> {translate('text.expiring_soon')} </h3>
            </CardHeader>
            <CardBody>
                {discounts.length === 0 ? (
                    <p className="text-sm text-[var(--color-text-muted)]"> {translate('text.no_codes_will_expire_in_the_next_7_days')} </p>
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
                            <StatusBadge value="active" label={translate('text.homepage')} />
                        )}
                        {discount.requires_claim && (
                            <StatusBadge value="paused" label={translate('text.claim_before')} />
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
                        <Plus className="h-4 w-4" /> {translate('text.edit_0963749f')} </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onOpenAction('duplicate')}
                    >
                        <Copy className="h-4 w-4" /> {translate('text.duplicate')} </Button>
                    {discount.status !== 'inactive' && discount.status !== 'expired' && (
                        <Button
                            size="sm"
                            variant="warning"
                            isLoading={isRevoking}
                            onClick={onRevoke}
                        >
                            <PowerOff className="h-4 w-4" /> {translate('text.revoke')} </Button>
                    )}
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
                        <h3 className="font-semibold text-[var(--color-text-main)]"> {translate('text.value')} </h3>
                    </CardHeader>
                    <CardBody className="space-y-3">
                        <DetailRow label={translate('text.reduce')}>
                            {formatDiscountValue(discount)}
                        </DetailRow>
                        <DetailRow label={translate('text.maximum')}>
                            {discount.max_discount_amount
                                ? formatMoney(discount.max_discount_amount)
                                : '-'}
                        </DetailRow>
                        <DetailRow label={translate('text.minimum_order')}>
                            {formatMoney(discount.min_order_value || 0)}
                        </DetailRow>
                    </CardBody>
                </Card>
                <Card>
                    <CardHeader>
                        <h3 className="font-semibold text-[var(--color-text-main)]"> {translate('text.usage')} </h3>
                    </CardHeader>
                    <CardBody className="space-y-3">
                        <DetailRow label={translate('text.used')}>
                            {discount.usage_count || 0}/{discount.usage_limit}
                        </DetailRow>
                        <DetailRow label={translate('text.total_claims')}>
                            {discount.claim_limit
                                ? `${discount.claim_count || 0}/${discount.claim_limit}`
                                : discount.claim_count || 0}
                        </DetailRow>
                        <DetailRow label={translate('text.per_user')}>
                            {discount.usage_per_user_limit}
                        </DetailRow>
                        <DetailRow label={translate('text.usage_percentage')}>
                            {discount.usage_percentage || 0}%
                        </DetailRow>
                    </CardBody>
                </Card>
                <Card>
                    <CardHeader>
                        <h3 className="font-semibold text-[var(--color-text-main)]"> {translate('text.time')} </h3>
                    </CardHeader>
                    <CardBody className="space-y-3">
                        <DetailRow label={translate('text.start')}>
                            {formatDateTime(discount.started_at)}
                        </DetailRow>
                        <DetailRow label={translate('text.expires')}>
                            {formatDateTime(discount.expiry_date)}
                        </DetailRow>
                        <DetailRow label={translate('text.remaining')} value={discount.time_remaining} />
                    </CardBody>
                </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <h3 className="font-semibold text-[var(--color-text-main)]"> {translate('text.product_range')} </h3>
                    </CardHeader>
                    <CardBody className="space-y-3">
                        <DetailRow
                            label={translate('text.type')}
                            value={targets.type_label || targets.type || 'all'}
                        />
                        <DetailRow label={translate('text.products')}>
                            {formatIds(targets.product_ids)}
                        </DetailRow>
                        <DetailRow label={translate('text.categories')}>
                            {formatIds(targets.category_ids)}
                        </DetailRow>
                        <DetailRow label={translate('text.variants')}>
                            {formatIds(targets.variant_ids)}
                        </DetailRow>
                    </CardBody>
                </Card>
                <Card>
                    <CardHeader>
                        <h3 className="font-semibold text-[var(--color-text-main)]"> {translate('text.user_condition')} </h3>
                    </CardHeader>
                    <CardBody className="space-y-3">
                        <DetailRow
                            label={translate('text.type')}
                            value={eligibility.type_label || eligibility.type || 'all'}
                        />
                        <DetailRow label={translate('text.users')}>
                            {formatIds(eligibility.user_ids)}
                        </DetailRow>
                        <DetailRow
                            label={translate('text.minimum_tier')}
                            value={eligibility.min_user_tier}
                        />
                        <DetailRow label={translate('text.stacking')}>
                            {discount.is_stackable
                                ? translate('text.yes_priority_value', { value0: discount.stack_priority || 0 })
                                : translate('text.no')}
                        </DetailRow>
                        <DetailRow label={translate('text.homepage')}>
                            {discount.show_on_homepage
                                ? translate('text.yes_priority_value', { value0: discount.homepage_priority || 0 })
                                : translate('text.no')}
                        </DetailRow>
                        <DetailRow label={translate('text.claim_voucher')}>
                            {discount.requires_claim ? translate('text.required_to_claim_before') : translate('text.optional')}
                        </DetailRow>
                    </CardBody>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <h3 className="font-semibold text-[var(--color-text-main)]"> {translate('text.usage_statistics')} </h3>
                </CardHeader>
                <CardBody className="grid gap-3 md:grid-cols-4">
                    <DetailRow label={translate('text.total_used')} value={stats?.total_used ?? 0} />
                    <DetailRow label={translate('text.unique_users')} value={stats?.unique_users ?? 0} />
                    <DetailRow label={translate('text.usage')} value={`${stats?.usage_percentage ?? 0}%`} />
                    <DetailRow label={translate('text.last_used')}>
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

        const confirmed = window.confirm(translate('text.revoke_code_value', { value0: discountDetail.code }));

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

        const confirmed = window.confirm(translate('text.soft_delete_code_value', { value0: discountDetail.code }));

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
                    <p className="text-sm font-medium text-[var(--color-primary-hover)]"> {translate('text.admin')} </p>
                    <h1 className="mt-1 text-2xl font-semibold text-[var(--color-text-main)]"> {translate('text.manage_discount_code')} </h1>
                    <p className="mt-2 text-sm text-[var(--color-text-muted)]"> {translate('text.admin_creates_code_usage_limits_application_scope_and_user_conditions')} </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => openAction('bulk')}>
                        <Upload className="h-4 w-4" /> {translate('text.import')} </Button>
                    <Button onClick={() => openAction('create')}>
                        <Plus className="h-4 w-4" /> {translate('text.generate_code')} </Button>
                    <Button
                        variant="outline"
                        isLoading={
                            discountsQuery.isFetching ||
                            nearExpiryQuery.isFetching
                        }
                        onClick={refreshDiscounts}
                    >
                        <RefreshCw className="h-4 w-4" /> {translate('text.reload')} </Button>
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
                        <Loading label={translate('text.loading_discount_code')} />
                    ) : discountsQuery.isError ? (
                        <EmptyState
                            icon={Search}
                            title={translate('text.unable_to_load_discount_code')}
                            description={discountsQuery.error.message}
                        />
                    ) : discounts.length === 0 ? (
                        <EmptyState
                            icon={TicketPercent}
                            title={translate('text.no_discount_code_yet')}
                            description={translate('text.create_the_first_discount_code_to_use_in_checkout')}
                        />
                    ) : (
                        <div className="space-y-4">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
                                    <thead>
                                        <tr className="bg-[var(--color-background)] text-left text-xs font-semibold uppercase text-[var(--color-text-muted)]">
                                            <th className="px-4 py-3">{translate('text.code')}</th>
                                            <th className="px-4 py-3">{translate('text.type')}</th>
                                            <th className="px-4 py-3">{translate('text.value')}</th>
                                            <th className="px-4 py-3">{translate('text.usage')}</th>
                                            <th className="px-4 py-3">{translate('text.homepage')}</th>
                                            <th className="px-4 py-3">{translate('text.status')}</th>
                                            <th className="px-4 py-3">{translate('text.remaining')}</th>
                                            <th className="px-4 py-3">{translate('text.creation_date')}</th>
                                            <th className="px-4 py-3 text-right">{translate('text.task')}</th>
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
                                                    <div>{discount.usage_count || 0}/{discount.usage_limit}</div>
                                                    <div className="mt-1 text-xs text-[var(--color-text-muted)]">
                                                        {translate('text.claim_voucher')}:{' '}
                                                        {discount.claim_limit
                                                            ? `${discount.claim_count || 0}/${discount.claim_limit}`
                                                            : discount.claim_count || 0}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-wrap gap-2">
                                                        {discount.show_on_homepage ? (
                                                            <StatusBadge
                                                                value="active"
                                                                label={translate('text.yes_value', { value0: discount.homepage_priority || 0 })}
                                                            />
                                                        ) : (
                                                            <StatusBadge
                                                                value="inactive"
                                                                label={translate('text.no')}
                                                            />
                                                        )}
                                                        {discount.requires_claim && (
                                                            <StatusBadge
                                                                value="paused"
                                                                label={translate('text.claim')}
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
                open={Boolean(selectedDiscount)}
                title={discountDetail?.code || translate('text.details_of_discount_code')}
                onClose={closeDetail}
                panelClassName="max-w-7xl"
            >
                {detailQuery.isLoading || statsQuery.isLoading ? (
                    <Loading label={translate('text.loading_discount_code_details')} />
                ) : detailQuery.isError ? (
                    <EmptyState
                        title={translate('text.unable_to_download_discount_code_details')}
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
