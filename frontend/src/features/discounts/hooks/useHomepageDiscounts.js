import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { discountApi } from '../api/discount.api';

export const HOMEPAGE_DISCOUNTS_QUERY_KEY = ['homepage-discounts'];
export const CLAIMED_DISCOUNTS_QUERY_KEY = ['claimed-discounts'];

export function useHomepageDiscounts(limit = 4, mode = 'guest') {
    return useQuery({
        queryKey: [
            ...HOMEPAGE_DISCOUNTS_QUERY_KEY,
            mode,
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
    return useQuery({
        queryKey: [...CLAIMED_DISCOUNTS_QUERY_KEY, params],
        queryFn: () => discountApi.getClaimedDiscounts(params),
        ...options,
        enabled: options.enabled ?? true,
    });
}
