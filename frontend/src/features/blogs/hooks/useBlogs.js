import { useQuery } from '@tanstack/react-query';
import { blogApi } from '../api/blog.api';

export const BLOG_QUERY_KEY = ['blogs'];

export function useBlogs(params = {}) {
    return useQuery({
        queryKey: [...BLOG_QUERY_KEY, params],
        queryFn: () => blogApi.getBlogs(params),
    });
}

export function useBlogDetail(slug) {
    return useQuery({
        queryKey: [...BLOG_QUERY_KEY, 'detail', slug],
        queryFn: () => blogApi.getBySlug(slug),
        enabled: Boolean(slug),
    });
}
