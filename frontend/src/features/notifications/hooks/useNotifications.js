import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../auth/store/auth.store';
import { notificationApi } from '../api/notification.api';

export const NOTIFICATION_QUERY_KEY = ['notifications'];
export const NOTIFICATION_REFETCH_INTERVAL_MS = 15000;

export function useNotifications(params = {}, options = {}) {
    const accessToken = useAuthStore((state) => state.accessToken);

    return useQuery({
        queryKey: [...NOTIFICATION_QUERY_KEY, params],
        queryFn: () => notificationApi.listNotifications(params),
        enabled: Boolean(accessToken) && (options.enabled ?? true),
        refetchInterval:
            options.refetchInterval ?? NOTIFICATION_REFETCH_INTERVAL_MS,
        refetchIntervalInBackground: options.refetchIntervalInBackground ?? false,
        refetchOnWindowFocus: options.refetchOnWindowFocus ?? true,
    });
}

export function useUnreadNotificationCount(options = {}) {
    const accessToken = useAuthStore((state) => state.accessToken);

    return useQuery({
        queryKey: [...NOTIFICATION_QUERY_KEY, 'unread-count'],
        queryFn: notificationApi.getUnreadCount,
        enabled: Boolean(accessToken) && (options.enabled ?? true),
        refetchInterval:
            options.refetchInterval ?? NOTIFICATION_REFETCH_INTERVAL_MS,
        refetchIntervalInBackground: options.refetchIntervalInBackground ?? false,
        refetchOnWindowFocus: options.refetchOnWindowFocus ?? true,
    });
}

export function useMarkNotificationRead() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: notificationApi.markAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEY });
        },
    });
}

export function useMarkAllNotificationsRead() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: notificationApi.markAllAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEY });
        },
    });
}

export function useDeleteNotification() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: notificationApi.deleteNotification,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEY });
        },
    });
}
