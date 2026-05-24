import {
    Eye,
    Filter,
    FileSearch,
    RefreshCw,
    Search,
    ShieldAlert,
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
} from '../hooks/useAdminResource';
import {
    formatDateTime,
    StatusBadge,
} from '../utils/adminFormat';

const domainOptions = [
    { value: '', label: 'Tất cả domain' },
    { value: 'AUTH', label: 'AUTH' },
    { value: 'USER', label: 'USER' },
    { value: 'USER_ADDRESS', label: 'USER_ADDRESS' },
    { value: 'CATEGORY', label: 'CATEGORY' },
    { value: 'PRODUCT', label: 'PRODUCT' },
    { value: 'PAYMENT', label: 'PAYMENT' },
    { value: 'ORDER', label: 'ORDER' },
    { value: 'SHIPMENT', label: 'SHIPMENT' },
    { value: 'DISCOUNT', label: 'DISCOUNT' },
    { value: 'REVIEW', label: 'REVIEW' },
    { value: 'SHOP_CONTENT', label: 'SHOP_CONTENT' },
    { value: 'CART', label: 'CART' },
    { value: 'NOTIFICATION', label: 'NOTIFICATION' },
    { value: 'EMAIL', label: 'EMAIL' },
];

const levelOptions = [
    { value: '', label: 'Tất cả level' },
    { value: 'INFO', label: 'INFO' },
    { value: 'IMPORTANT', label: 'IMPORTANT' },
    { value: 'SECURITY', label: 'SECURITY' },
];

const actionMap = {
    AUTH: [
        'AUTH_LOGIN',
        'AUTH_CHANGE_PASSWORD',
        'AUTH_FORGOT_PASSWORD',
        'AUTH_RESET_PASSWORD',
        'AUTH_REGISTER',
    ],
    USER: [
        'UPDATE_USER_PROFILE',
        'UPDATE_USER_ROLES',
        'UPDATE_USER_STATUS',
        'DELETE_USER_SOFT',
    ],
    USER_ADDRESS: [
        'CREATE_USER_ADDRESS',
        'UPDATE_USER_ADDRESS',
        'DELETE_USER_ADDRESS',
        'SET_DEFAULT_USER_ADDRESS',
    ],
    CATEGORY: [
        'CREATE_CATEGORY',
        'UPDATE_CATEGORY',
        'DELETE_CATEGORY_SOFT',
        'DELETE_CATEGORY_HARD',
        'RESTORE_CATEGORY',
    ],
    PRODUCT: [
        'CREATE_PRODUCT',
        'UPDATE_PRODUCT',
        'DELETE_PRODUCT_SOFT',
        'CREATE_VARIANT',
        'UPDATE_VARIANT',
        'DELETE_VARIANT_SOFT',
        'CREATE_VARIANT_UNIT',
        'UPDATE_VARIANT_UNIT',
        'DELETE_VARIANT_UNIT',
        'RESERVE_VARIANT_STOCK',
        'COMPLETE_VARIANT_SALE',
        'RELEASE_VARIANT_STOCK',
    ],
    PAYMENT: [
        'CREATE_PAYMENT',
        'RETRY_PAYMENT',
        'CANCEL_PAYMENT',
        'ADMIN_VERIFY_PAYMENT',
        'DELETE_PAYMENT_SOFT',
        'VNPAY_WEBHOOK_PAYMENT',
        'STRIPE_WEBHOOK_PAYMENT',
        'PAYPAL_WEBHOOK_PAYMENT',
        'PAYMENT_WEBHOOK_AMOUNT_MISMATCH',
        'PAYMENT_WEBHOOK_REJECTED',
    ],
    ORDER: [
        'CREATE_ORDER',
        'CANCEL_ORDER',
        'ADMIN_UPDATE_ORDER_STATUS',
        'ADMIN_UPDATE_ORDER',
        'FULFILL_ORDER_ITEMS',
        'RECORD_ORDER_SHIPMENT',
        'CONFIRM_ORDER_DELIVERY',
    ],
    SHIPMENT: [
        'CREATE_SHIPMENT',
        'SHIPMENT_WEBHOOK_STATUS',
        'SHIPMENT_WEBHOOK_REJECTED',
        'UPDATE_SHIPMENT_STATUS',
        'RECORD_SHIPMENT_FAILURE',
        'CANCEL_SHIPMENT',
        'RETRY_SHIPMENT',
        'CONFIRM_SHIPMENT_DELIVERY',
        'ADMIN_UPDATE_SHIPMENT',
        'DELETE_SHIPMENT_SOFT',
    ],
    DISCOUNT: [
        'CREATE_DISCOUNT',
        'BULK_IMPORT_DISCOUNTS',
        'UPDATE_DISCOUNT',
        'DELETE_DISCOUNT_SOFT',
        'REVOKE_DISCOUNT',
        'DUPLICATE_DISCOUNT',
        'REDEEM_DISCOUNT',
    ],
    REVIEW: [
        'CREATE_REVIEW',
        'UPDATE_REVIEW',
        'DELETE_REVIEW_SOFT',
        'FLAG_REVIEW',
        'APPROVE_REVIEW',
        'REJECT_REVIEW',
    ],
    SHOP_CONTENT: [
        'CREATE_BANNER',
        'UPDATE_BANNER',
        'DELETE_BANNER_SOFT',
        'RESTORE_BANNER',
        'CREATE_ANNOUNCEMENT',
        'UPDATE_ANNOUNCEMENT',
        'DELETE_ANNOUNCEMENT_SOFT',
        'RESTORE_ANNOUNCEMENT',
        'CREATE_SHOP_INFO',
        'UPDATE_SHOP_INFO',
        'UPDATE_SHOP_INFO_STATUS',
    ],
    CART: [
        'ADD_CART_ITEM',
        'UPDATE_CART_ITEM_QUANTITY',
        'REMOVE_CART_ITEM',
        'APPLY_CART_DISCOUNT',
        'REMOVE_CART_DISCOUNT',
        'MERGE_CART',
        'CHECKOUT_CART',
        'CLEAR_CART',
    ],
    NOTIFICATION: [
        'MARK_NOTIFICATION_READ',
        'MARK_BULK_NOTIFICATIONS_READ',
        'MARK_ALL_NOTIFICATIONS_READ',
        'DELETE_NOTIFICATION_SOFT',
        'DELETE_ALL_NOTIFICATIONS_SOFT',
    ],
    EMAIL: [
        'ENQUEUE_EMAIL',
        'EMAIL_SEND_SUCCESS',
        'EMAIL_SEND_FAILED',
    ],
};

