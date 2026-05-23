import { Navigate } from 'react-router-dom';
import { ROUTES } from '../../../shared/constants/routes';
import { useAuthStore } from '../store/auth.store';

export default function RoleRoute({ allowedRoles = [], children }) {
    const user = useAuthStore((state) => state.user);
    const userRoles = user?.roles || [];

    if (allowedRoles.length === 0) {
        return children;
    }

    const hasRole = allowedRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
        return <Navigate to={ROUTES.HOME} replace />;
    }

    return children;
}
