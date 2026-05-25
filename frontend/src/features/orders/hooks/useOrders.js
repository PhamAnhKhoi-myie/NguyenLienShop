import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { REVIEW_QUERY_KEY } from '../../reviews/hooks/useReviews';
import { orderApi } from '../api/order.api';

export const ORDER_QUERY_KEY = ['orders'];

export function useOrders(params = {}) {
    return useQuery({
        queryKey: [...ORDER_QUERY_KEY, params],
        queryFn: () => orderApi.listOrders(params),
    });
}

export function useOrder(orderId, options = {}) {
    return useQuery({
        queryKey: [...ORDER_QUERY_KEY, orderId],
        queryFn: () => orderApi.getOrder(orderId),
        enabled: Boolean(orderId) && (options.enabled ?? true),
    });
}

export function useCancelOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ orderId, payload }) => orderApi.cancelOrder(orderId, payload),
        onSuccess: (_response, variables) => {
            queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEY });
            queryClient.invalidateQueries({
                queryKey: [...ORDER_QUERY_KEY, variables.orderId],
            });
        },
    });
}

export function useWriteOrderReview() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ orderId, payload }) => orderApi.writeReview(orderId, payload),
        onSuccess: (_response, variables) => {
            queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEY });
            queryClient.invalidateQueries({
                queryKey: [...ORDER_QUERY_KEY, variables.orderId],
            });
            queryClient.invalidateQueries({ queryKey: REVIEW_QUERY_KEY });
        },
    });
}
