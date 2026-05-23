import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../auth/store/auth.store';
import { cartApi } from '../api/cart.api';

export const CART_QUERY_KEY = ['cart'];

function useCartMode() {
    const accessToken = useAuthStore((state) => state.accessToken);

    return accessToken ? 'user' : 'guest';
}

export function useCart(params = {}, options = {}) {
    const mode = useCartMode();

    return useQuery({
        queryKey: [...CART_QUERY_KEY, mode, params],
        queryFn: () =>
            mode === 'user'
                ? cartApi.getUserCart(params)
                : cartApi.getGuestCart(params),
        enabled: options.enabled ?? true,
    });
}

export function useCartSummary(options = {}) {
    return useCart(
        {
            include_items: true,
            format: 'summary',
        },
        options
    );
}

function useInvalidateCart() {
    const queryClient = useQueryClient();

    return () =>
        queryClient.invalidateQueries({
            queryKey: CART_QUERY_KEY,
        });
}

export function useAddCartItem() {
    const invalidateCart = useInvalidateCart();

    return useMutation({
        mutationFn: cartApi.addItem,
        onSuccess: invalidateCart,
    });
}

export function useUpdateCartItem() {
    const invalidateCart = useInvalidateCart();

    return useMutation({
        mutationFn: ({ itemId, quantity }) =>
            cartApi.updateItem(itemId, { quantity }),
        onSuccess: invalidateCart,
    });
}

export function useRemoveCartItem() {
    const invalidateCart = useInvalidateCart();

    return useMutation({
        mutationFn: cartApi.removeItem,
        onSuccess: invalidateCart,
    });
}

export function useClearCart() {
    const invalidateCart = useInvalidateCart();

    return useMutation({
        mutationFn: cartApi.clearCart,
        onSuccess: invalidateCart,
    });
}

export function useMergeCart() {
    const invalidateCart = useInvalidateCart();

    return useMutation({
        mutationFn: cartApi.mergeCart,
        onSuccess: invalidateCart,
    });
}
