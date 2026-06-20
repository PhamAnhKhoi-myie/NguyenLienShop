import { axiosClient } from '../../../shared/api/axiosClient';

export const chatApi = {
    createSession: (payload = {}) => axiosClient.post('/chats/sessions', payload),
    sendMessage: (payload) => axiosClient.post('/chats/message', payload),
};
