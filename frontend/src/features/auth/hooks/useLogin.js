import { useMutation } from '@tanstack/react-query';

import { authApi } from '../api/auth.api';
import { cartApi } from '../../cart/api/cart.api';
import { useAuthStore } from '../store/auth.store';
import { queryClient } from '../../../shared/api/queryClient';

export function useLogin() {
    const setAuth = useAuthStore((state) => state.setAuth);

    return useMutation({
        mutationFn: authApi.login,
        onSuccess: async (response) => {
            const { accessToken, user } = response.data;

            setAuth({
                accessToken,
                user,
            });

            try {
                await cartApi.mergeCart({});
            } catch {
                await Promise.resolve();
            }

            await queryClient.invalidateQueries({ queryKey: ['cart'] });
        },
    });
}