import axios from 'axios';
import { ENV } from '../config/env';
import { useAuthStore } from '../../features/auth/store/auth.store';

export const axiosClient = axios.create({
    baseURL: ENV.API_BASE_URL,
    withCredentials: true,
    timeout: 15000,
});

let refreshPromise = null;

const refreshAccessToken = async () => {
    if (!refreshPromise) {
        refreshPromise = axios
            .post(`${ENV.API_BASE_URL}/auth/refresh`, null, {
                withCredentials: true,
            })
            .then((response) => {
                const accessToken = response.data?.data?.accessToken;

                if (!accessToken) {
                    throw new Error('Missing access token');
                }

                useAuthStore.getState().setAccessToken(accessToken);

                return accessToken;
            })
            .finally(() => {
                refreshPromise = null;
            });
    }

    return refreshPromise;
};

axiosClient.interceptors.request.use((config) => {
    const accessToken = useAuthStore.getState().accessToken;

    if (accessToken && !config.skipAuth) {
        config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
});

axiosClient.interceptors.response.use(
    (response) => response.data,
    async (error) => {
        const originalRequest = error.config;
        const code = error.response?.data?.code;

        if (
            error.response?.status === 401 &&
            code === 'TOKEN_EXPIRED' &&
            originalRequest &&
            !originalRequest._retry
        ) {
            originalRequest._retry = true;

            try {
                const accessToken = await refreshAccessToken();
                originalRequest.headers = originalRequest.headers || {};
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;

                return axiosClient(originalRequest);
            } catch (refreshError) {
                useAuthStore.getState().clearAuth();

                return Promise.reject({
                    status: refreshError.response?.status,
                    message:
                        refreshError.response?.data?.message ||
                        refreshError.message ||
                        'Session expired',
                    raw: refreshError.response?.data,
                });
            }
        }

        const message =
            error.response?.data?.message ||
            error.message ||
            'Something went wrong';

        return Promise.reject({
            status: error.response?.status,
            message,
            errors: error.response?.data?.errors,
            raw: error.response?.data,
        });
    }
);
