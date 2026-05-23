import { axiosClient } from '../../../shared/api/axiosClient';

export const productApi = {
    getProducts: (params = {}) => axiosClient.get('/products', { params }),
    searchProducts: (params = {}) =>
        axiosClient.get('/products/search', { params }),
    getById: (productId, params = {}) =>
        axiosClient.get(`/products/${productId}`, { params }),
    getBySlug: (slug, params = {}) =>
        axiosClient.get(`/products/slug/${slug}`, { params }),
    getByCategory: (categoryId, params = {}) =>
        axiosClient.get(`/products/category/${categoryId}`, { params }),
};
