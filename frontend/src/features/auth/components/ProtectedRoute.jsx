import { Navigate, useLocation } from 'react-router-dom';
import Loading from '../../../shared/components/Loading';
import { ROUTES } from '../../../shared/constants/routes';
import { useAuthStore } from '../store/auth.store';

export default function ProtectedRoute({ children }) {
    const location = useLocation();
    const accessToken = useAuthStore((state) => state.accessToken);
    const isAuthReady = useAuthStore((state) => state.isAuthReady);

    if (!isAuthReady) {
        return <Loading fullPage />;
    }

    if (!accessToken) {
        return (
            <Navigate
                to={ROUTES.LOGIN}
                replace
                state={{ from: location }}
            />
        );
    }

    return children;
}
