import { axiosClient } from '../../../shared/api/axiosClient';

export const checkoutApi = {
    getAddresses: () => axiosClient.get('/user-addresses'),
    createAddress: (payload) => axiosClient.post('/user-addresses', payload),
    updateAddress: (addressId, payload) =>
        axiosClient.patch(`/user-addresses/${addressId}`, payload),
    createOrder: (payload) => axiosClient.post('/orders', payload),
};
