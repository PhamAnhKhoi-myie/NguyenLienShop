import { useQuery } from '@tanstack/react-query';
import { bannerApi } from '../api/banner.api';

export function useBanners(location) {
    return useQuery({
        queryKey: ['banners', location],
        queryFn: async () => {
            const response = await bannerApi.getByLocation(location);
            return response?.data || [];
        },
        enabled: Boolean(location),
        staleTime: 1000 * 60 * 5,
    });
}