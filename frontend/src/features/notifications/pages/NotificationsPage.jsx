import { getLocale, translate } from '../../../shared/i18n/index';
import { Bell, CheckCheck, ExternalLink, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Badge from '../../../shared/components/Badge';
import Button from '../../../shared/components/Button';
import Card, { CardBody, CardHeader } from '../../../shared/components/Card';
import EmptyState from '../../../shared/components/EmptyState';
import Loading from '../../../shared/components/Loading';
import Pagination from '../../../shared/components/Pagination';
import Select from '../../../shared/components/Select';
import { ROUTES } from '../../../shared/constants/routes';
import AccountNav from '../../profile/components/AccountNav';
import {
    useDeleteNotification,
    useMarkAllNotificationsRead,
    useMarkNotificationRead,
    useNotifications,
    useUnreadNotificationCount,
} from '../hooks/useNotifications';

const typeLabels = {
    order: translate('text.order_0aba562f'),
    system: translate('text.system'),
    promotion: translate('text.promotion'),
};

function formatDateTime(value) {
    if (!value) {
        return '';
    }

    return new Date(value).toLocaleString(getLocale());
}

function getReferenceLink(notification) {
    const data = notification.data;

    if (data?.ref_type === 'order' && data.ref_id) {
        return `${ROUTES.ORDERS}/${data.ref_id}`;
    }

    return null;
}

function getOrderLabel(notification, fallbackOrderCode = null) {
    const orderCode =
        fallbackOrderCode || notification.data?.extra?.order_code || null;
    return orderCode
        ? translate('notification.order.label', { orderCode })
        : translate('notification.order.default_label');
}

function translateNotificationKey(key, params, fallback = '') {
    if (!key) {
        return fallback;
    }

    const translated = translate(key, params);

    if (!translated || translated === key) {
        return fallback || key;
    }

    return translated;
}

function getNotificationParams(notification) {
    const orderCode =
        notification.message_params?.orderCode ||
        notification.data?.extra?.order_code ||
        null;

    return {
        ...(notification.message_params || {}),
        orderCode,
        orderLabel: getOrderLabel(notification, orderCode),
    };
}

function getNotificationContent(notification) {
    const params = getNotificationParams(notification);
    const event = notification.data?.extra?.event;

    if (notification.title_key || notification.message_key) {
        return {
            title: translateNotificationKey(
                notification.title_key,
                params,
                notification.title
            ),
            message: translateNotificationKey(
                notification.message_key,
                params,
                notification.message
            ),
        };
    }

    const contentByEvent = {
        ORDER_CREATED: {
            title_key: 'notification.order.created.title',
            message_key: 'notification.order.created.message',
        },
        PAYMENT_SUCCESS: {
            title_key: 'notification.payment.success.title',
            message_key: 'notification.payment.success.message',
        },
        PAYMENT_FAILED: {
            title_key: 'notification.payment.failed.title',
            message_key: 'notification.payment.failed.message',
        },
        ORDER_PROCESSING: {
            title_key: 'notification.order.processing.title',
            message_key: 'notification.order.processing.message',
        },
        ORDER_SHIPPED: {
            title_key: 'notification.order.shipped.title',
            message_key: 'notification.order.shipped.message',
        },
        ORDER_DELIVERED: {
            title_key: 'notification.order.delivered.title',
            message_key: 'notification.order.delivered.message',
        },
        ORDER_REVIEW_REMINDER: {
            title_key: 'notification.order.review_reminder.title',
            message_key: 'notification.order.review_reminder.message',
        },
        ORDER_CANCELED: {
            title_key: 'notification.order.canceled.title',
            message_key: 'notification.order.canceled.message',
        },
    };

    if (contentByEvent[event]) {
        const content = contentByEvent[event];

        return {
            title: translateNotificationKey(content.title_key, params),
            message: translateNotificationKey(content.message_key, params),
        };
    }

    const legacyContentByTitle = {
        'Order successful': {
            title_key: 'notification.order.created.title',
            message_key: 'notification.order.created.message',
        },
        'Successful payment': {
            title_key: 'notification.payment.success.title',
            message_key: 'notification.payment.success.message',
        },
        'Payment failed': {
            title_key: 'notification.payment.failed.title',
            message_key: 'notification.payment.failed.message',
        },
        'Order is being processed': {
            title_key: 'notification.order.processing.title',
            message_key: 'notification.order.processing.message',
        },
        'Order is being delivered': {
            title_key: 'notification.order.shipped.title',
            message_key: 'notification.order.shipped.message',
        },
        'Successfully delivered': {
            title_key: 'notification.order.delivered.title',
            message_key: 'notification.order.delivered.message',
        },
        'Order has been canceled': {
            title_key: 'notification.order.canceled.title',
            message_key: 'notification.order.canceled.message',
        },
    };

    const legacyContent = legacyContentByTitle[notification.title];

    if (legacyContent) {
        return {
            title: translateNotificationKey(legacyContent.title_key, params),
            message: translateNotificationKey(legacyContent.message_key, params),
        };
    }

    return {
        title: notification.title,
        message: notification.message,
    };
}

export default function NotificationsPage() {
    const [page, setPage] = useState(1);
    const [type, setType] = useState('');
    const [unreadOnly, setUnreadOnly] = useState(false);
    const queryParams = useMemo(
        () => ({
            page,
            limit: 10,
            unread_only: unreadOnly ? 'true' : 'false',
            ...(type ? { type } : {}),
        }),
        [page, type, unreadOnly]
    );
    const notificationsQuery = useNotifications(queryParams);
    const unreadCountQuery = useUnreadNotificationCount();
    const markReadMutation = useMarkNotificationRead();
    const markAllReadMutation = useMarkAllNotificationsRead();
    const deleteNotificationMutation = useDeleteNotification();
    const notifications = notificationsQuery.data?.data || [];
    const pagination = notificationsQuery.data?.pagination || {};
    const unreadCount = unreadCountQuery.data?.data?.unread_count || 0;

    const handleFilterChange = (next) => {
        setPage(1);
        next();
    };

    const handleViewNotification = (notification) => {
        if (!notification.is_read) {
            markReadMutation.mutate(notification.id);
        }
    };

    return (
        <div className="space-y-6">
            <AccountNav />

            <Card>
                <CardHeader>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-semibold text-[var(--color-text-main)]"> {translate('text.notice')} </h1>
                                {unreadCount > 0 && (
                                    <Badge variant="warning">
                                        {unreadCount} {translate('text.unread_89cf356e')} </Badge>
                                )}
                            </div>
                            <p className="mt-1 text-sm text-[var(--color-text-muted)]"> {translate('text.track_updates_to_orders_systems_and_promotions')} </p>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row">
                            <Select
                                value={type}
                                onChange={(event) =>
                                    handleFilterChange(() =>
                                        setType(event.target.value)
                                    )
                                }
                                className="sm:w-40"
                            >
                                <option value="">{translate('text.all_types')}</option>
                                <option value="order">{translate('text.order_0aba562f')}</option>
                                <option value="system">{translate('text.system')}</option>
                                <option value="promotion">{translate('text.promotion')}</option>
                            </Select>
                            <Button
                                variant={unreadOnly ? 'primary' : 'outline'}
                                onClick={() =>
                                    handleFilterChange(() =>
                                        setUnreadOnly((current) => !current)
                                    )
                                }
                            > {translate('text.unread')} </Button>
                            <Button
                                variant="outline"
                                isLoading={markAllReadMutation.isPending}
                                onClick={() => markAllReadMutation.mutate()}
                            >
                                <CheckCheck className="h-4 w-4" /> {translate('text.read_all')} </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardBody>
                    {notificationsQuery.isLoading ? (
                        <Loading label={translate('text.loading_notification')} />
                    ) : notifications.length === 0 ? (
                        <EmptyState
                            icon={Bell}
                            title={translate('text.no_announcement_yet')}
                            description={translate('text.new_notifications_will_display_here')}
                        />
                    ) : (
                        <div className="space-y-4">
                            {notifications.map((notification) => {
                                const referenceLink =
                                    getReferenceLink(notification);
                                const content =
                                    getNotificationContent(notification);

                                return (
                                    <div
                                        key={notification.id}
                                        className={
                                            notification.is_read
                                                ? 'rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4'
                                                : 'rounded-lg border border-[var(--color-primary)] bg-[var(--color-secondary)] p-4'
                                        }
                                    >
                                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h2 className="font-semibold text-[var(--color-text-main)]">
                                                        {content.title}
                                                    </h2>
                                                    <Badge>
                                                        {typeLabels[
                                                            notification.type
                                                        ] || notification.type}
                                                    </Badge>
                                                </div>
                                                <p className="mt-2 text-sm text-[var(--color-text-main)]">
                                                    {content.message}
                                                </p>
                                                <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                                                    {formatDateTime(
                                                        notification.created_at
                                                    )}
                                                </p>
                                            </div>

                                            <div className="flex flex-wrap gap-2 md:justify-end">
                                                {referenceLink && (
                                                    <Link
                                                        to={referenceLink}
                                                        onClick={() =>
                                                            handleViewNotification(
                                                                notification
                                                            )
                                                        }
                                                        className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-medium text-[var(--color-text-main)] transition-colors hover:bg-[var(--color-background)]"
                                                    >
                                                        <ExternalLink className="h-4 w-4" /> {translate('text.xem')} </Link>
                                                )}
                                                {!notification.is_read && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        isLoading={
                                                            markReadMutation.isPending
                                                        }
                                                        onClick={() =>
                                                            markReadMutation.mutate(
                                                                notification.id
                                                            )
                                                        }
                                                    >
                                                        <CheckCheck className="h-4 w-4" /> {translate('text.read')} </Button>
                                                )}
                                                <Button
                                                    size="sm"
                                                    variant="danger"
                                                    isLoading={
                                                        deleteNotificationMutation.isPending
                                                    }
                                                    onClick={() =>
                                                        deleteNotificationMutation.mutate(
                                                            notification.id
                                                        )
                                                    }
                                                >
                                                    <Trash2 className="h-4 w-4" /> {translate('text.delete')} </Button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            <Pagination
                                page={pagination.page || page}
                                totalPages={pagination.total_pages || 1}
                                onPageChange={setPage}
                            />
                        </div>
                    )}
                </CardBody>
            </Card>
        </div>
    );
}
