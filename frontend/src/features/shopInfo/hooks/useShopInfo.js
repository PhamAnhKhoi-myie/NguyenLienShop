import { useQuery } from '@tanstack/react-query';
import { shopInfoApi } from '../api/shopInfo.api';

export function useShopInfo(options = {}) {
    return useQuery({
        queryKey: ['shop-info'],
        queryFn: shopInfoApi.getShopInfo,
        retry: false,
        staleTime: 5 * 60 * 1000,
        ...options,
    });
}
