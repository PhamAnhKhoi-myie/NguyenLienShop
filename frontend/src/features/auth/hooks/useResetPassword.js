import { translate } from '../../../shared/i18n/index';
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
                    message: translate('text.password_reset_successful_please_log_in'),
                },
            });
        },
    });
}
