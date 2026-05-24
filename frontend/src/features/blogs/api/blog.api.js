import { axiosClient } from '../../../shared/api/axiosClient';

export const blogApi = {
    getBlogs: (params = {}) => axiosClient.get('/blogs', { params }),
    getBySlug: (slug) => axiosClient.get(`/blogs/${slug}`),
};
