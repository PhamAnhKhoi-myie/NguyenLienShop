import { axiosClient } from '../../../shared/api/axiosClient';

export const adminApi = {
    list: (endpoint, params = {}) => axiosClient.get(endpoint, { params }),
    get: (endpoint, params = {}) => axiosClient.get(endpoint, { params }),
    getDashboardStats: (params = {}) =>
        axiosClient.get('/admin/dashboard/stats', { params }),
    post: (endpoint, payload) => axiosClient.post(endpoint, payload),
    patch: (endpoint, payload) => axiosClient.patch(endpoint, payload),
    put: (endpoint, payload) => axiosClient.put(endpoint, payload),
    delete: (endpoint) => axiosClient.delete(endpoint),
};
