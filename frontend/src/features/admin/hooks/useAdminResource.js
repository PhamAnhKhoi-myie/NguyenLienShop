import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/admin.api';

export const ADMIN_QUERY_KEY = ['admin'];

export function useAdminList(endpoint, params = {}, options = {}) {
    return useQuery({
        queryKey: [...ADMIN_QUERY_KEY, endpoint, params],
        queryFn: () => adminApi.list(endpoint, params),
        enabled: Boolean(endpoint) && (options.enabled ?? true),
    });
}

export function useAdminDetail(endpoint, options = {}) {
    return useQuery({
        queryKey: [...ADMIN_QUERY_KEY, endpoint],
        queryFn: () => adminApi.get(endpoint),
        enabled: Boolean(endpoint) && (options.enabled ?? true),
    });
}

export function useAdminMutation({ method = 'post', invalidate = ADMIN_QUERY_KEY } = {}) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ endpoint, payload }) => adminApi[method](endpoint, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: invalidate });
        },
    });
}
