import { useQuery } from '@tanstack/react-query';
import { announcementApi } from '../api/announcement.api';

export const ANNOUNCEMENT_QUERY_KEY = ['announcements'];

export function useAnnouncements(target, options = {}) {
    return useQuery({
        queryKey: [...ANNOUNCEMENT_QUERY_KEY, target],
        queryFn: async () => {
            const response = await announcementApi.getActive(target);
            return response?.data || [];
        },
        enabled: Boolean(target) && (options.enabled ?? true),
        staleTime: 60 * 1000,
        refetchOnMount: true,
        refetchOnWindowFocus: false,
    });
}
