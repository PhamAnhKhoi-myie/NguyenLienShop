import { axiosClient } from '../../../shared/api/axiosClient';

export const notificationApi = {
    listNotifications: (params) => axiosClient.get('/notifications', { params }),
    getUnreadCount: () => axiosClient.get('/notifications/unread-count'),
    markAsRead: (notificationId) =>
        axiosClient.patch(`/notifications/${notificationId}/read`),
    markAllAsRead: () => axiosClient.patch('/notifications/mark-all-read'),
    deleteNotification: (notificationId) =>
        axiosClient.delete(`/notifications/${notificationId}`),
};
