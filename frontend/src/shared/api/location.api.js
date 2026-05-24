import { axiosClient } from './axiosClient';

export const locationApi = {
    getProvinces: () => axiosClient.get('/locations/provinces'),
    getWards: (provinceCode) =>
        axiosClient.get(`/locations/provinces/${provinceCode}/wards`),
};
