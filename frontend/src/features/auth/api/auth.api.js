import { axiosClient } from '../../../shared/api/axiosClient';

export const authApi = {
    register: (payload) =>
        axiosClient.post('/auth/register', payload, { skipAuth: true }),

    login: (payload) =>
        axiosClient.post('/auth/login', payload, { skipAuth: true }),

    logout: () => axiosClient.post('/auth/logout', null, { skipAuth: true }),

    refresh: () => axiosClient.post('/auth/refresh', null, { skipAuth: true }),

    forgotPassword: (payload) =>
        axiosClient.post('/auth/forgot-password', payload, { skipAuth: true }),

    resetPassword: (payload) =>
        axiosClient.post('/auth/reset-password', payload, { skipAuth: true }),

    changePassword: (payload) =>
        axiosClient.post('/auth/change-password', payload),

    getMe: () => axiosClient.get('/users/me'),
};