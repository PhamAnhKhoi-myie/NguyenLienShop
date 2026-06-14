import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CART_QUERY_KEY } from '../../cart/hooks/useCart';
import { checkoutApi } from '../api/checkout.api';

const ADDRESS_QUERY_KEY = ['checkout', 'addresses'];
const CHECKOUT_SETTINGS_QUERY_KEY = ['checkout', 'settings'];

export function useCheckoutSettings() {
    return useQuery({
        queryKey: CHECKOUT_SETTINGS_QUERY_KEY,
        queryFn: checkoutApi.getCheckoutSettings,
        staleTime: 5 * 60 * 1000,
    });
}

export function useAddresses() {
    return useQuery({
        queryKey: ADDRESS_QUERY_KEY,
        queryFn: checkoutApi.getAddresses,
    });
}

export function useCreateAddress() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: checkoutApi.createAddress,
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey: ADDRESS_QUERY_KEY,
            }),
    });
}

export function useUpdateAddress() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ addressId, payload }) =>
            checkoutApi.updateAddress(addressId, payload),
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey: ADDRESS_QUERY_KEY,
            }),
    });
}

export function useCreateOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: checkoutApi.createOrder,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: ['orders'] });
        },
    });
}
