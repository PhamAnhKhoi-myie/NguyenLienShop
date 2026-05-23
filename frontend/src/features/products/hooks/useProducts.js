import { useQuery } from '@tanstack/react-query';
import { productApi } from '../api/product.api';

export function useProducts(params = {}) {
    return useQuery({
        queryKey: ['products', params],
        queryFn: () => productApi.getProducts(params),
    });
}

export function useProductDetail(productId, params = { include_units: true }) {
    return useQuery({
        queryKey: ['products', 'detail', productId, params],
        queryFn: () => productApi.getById(productId, params),
        enabled: Boolean(productId),
    });
}
