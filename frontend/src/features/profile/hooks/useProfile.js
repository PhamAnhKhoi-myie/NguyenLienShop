import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../auth/store/auth.store';
import { profileApi } from '../api/profile.api';

export const ACCOUNT_ADDRESS_QUERY_KEY = ['account', 'addresses'];

export function useUpdateProfile() {
    const queryClient = useQueryClient();
    const setUser = useAuthStore((state) => state.setUser);

    return useMutation({
        mutationFn: ({ userId, payload }) => profileApi.updateProfile(userId, payload),
        onSuccess: (response) => {
            if (response.data) {
                setUser(response.data);
            }

            queryClient.invalidateQueries({ queryKey: ['me'] });
        },
    });
}

export function useAccountAddresses() {
    return useQuery({
        queryKey: ACCOUNT_ADDRESS_QUERY_KEY,
        queryFn: profileApi.getAddresses,
    });
}

export function useCreateAccountAddress() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: profileApi.createAddress,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ACCOUNT_ADDRESS_QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: ['checkout', 'addresses'] });
        },
    });
}

export function useUpdateAccountAddress() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ addressId, payload }) =>
            profileApi.updateAddress(addressId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ACCOUNT_ADDRESS_QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: ['checkout', 'addresses'] });
        },
    });
}

export function useDeleteAccountAddress() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: profileApi.deleteAddress,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ACCOUNT_ADDRESS_QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: ['checkout', 'addresses'] });
        },
    });
}

export function useSetDefaultAccountAddress() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: profileApi.setDefaultAddress,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ACCOUNT_ADDRESS_QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: ['checkout', 'addresses'] });
        },
    });
}
