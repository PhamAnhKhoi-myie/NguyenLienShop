import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { queryClient } from '../../../shared/api/queryClient';
import { ROUTES } from '../../../shared/constants/routes';
import { authApi } from '../api/auth.api';
import { useAuthStore } from '../store/auth.store';

export function useLogout() {
    const navigate = useNavigate();
    const clearAuth = useAuthStore((state) => state.clearAuth);

    return useMutation({
        mutationFn: authApi.logout,
        onSettled: () => {
            clearAuth();
            queryClient.clear();
            navigate(ROUTES.LOGIN);
        },
    });
}
