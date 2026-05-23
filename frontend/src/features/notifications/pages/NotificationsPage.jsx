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
    order: 'Đơn hàng',
    system: 'Hệ thống',
    promotion: 'Khuyến mãi',
};

const priorityVariants = {
    low: 'muted',
    medium: 'warning',
    high: 'error',
};

function formatDateTime(value) {
    if (!value) {
        return '';
    }

    return new Date(value).toLocaleString('vi-VN');
}

function getReferenceLink(notification) {
    const data = notification.data;

    if (data?.ref_type === 'order' && data.ref_id) {
        return `${ROUTES.ORDERS}/${data.ref_id}`;
    }

    return null;
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

    return (
        <div className="space-y-6">
            <AccountNav />

            <Card>
                <CardHeader>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-semibold text-[var(--color-text-main)]">
                                    Thông báo
                                </h1>
                                {unreadCount > 0 && (
                                    <Badge variant="warning">
                                        {unreadCount} chưa đọc
                                    </Badge>
                                )}
                            </div>
                            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                                Theo dõi cập nhật đơn hàng, hệ thống và khuyến mãi.
                            </p>
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
                                <option value="">Tất cả loại</option>
                                <option value="order">Đơn hàng</option>
                                <option value="system">Hệ thống</option>
                                <option value="promotion">Khuyến mãi</option>
                            </Select>
                            <Button
                                variant={unreadOnly ? 'primary' : 'outline'}
                                onClick={() =>
                                    handleFilterChange(() =>
                                        setUnreadOnly((current) => !current)
                                    )
                                }
                            >
                                Chưa đọc
                            </Button>
                            <Button
                                variant="outline"
                                isLoading={markAllReadMutation.isPending}
                                onClick={() => markAllReadMutation.mutate()}
                            >
                                <CheckCheck className="h-4 w-4" />
                                Đọc tất cả
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardBody>
                    {notificationsQuery.isLoading ? (
                        <Loading label="Đang tải thông báo..." />
                    ) : notifications.length === 0 ? (
                        <EmptyState
                            icon={Bell}
                            title="Chưa có thông báo"
                            description="Thông báo mới sẽ hiển thị tại đây."
                        />
                    ) : (
                        <div className="space-y-4">
                            {notifications.map((notification) => {
                                const referenceLink =
                                    getReferenceLink(notification);

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
                                                        {notification.title}
                                                    </h2>
                                                    <Badge>
                                                        {typeLabels[
                                                            notification.type
                                                        ] || notification.type}
                                                    </Badge>
                                                    <Badge
                                                        variant={
                                                            priorityVariants[
                                                                notification.priority
                                                            ] || 'muted'
                                                        }
                                                    >
                                                        {notification.priority}
                                                    </Badge>
                                                </div>
                                                <p className="mt-2 text-sm text-[var(--color-text-main)]">
                                                    {notification.message}
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
                                                        className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-medium text-[var(--color-text-main)] transition-colors hover:bg-[var(--color-background)]"
                                                    >
                                                        <ExternalLink className="h-4 w-4" />
                                                        Xem
                                                    </Link>
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
                                                        <CheckCheck className="h-4 w-4" />
                                                        Đã đọc
                                                    </Button>
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
                                                    <Trash2 className="h-4 w-4" />
                                                    Xóa
                                                </Button>
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
