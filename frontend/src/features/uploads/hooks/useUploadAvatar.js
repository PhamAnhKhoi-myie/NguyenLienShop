import { useMutation } from '@tanstack/react-query';
import { uploadApi } from '../api/upload.api';

export function useUploadAvatar() {
    return useMutation({
        mutationFn: uploadApi.uploadAvatar,
    });
}