const allActionOptions = [
    ...new Set(Object.values(actionMap).flat()),
].sort();

const idFields = [
    'actor_id',
    'user_id',
    'order_id',
    'payment_id',
    'shipment_id',
    'product_id',
    'variant_id',
    'unit_id',
    'cart_id',
    'category_id',
    'discount_id',
    'review_id',
    'notification_id',
    'email_job_id',
    'address_id',
    'banner_id',
    'announcement_id',
    'shop_info_id',
    'target_id',
    'source_cart_id',
    'source_discount_id',
];

function getLogId(log) {
    return log?.id || log?._id;
}

function getRows(response) {
    return Array.isArray(response?.data) ? response.data : [];
}

function getPages(pagination = {}) {
    return pagination.total_pages || pagination.totalPages || pagination.pages || 1;
}

function getCurrentPage(pagination = {}, fallback) {
    return pagination.current_page || pagination.page || fallback;
}

function getTotalItems(pagination = {}) {
    return pagination.total_items || pagination.total || 0;
}

function buildAuditParams({ page, filters }) {
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

function getActionOptions(domain) {
    const actions = domain ? actionMap[domain] || [] : allActionOptions;

    return [
        { value: '', label: domain ? `Tất cả action ${domain}` : 'Tất cả action' },
        ...actions.map((action) => ({ value: action, label: action })),
    ];
}

function getTargetLabel(log = {}) {
    return (
        log.target_id ||
        log.order_id ||
        log.payment_id ||
        log.shipment_id ||
        log.user_id ||
        log.product_id ||
        log.cart_id ||
        log.discount_id ||
        log.email_job_id ||
        '-'
    );
}

function formatJson(value) {
    if (value === undefined || value === null) {
        return '-';
    }

    if (typeof value === 'string') {
        return value;
    }

    return JSON.stringify(value, null, 2);
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

function JsonPanel({ title, value }) {
    return (
        <Card>
            <CardHeader>
                <h3 className="font-semibold text-[var(--color-text-main)]">
                    {title}
                </h3>
            </CardHeader>
            <CardBody>
                <pre className="max-h-80 overflow-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3 text-xs leading-5 text-[var(--color-text-main)]">
                    {formatJson(value)}
                </pre>
            </CardBody>
        </Card>
    );
}

function StatsPanel({ total, logs }) {
    const securityCount = logs.filter((log) => log.level === 'SECURITY').length;
    const importantCount = logs.filter((log) => log.level === 'IMPORTANT').length;
    const domainsOnPage = new Set(logs.map((log) => log.domain)).size;

    return (
        <div className="grid gap-4 lg:grid-cols-4">
            <Card>
                <CardBody>
                    <p className="text-sm text-[var(--color-text-muted)]">
                        Tổng log
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--color-text-main)]">
                        {total}
                    </p>
                </CardBody>
            </Card>
            <Card>
                <CardBody>
                    <p className="text-sm text-[var(--color-text-muted)]">
                        SECURITY trên trang
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--color-error)]">
                        {securityCount}
                    </p>
                </CardBody>
            </Card>
            <Card>
                <CardBody>
                    <p className="text-sm text-[var(--color-text-muted)]">
                        IMPORTANT trên trang
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--color-warning)]">
                        {importantCount}
                    </p>
                </CardBody>
            </Card>
            <Card>
                <CardBody>
                    <p className="text-sm text-[var(--color-text-muted)]">
                        Domain trên trang
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--color-primary-hover)]">
                        {domainsOnPage}
                    </p>
                </CardBody>
            </Card>
        </div>
    );
}

