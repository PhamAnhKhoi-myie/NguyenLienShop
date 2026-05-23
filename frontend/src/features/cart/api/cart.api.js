import { axiosClient } from '../../../shared/api/axiosClient';

const sanitizeCartItemPayload = ({
    product_id,
    variant_id,
    unit_id,
    quantity,
}) => ({
    product_id,
    variant_id,
    unit_id,
    quantity,
});

export const cartApi = {
    getGuestCart: (params = {}) =>
        axiosClient.get('/carts/guest', {
            params: {
                include_items: true,
                format: 'detail',
                ...params,
            },
        }),
    getUserCart: (params = {}) =>
        axiosClient.get('/carts', {
            params: {
                include_items: true,
                format: 'detail',
                ...params,
            },
        }),
    addItem: (payload) =>
        axiosClient.post('/carts/items', sanitizeCartItemPayload(payload)),
    updateItem: (itemId, payload) =>
        axiosClient.patch(`/carts/items/${itemId}`, {
            quantity: payload.quantity,
        }),
    removeItem: (itemId) => axiosClient.delete(`/carts/items/${itemId}`),
    clearCart: (params = {}) => axiosClient.delete('/carts', { params }),
    mergeCart: (payload = {}) => axiosClient.post('/carts/merge', payload),
};
