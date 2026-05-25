import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '../../auth/store/auth.store';
import { discountApi } from '../api/discount.api';

export const HOMEPAGE_DISCOUNTS_QUERY_KEY = ['homepage-discounts'];
export const CLAIMED_DISCOUNTS_QUERY_KEY = ['claimed-discounts'];

export function useHomepageDiscounts(limit = 4) {
    const accessToken = useAuthStore((state) => state.accessToken);

    return useQuery({
        queryKey: [
            ...HOMEPAGE_DISCOUNTS_QUERY_KEY,
            accessToken ? 'user' : 'guest',
            limit,
        ],
        queryFn: () => discountApi.getHomepageDiscounts({ limit }),
    });
}

export function useClaimDiscount() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: discountApi.claimDiscount,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: HOMEPAGE_DISCOUNTS_QUERY_KEY,
            });
            queryClient.invalidateQueries({
                queryKey: CLAIMED_DISCOUNTS_QUERY_KEY,
            });
        },
    });
}

export function useClaimedDiscounts(params = {}, options = {}) {
    const accessToken = useAuthStore((state) => state.accessToken);

    return useQuery({
        queryKey: [...CLAIMED_DISCOUNTS_QUERY_KEY, params],
        queryFn: () => discountApi.getClaimedDiscounts(params),
        ...options,
        enabled: Boolean(accessToken) && (options.enabled ?? true),
    });
}
