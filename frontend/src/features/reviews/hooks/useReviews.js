import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '../../auth/store/auth.store';
import { reviewApi } from '../api/review.api';

export const REVIEW_QUERY_KEY = ['reviews'];

export function useProductReviews(productId, params = {}, options = {}) {
    return useQuery({
        queryKey: [...REVIEW_QUERY_KEY, 'product', productId, params],
        queryFn: () => reviewApi.getProductReviews(productId, params),
        enabled: Boolean(productId) && (options.enabled ?? true),
    });
}

export function useVariantReviews(variantId, params = {}, options = {}) {
    return useQuery({
        queryKey: [...REVIEW_QUERY_KEY, 'variant', variantId, params],
        queryFn: () => reviewApi.getVariantReviews(variantId, params),
        enabled: Boolean(variantId) && (options.enabled ?? true),
    });
}

export function useMyReviews(params = {}, options = {}) {
    const accessToken = useAuthStore((state) => state.accessToken);

    return useQuery({
        queryKey: [...REVIEW_QUERY_KEY, 'mine', params],
        queryFn: () => reviewApi.getMyReviews(params),
        enabled: Boolean(accessToken) && (options.enabled ?? true),
    });
}

export function useAdminPendingReviews(params = {}, options = {}) {
    const accessToken = useAuthStore((state) => state.accessToken);

    return useQuery({
        queryKey: [...REVIEW_QUERY_KEY, 'admin', 'pending', params],
        queryFn: () => reviewApi.getAdminPendingReviews(params),
        enabled: Boolean(accessToken) && (options.enabled ?? true),
    });
}

export function useAdminFlaggedReviews(params = {}, options = {}) {
    const accessToken = useAuthStore((state) => state.accessToken);

    return useQuery({
        queryKey: [...REVIEW_QUERY_KEY, 'admin', 'flagged', params],
        queryFn: () => reviewApi.getAdminFlaggedReviews(params),
        enabled: Boolean(accessToken) && (options.enabled ?? true),
    });
}

export function useUpdateReview() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ reviewId, payload }) =>
            reviewApi.updateReview(reviewId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: REVIEW_QUERY_KEY });
        },
    });
}

export function useDeleteReview() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (reviewId) => reviewApi.deleteReview(reviewId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: REVIEW_QUERY_KEY });
        },
    });
}

export function useMarkReviewHelpful() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ reviewId, helpful }) =>
            reviewApi.markHelpful(reviewId, helpful),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: REVIEW_QUERY_KEY });
        },
    });
}

export function useFlagReview() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ reviewId, reason }) => reviewApi.flagReview(reviewId, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: REVIEW_QUERY_KEY });
        },
    });
}

export function useApproveReview() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (reviewId) => reviewApi.approveReview(reviewId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: REVIEW_QUERY_KEY });
        },
    });
}

export function useRejectReview() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ reviewId, reason }) =>
            reviewApi.rejectReview(reviewId, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: REVIEW_QUERY_KEY });
        },
    });
}
