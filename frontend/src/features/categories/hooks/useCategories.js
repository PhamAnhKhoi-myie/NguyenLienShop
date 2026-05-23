import { useQuery } from '@tanstack/react-query';
import { categoryApi } from '../api/category.api';

export function useCategoryTree(params = {}) {
    return useQuery({
        queryKey: ['categories', 'tree', params],
        queryFn: () => categoryApi.getTree(params),
    });
}

export function useCategories(params = {}) {
    return useQuery({
        queryKey: ['categories', 'all', params],
        queryFn: () => categoryApi.getAll(params),
    });
}
