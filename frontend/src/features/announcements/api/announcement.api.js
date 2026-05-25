import { axiosClient } from '../../../shared/api/axiosClient';

export const announcementApi = {
    getActive: (target) =>
        axiosClient.get('/announcements', {
            params: target ? { target } : {},
            skipAuth: target === 'guest',
        }),
};
