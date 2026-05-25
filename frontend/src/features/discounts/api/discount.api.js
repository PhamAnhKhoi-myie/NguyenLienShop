import { axiosClient } from '../../../shared/api/axiosClient';

export const discountApi = {
    getHomepageDiscounts: (params = {}) =>
        axiosClient.get('/discounts/public/homepage', { params }),
    claimDiscount: (discountId) =>
        axiosClient.post(`/discounts/${discountId}/claim`),
    getClaimedDiscounts: (params = {}) =>
        axiosClient.get('/discounts/me/claimed', { params }),
};
