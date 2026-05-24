import axios from 'axios';
import { axiosClient } from '../../../shared/api/axiosClient';

export const uploadApi = {
    createAvatarSignature: () =>
        axiosClient.post('/uploads/cloudinary/avatar-signature', {
            asset_type: 'avatar',
            folder: 'avatars',
            tags: ['avatar', 'user'],
            overwrite: true,
            invalidate: true,
        }),

    uploadToCloudinary: async ({ file, signatureData }) => {
        const formData = new FormData();

        formData.append('file', file);
        formData.append('api_key', signatureData.api_key);

        Object.entries(signatureData.params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                formData.append(key, value);
            }
        });

        const response = await axios.post(signatureData.upload_url, formData);

        return response.data;
    },

    uploadAvatar: async (file) => {
        const signatureResponse = await uploadApi.createAvatarSignature();
        const signatureData = signatureResponse.data;

        const cloudinaryResult = await uploadApi.uploadToCloudinary({
            file,
            signatureData,
        });

        return {
            url: cloudinaryResult.secure_url,
            public_id: cloudinaryResult.public_id,
        };
    },
};
