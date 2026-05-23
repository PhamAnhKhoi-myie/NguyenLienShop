import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../shared/constants/routes';
import { authApi } from '../api/auth.api';

export function useResetPassword() {
    const navigate = useNavigate();

    return useMutation({
        mutationFn: authApi.resetPassword,
        onSuccess: () => {
            navigate(ROUTES.LOGIN, {
                replace: true,
                state: {
                    message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập.',
                },
            });
        },
    });
}
