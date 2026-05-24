import { axiosClient } from '../../../shared/api/axiosClient';

export const bannerApi = {
    getByLocation: (location) =>
        axiosClient.get(`/banners/location/${location}`, {
            skipAuth: true,
        }),
};