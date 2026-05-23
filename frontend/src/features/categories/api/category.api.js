import { axiosClient } from '../../../shared/api/axiosClient';

export const categoryApi = {
    getTree: (params = {}) => axiosClient.get('/categories/tree', { params }),
    getAll: (params = {}) => axiosClient.get('/categories/all', { params }),
};
