import { axiosClient } from '../../../shared/api/axiosClient';

export const orderApi = {
    listOrders: (params) => axiosClient.get('/orders', { params }),
    getOrder: (orderId) => axiosClient.get(`/orders/${orderId}`),
    cancelOrder: (orderId, payload) =>
        axiosClient.post(`/orders/${orderId}/cancel`, payload),
    writeReview: (orderId, payload) =>
        axiosClient.post(`/orders/${orderId}/review`, payload),
};
