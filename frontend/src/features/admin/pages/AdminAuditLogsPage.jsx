import { translate } from '../../../shared/i18n/index';
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
    { value: '', label: translate('text.all_domains') },
    { value: 'AUTH', label: translate('text.auth') },
    { value: 'USER', label: translate('text.user_6eb0c612') },
    { value: 'USER_ADDRESS', label: translate('text.user_address') },
    { value: 'CATEGORY', label: translate('text.category_762258cf') },
    { value: 'PRODUCT', label: translate('text.product_964bd565') },
    { value: 'PAYMENT', label: translate('text.payment') },
    { value: 'ORDER', label: translate('text.order_683e61c8') },
    { value: 'SHIPMENT', label: translate('text.shipment') },
    { value: 'DISCOUNT', label: translate('text.discount_62775f06') },
    { value: 'REVIEW', label: translate('text.review_ed6912ad') },
    { value: 'SHOP_CONTENT', label: translate('text.shop_content') },
    { value: 'CART', label: translate('text.cart_7cd0c455') },
    { value: 'NOTIFICATION', label: translate('text.notification') },
    { value: 'EMAIL', label: translate('text.email') },
];

const levelOptions = [
    { value: '', label: translate('text.all_levels') },
    { value: 'INFO', label: translate('text.info') },
    { value: 'IMPORTANT', label: translate('text.important') },
    { value: 'SECURITY', label: translate('text.security') },
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
        'PAYOS_WEBHOOK_PAYMENT',
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
        { value: '', label: domain ? translate('text.all_actions_value', { value0: domain }) : translate('text.all_actions') },
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
                    <p className="text-sm text-[var(--color-text-muted)]"> {translate('text.total_log')} </p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--color-text-main)]">
                        {total}
                    </p>
                </CardBody>
            </Card>
            <Card>
                <CardBody>
                    <p className="text-sm text-[var(--color-text-muted)]"> {translate('text.security_on_page')} </p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--color-error)]">
                        {securityCount}
                    </p>
                </CardBody>
            </Card>
            <Card>
                <CardBody>
                    <p className="text-sm text-[var(--color-text-muted)]"> {translate('text.important_on_page')} </p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--color-warning)]">
                        {importantCount}
                    </p>
                </CardBody>
            </Card>
            <Card>
                <CardBody>
                    <p className="text-sm text-[var(--color-text-muted)]"> {translate('text.domain_on_page')} </p>
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
                    label={translate('text.domain')}
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
                    label={translate('text.action')}
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
                    label={translate('text.level')}
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
                    label={translate('text.target_type')}
                    value={values.target_type}
                    placeholder={translate('text.order_payment')}
                    onChange={(event) => onChange('target_type', event.target.value)}
                />
            </div>
            <div className="grid gap-3 lg:grid-cols-5">
                <Input
                    label={translate('text.actor_id')}
                    value={values.actor_id}
                    onChange={(event) => onChange('actor_id', event.target.value)}
                />
                <Input
                    label={translate('text.user_id')}
                    value={values.user_id}
                    onChange={(event) => onChange('user_id', event.target.value)}
                />
                <Input
                    label={translate('text.order_id')}
                    value={values.order_id}
                    onChange={(event) => onChange('order_id', event.target.value)}
                />
                <Input
                    label={translate('text.target_id')}
                    value={values.target_id}
                    onChange={(event) => onChange('target_id', event.target.value)}
                />
                <div className="flex items-end gap-2">
                    <Button type="button" onClick={onApply}>
                        <Filter className="h-4 w-4" /> {translate('text.filter')} </Button>
                    <Button type="button" variant="outline" onClick={onReset}> {translate('text.clear_filter')} </Button>
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
            <p className="text-sm text-[var(--color-text-muted)]"> {translate('text.no_secondary_id')} </p>
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
                        <h3 className="font-semibold text-[var(--color-text-main)]"> {translate('text.actor')} </h3>
                    </CardHeader>
                    <CardBody className="space-y-3">
                        <DetailRow label={translate('text.actor_id')} value={log.actor_id} />
                        <DetailRow label={translate('text.actor_type')} value={log.actor_type} />
                        <DetailRow label={translate('text.ip')} value={log.ip_address} />
                    </CardBody>
                </Card>
                <Card>
                    <CardHeader>
                        <h3 className="font-semibold text-[var(--color-text-main)]"> {translate('text.target')} </h3>
                    </CardHeader>
                    <CardBody className="space-y-3">
                        <DetailRow label={translate('text.target_type')} value={log.target_type} />
                        <DetailRow label={translate('text.target_id')} value={getTargetLabel(log)} />
                        <DetailRow label={translate('text.status')} value={log.status} />
                    </CardBody>
                </Card>
                <Card>
                    <CardHeader>
                        <h3 className="font-semibold text-[var(--color-text-main)]"> {translate('text.time')} </h3>
                    </CardHeader>
                    <CardBody className="space-y-3">
                        <DetailRow label={translate('text.created')}>
                            {formatDateTime(log.created_at)}
                        </DetailRow>
                        <DetailRow label={translate('text.provider')} value={log.provider} />
                        <DetailRow label={translate('text.template')} value={log.template} />
                    </CardBody>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <h3 className="font-semibold text-[var(--color-text-main)]"> {translate('text.related_id')} </h3>
                </CardHeader>
                <CardBody>
                    <IdGrid log={log} />
                </CardBody>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
                <JsonPanel title={translate('text.changes')} value={log.changes} />
                <JsonPanel title={translate('text.metadata')} value={log.metadata} />
            </div>

            <JsonPanel title={translate('text.user_agent')} value={log.user_agent} />
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
                    <p className="text-sm font-medium text-[var(--color-primary-hover)]"> {translate('text.admin')} </p>
                    <h1 className="mt-1 text-2xl font-semibold text-[var(--color-text-main)]"> {translate('text.audit_logs')} </h1>
                    <p className="mt-2 text-sm text-[var(--color-text-muted)]"> {translate('text.admin_looks_up_operation_history_checks_changes_and_checks_sensitive_eve')} </p>
                </div>
                <Button
                    variant="outline"
                    isLoading={logsQuery.isFetching}
                    onClick={refreshLogs}
                >
                    <RefreshCw className="h-4 w-4" /> {translate('text.reload')} </Button>
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
                        <Loading label={translate('text.loading_audit_logs')} />
                    ) : logsQuery.isError ? (
                        <EmptyState
                            icon={Search}
                            title={translate('text.unable_to_download_audit_logs')}
                            description={logsQuery.error.message}
                        />
                    ) : logs.length === 0 ? (
                        <EmptyState
                            icon={FileSearch}
                            title={translate('text.no_audit_log_yet')}
                            description={translate('text.system_operations_will_be_displayed_here_after_occurring')}
                        />
                    ) : (
                        <div className="space-y-4">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
                                    <thead>
                                        <tr className="bg-[var(--color-background)] text-left text-xs font-semibold uppercase text-[var(--color-text-muted)]">
                                            <th className="px-4 py-3">{translate('text.time')}</th>
                                            <th className="px-4 py-3">{translate('text.domain')}</th>
                                            <th className="px-4 py-3">{translate('text.level')}</th>
                                            <th className="px-4 py-3">{translate('text.action')}</th>
                                            <th className="px-4 py-3">{translate('text.actor')}</th>
                                            <th className="px-4 py-3">{translate('text.target')}</th>
                                            <th className="px-4 py-3">{translate('text.ip')}</th>
                                            <th className="px-4 py-3 text-right">{translate('text.task')}</th>
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
                                                        <Eye className="h-4 w-4" /> {translate('text.details')} </Button>
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
                title={logDetail?.action || translate('text.audit_log_details')}
                onClose={closeDetail}
                panelClassName="max-w-7xl"
            >
                {detailQuery.isLoading ? (
                    <Loading label={translate('text.loading_audit_log_details')} />
                ) : detailQuery.isError ? (
                    <EmptyState
                        icon={ShieldAlert}
                        title={translate('text.unable_to_download_audit_log_details')}
                        description={detailQuery.error.message}
                    />
                ) : (
                    <AuditLogDetailPanel log={logDetail} />
                )}
            </Modal>
        </div>
    );
}
