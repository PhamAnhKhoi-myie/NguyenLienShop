import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { paymentApi } from '../api/payment.api';

export const PAYMENT_QUERY_KEY = ['payments'];

export function useCreatePayment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: paymentApi.createPayment,
        onSuccess: (_response, payload) => {
            queryClient.invalidateQueries({ queryKey: PAYMENT_QUERY_KEY });
            queryClient.invalidateQueries({
                queryKey: [...PAYMENT_QUERY_KEY, 'order', payload.order_id],
            });
            queryClient.invalidateQueries({ queryKey: ['orders'] });
        },
    });
}

export function usePayment(paymentId, options = {}) {
    return useQuery({
        queryKey: [...PAYMENT_QUERY_KEY, paymentId],
        queryFn: () => paymentApi.getPayment(paymentId),
        enabled: Boolean(paymentId) && (options.enabled ?? true),
    });
}

export function usePaymentByOrder(orderId, options = {}) {
    return useQuery({
        queryKey: [...PAYMENT_QUERY_KEY, 'order', orderId],
        queryFn: () => paymentApi.getPaymentByOrder(orderId),
        enabled: Boolean(orderId) && (options.enabled ?? true),
        retry: false,
    });
}

export function useRetryPayment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: paymentApi.retryPayment,
        onSuccess: (response) => {
            const payment = response.data;

            queryClient.invalidateQueries({ queryKey: PAYMENT_QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: ['orders'] });

            if (payment?.order_id) {
                queryClient.invalidateQueries({
                    queryKey: [...PAYMENT_QUERY_KEY, 'order', payment.order_id],
                });
            }
        },
    });
}
