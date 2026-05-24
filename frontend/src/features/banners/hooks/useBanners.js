import { useQuery } from '@tanstack/react-query';
import { bannerApi } from '../api/banner.api';

export const BANNER_QUERY_KEY = ['banners'];

export function useBanners(location) {
    return useQuery({
        queryKey: [...BANNER_QUERY_KEY, location],
        queryFn: async () => {
            const response = await bannerApi.getByLocation(location);
            return response?.data || [];
        },
        enabled: Boolean(location),
        staleTime: 0,
        refetchOnMount: true,
        refetchOnWindowFocus: false,
    });
}