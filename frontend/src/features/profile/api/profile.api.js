import { axiosClient } from '../../../shared/api/axiosClient';

export const profileApi = {
    updateProfile: (userId, payload) => axiosClient.patch(`/users/${userId}`, payload),
    getAddresses: () => axiosClient.get('/user-addresses'),
    createAddress: (payload) => axiosClient.post('/user-addresses', payload),
    updateAddress: (addressId, payload) =>
        axiosClient.patch(`/user-addresses/${addressId}`, payload),
    deleteAddress: (addressId) => axiosClient.delete(`/user-addresses/${addressId}`),
    setDefaultAddress: (addressId) =>
        axiosClient.patch(`/user-addresses/${addressId}/set-default`),
};