function AuditFilters({
    values,
    actionOptions,
    onChange,
    onApply,
    onReset,
}) {
    return (
        <div className="space-y-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4">
            <div className="grid gap-3 lg:grid-cols-4">
                <Select
                    label="Domain"
                    value={values.domain}
                    onChange={(event) => onChange('domain', event.target.value)}
                >
                    {domainOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </Select>
                <Select
                    label="Action"
                    value={values.action}
                    onChange={(event) => onChange('action', event.target.value)}
                >
                    {actionOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </Select>
                <Select
                    label="Level"
                    value={values.level}
                    onChange={(event) => onChange('level', event.target.value)}
                >
                    {levelOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </Select>
                <Input
                    label="Target type"
                    value={values.target_type}
                    placeholder="Order, Payment..."
                    onChange={(event) => onChange('target_type', event.target.value)}
                />
            </div>
            <div className="grid gap-3 lg:grid-cols-5">
                <Input
                    label="Actor ID"
                    value={values.actor_id}
                    onChange={(event) => onChange('actor_id', event.target.value)}
                />
                <Input
                    label="User ID"
                    value={values.user_id}
                    onChange={(event) => onChange('user_id', event.target.value)}
                />
                <Input
                    label="Order ID"
                    value={values.order_id}
                    onChange={(event) => onChange('order_id', event.target.value)}
                />
                <Input
                    label="Target ID"
                    value={values.target_id}
                    onChange={(event) => onChange('target_id', event.target.value)}
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
        </div>
    );
}

function DomainShortcuts({ selectedDomain, onSelect }) {
    const domains = domainOptions.filter((option) => option.value);

    return (
        <div className="flex flex-wrap gap-2">
            {domains.map((domain) => (
                <Button
                    key={domain.value}
                    size="sm"
                    variant={selectedDomain === domain.value ? 'secondary' : 'outline'}
                    onClick={() => onSelect(domain.value)}
                >
                    {domain.label}
                </Button>
            ))}
        </div>
    );
}

function IdGrid({ log }) {
    const entries = idFields
        .map((field) => [field, log?.[field]])
        .filter(([, value]) => {
            if (Array.isArray(value)) {
                return value.length > 0;
            }

            return Boolean(value);
        });

    if (!entries.length) {
        return (
            <p className="text-sm text-[var(--color-text-muted)]">
                Không có id phụ.
            </p>
        );
    }

    return (
        <div className="grid gap-3 md:grid-cols-2">
            {entries.map(([field, value]) => (
                <DetailRow key={field} label={field}>
                    {Array.isArray(value) ? value.join(', ') : String(value)}
                </DetailRow>
            ))}
        </div>
    );
}

function AuditLogDetailPanel({ log }) {
    return (
        <div className="space-y-5">
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4">
                <div className="flex flex-wrap items-center gap-2">
                    <h2 className="break-all text-xl font-semibold text-[var(--color-text-main)]">
                        {getLogId(log)}
                    </h2>
                    <StatusBadge value={log.domain} label={log.domain} />
                    <StatusBadge value={log.level} label={log.level} />
                </div>
                <p className="mt-2 break-words text-sm text-[var(--color-text-muted)]">
                    {log.action}
                </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <h3 className="font-semibold text-[var(--color-text-main)]">
                            Actor
                        </h3>
                    </CardHeader>
                    <CardBody className="space-y-3">
                        <DetailRow label="Actor ID" value={log.actor_id} />
                        <DetailRow label="Actor type" value={log.actor_type} />
                        <DetailRow label="IP" value={log.ip_address} />
                    </CardBody>
                </Card>
                <Card>
                    <CardHeader>
                        <h3 className="font-semibold text-[var(--color-text-main)]">
                            Target
                        </h3>
                    </CardHeader>
                    <CardBody className="space-y-3">
                        <DetailRow label="Target type" value={log.target_type} />
                        <DetailRow label="Target ID" value={getTargetLabel(log)} />
                        <DetailRow label="Status" value={log.status} />
                    </CardBody>
                </Card>
                <Card>
                    <CardHeader>
                        <h3 className="font-semibold text-[var(--color-text-main)]">
                            Thời gian
                        </h3>
                    </CardHeader>
                    <CardBody className="space-y-3">
                        <DetailRow label="Created">
                            {formatDateTime(log.created_at)}
                        </DetailRow>
                        <DetailRow label="Provider" value={log.provider} />
                        <DetailRow label="Template" value={log.template} />
                    </CardBody>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <h3 className="font-semibold text-[var(--color-text-main)]">
                        ID liên quan
                    </h3>
                </CardHeader>
                <CardBody>
                    <IdGrid log={log} />
                </CardBody>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
                <JsonPanel title="Changes" value={log.changes} />
                <JsonPanel title="Metadata" value={log.metadata} />
            </div>

            <JsonPanel title="User agent" value={log.user_agent} />
        </div>
    );
}

export default function AdminAuditLogsPage() {
    const [page, setPage] = useState(1);
    const [draftFilters, setDraftFilters] = useState({
        domain: '',
        action: '',
        level: '',
        actor_id: '',
        user_id: '',
        order_id: '',
        target_type: '',
        target_id: '',
    });
    const [appliedFilters, setAppliedFilters] = useState(draftFilters);
    const [selectedLog, setSelectedLog] = useState(null);
    const queryParams = useMemo(
        () => buildAuditParams({ page, filters: appliedFilters }),
        [appliedFilters, page]
    );
    const actionOptions = useMemo(
        () => getActionOptions(draftFilters.domain),
        [draftFilters.domain]
    );
    const logsQuery = useAdminList('/audit-logs', queryParams);
    const detailEndpoint = selectedLog
        ? `/audit-logs/${getLogId(selectedLog)}`
        : null;
    const detailQuery = useAdminDetail(detailEndpoint, {
        enabled: Boolean(detailEndpoint),
    });
    const logs = getRows(logsQuery.data);
    const pagination = logsQuery.data?.pagination || {};
    const totalPages = getPages(pagination);
    const logDetail = detailQuery.data?.data || selectedLog;

    const handleFilterChange = (name, value) => {
        setDraftFilters((current) => {
            const next = {
                ...current,
                [name]: value,
            };

            if (name === 'domain') {
                next.action = '';
            }

            return next;
        });
    };

    const handleApplyFilters = () => {
        setAppliedFilters(draftFilters);
        setPage(1);
    };

    const handleResetFilters = () => {
        const nextFilters = {
            domain: '',
            action: '',
            level: '',
            actor_id: '',
            user_id: '',
            order_id: '',
            target_type: '',
            target_id: '',
        };

        setDraftFilters(nextFilters);
        setAppliedFilters(nextFilters);
        setPage(1);
    };

    const handleDomainShortcut = (domain) => {
        const nextFilters = {
            ...draftFilters,
            domain,
            action: '',
        };

        setDraftFilters(nextFilters);
        setAppliedFilters(nextFilters);
        setPage(1);
    };

    const refreshLogs = async () => {
        await logsQuery.refetch();

        if (detailEndpoint) {
            await detailQuery.refetch();
        }
    };

    const openDetail = (log) => {
        setSelectedLog(log);
    };

    const closeDetail = () => {
        setSelectedLog(null);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <p className="text-sm font-medium text-[var(--color-primary-hover)]">
                        Admin
                    </p>
                    <h1 className="mt-1 text-2xl font-semibold text-[var(--color-text-main)]">
                        Audit logs
                    </h1>
                    <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                        ADMIN tra cứu lịch sử thao tác, đối soát thay đổi và kiểm tra sự kiện nhạy cảm.
                    </p>
                </div>
                <Button
                    variant="outline"
                    isLoading={logsQuery.isFetching}
                    onClick={refreshLogs}
                >
                    <RefreshCw className="h-4 w-4" />
                    Tải lại
                </Button>
            </div>

            <StatsPanel total={getTotalItems(pagination)} logs={logs} />

            <Card>
                <CardHeader>
                    <div className="space-y-4">
                        <DomainShortcuts
                            selectedDomain={draftFilters.domain}
                            onSelect={handleDomainShortcut}
                        />
                        <AuditFilters
                            values={draftFilters}
                            actionOptions={actionOptions}
                            onChange={handleFilterChange}
                            onApply={handleApplyFilters}
                            onReset={handleResetFilters}
                        />
                    </div>
                </CardHeader>
                <CardBody>
                    {logsQuery.isLoading ? (
                        <Loading label="Đang tải audit logs..." />
                    ) : logsQuery.isError ? (
                        <EmptyState
                            icon={Search}
                            title="Không tải được audit logs"
                            description={logsQuery.error.message}
                        />
                    ) : logs.length === 0 ? (
                        <EmptyState
                            icon={FileSearch}
                            title="Chưa có audit log"
                            description="Các thao tác hệ thống sẽ hiển thị tại đây sau khi phát sinh."
                        />
                    ) : (
                        <div className="space-y-4">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
                                    <thead>
                                        <tr className="bg-[var(--color-background)] text-left text-xs font-semibold uppercase text-[var(--color-text-muted)]">
                                            <th className="px-4 py-3">Thời gian</th>
                                            <th className="px-4 py-3">Domain</th>
                                            <th className="px-4 py-3">Level</th>
                                            <th className="px-4 py-3">Action</th>
                                            <th className="px-4 py-3">Actor</th>
                                            <th className="px-4 py-3">Target</th>
                                            <th className="px-4 py-3">IP</th>
                                            <th className="px-4 py-3 text-right">Tác vụ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-surface)]">
                                        {logs.map((log) => (
                                            <tr key={getLogId(log)}>
                                                <td className="px-4 py-3 text-[var(--color-text-main)]">
                                                    {formatDateTime(log.created_at)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <StatusBadge
                                                        value={log.domain}
                                                        label={log.domain}
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <StatusBadge
                                                        value={log.level}
                                                        label={log.level}
                                                    />
                                                </td>
                                                <td className="max-w-72 break-words px-4 py-3 font-medium text-[var(--color-text-main)]">
                                                    {log.action}
                                                </td>
                                                <td className="max-w-56 break-all px-4 py-3 text-[var(--color-text-main)]">
                                                    {log.actor_type || log.actor_id || '-'}
                                                </td>
                                                <td className="max-w-56 break-all px-4 py-3 text-[var(--color-text-main)]">
                                                    {getTargetLabel(log)}
                                                </td>
                                                <td className="px-4 py-3 text-[var(--color-text-main)]">
                                                    {log.ip_address || '-'}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => openDetail(log)}
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
                                page={getCurrentPage(pagination, page)}
                                totalPages={totalPages}
                                onPageChange={setPage}
                            />
                        </div>
                    )}
                </CardBody>
            </Card>

            <Modal
                open={Boolean(selectedLog)}
                title={logDetail?.action || 'Chi tiết audit log'}
                onClose={closeDetail}
                panelClassName="max-w-6xl"
            >
                {detailQuery.isLoading ? (
                    <Loading label="Đang tải chi tiết audit log..." />
                ) : detailQuery.isError ? (
                    <EmptyState
                        icon={ShieldAlert}
                        title="Không tải được chi tiết audit log"
                        description={detailQuery.error.message}
                    />
                ) : (
                    <AuditLogDetailPanel log={logDetail} />
                )}
            </Modal>
        </div>
    );
}
