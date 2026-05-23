import { axiosClient } from '../../../shared/api/axiosClient';

export const paymentApi = {
    createPayment: (payload) => axiosClient.post('/payments', payload),
    getPayment: (paymentId) => axiosClient.get(`/payments/${paymentId}`),
    getPaymentByOrder: (orderId) => axiosClient.get(`/payments/order/${orderId}`),
    retryPayment: (paymentId) => axiosClient.post(`/payments/${paymentId}/retry`),
};
