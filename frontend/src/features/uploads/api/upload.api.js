import axios from 'axios';
import { axiosClient } from '../../../shared/api/axiosClient';

export const uploadApi = {
    createSignature: ({ asset_type, folder, tags = [], overwrite = false }) =>
        axiosClient.post('/uploads/cloudinary/signature', {
            asset_type,
            folder,
            tags,
            overwrite,
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

    uploadImage: async ({ file, asset_type, folder, tags = [] }) => {
        const signatureResponse = await uploadApi.createSignature({
            asset_type,
            folder,
            tags,
        });

        const cloudinaryResult = await uploadApi.uploadToCloudinary({
            file,
            signatureData: signatureResponse.data,
        });

        return {
            url: cloudinaryResult.secure_url,
            public_id: cloudinaryResult.public_id,
        };
    },

    uploadAvatar: (file) =>
        uploadApi.uploadImage({
            file,
            asset_type: 'avatar',
            folder: 'avatars',
            tags: ['avatar', 'user'],
        }),

    uploadBanner: (file) =>
        uploadApi.uploadImage({
            file,
            asset_type: 'banner',
            folder: 'banners',
            tags: ['banner'],
        }),

    uploadProductImage: (file) =>
        uploadApi.uploadImage({
            file,
            asset_type: 'product',
            folder: 'products',
            tags: ['product'],
        }),
};