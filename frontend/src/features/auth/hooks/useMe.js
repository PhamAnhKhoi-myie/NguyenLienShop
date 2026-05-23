import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { authApi } from '../api/auth.api';
import { useAuthStore } from '../store/auth.store';

export function useMe() {
    const accessToken = useAuthStore((state) => state.accessToken);
    const setUser = useAuthStore((state) => state.setUser);
    const clearAuth = useAuthStore((state) => state.clearAuth);

    const query = useQuery({
        queryKey: ['me'],
        queryFn: authApi.getMe,
        enabled: Boolean(accessToken),
        retry: false,
    });

    useEffect(() => {
        if (query.data?.data) {
            setUser(query.data.data);
        }
    }, [query.data, setUser]);

    useEffect(() => {
        if (query.isError && query.error?.status === 401) {
            clearAuth();
        }
    }, [clearAuth, query.error, query.isError]);

    return query;
}
