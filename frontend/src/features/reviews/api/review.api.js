import { axiosClient } from '../../../shared/api/axiosClient';

export const reviewApi = {
    getProductReviews: (productId, params = {}) =>
        axiosClient.get(`/reviews/product/${productId}`, {
            params,
            skipAuth: true,
        }),

    getVariantReviews: (variantId, params = {}) =>
        axiosClient.get(`/reviews/variant/${variantId}`, {
            params,
            skipAuth: true,
        }),

    getMyReviews: (params = {}) =>
        axiosClient.get('/reviews/user/my-reviews', { params }),

    updateReview: (reviewId, payload) =>
        axiosClient.put(`/reviews/${reviewId}`, payload),

    deleteReview: (reviewId) => axiosClient.delete(`/reviews/${reviewId}`),

    markHelpful: (reviewId, helpful) =>
        axiosClient.post(`/reviews/${reviewId}/helpful`, { helpful }),

    flagReview: (reviewId, reason) =>
        axiosClient.post(`/reviews/${reviewId}/flag`, { reason }),

    getAdminPendingReviews: (params = {}) =>
        axiosClient.get('/reviews/admin/pending', { params }),

    getAdminFlaggedReviews: (params = {}) =>
        axiosClient.get('/reviews/admin/flagged', { params }),

    approveReview: (reviewId) =>
        axiosClient.post(`/reviews/${reviewId}/approve`),

    rejectReview: (reviewId, reason) =>
        axiosClient.post(`/reviews/${reviewId}/reject`, { reason }),
};
