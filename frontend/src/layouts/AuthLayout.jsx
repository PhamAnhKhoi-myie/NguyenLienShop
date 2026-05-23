import { Leaf } from 'lucide-react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { ROUTES } from '../shared/constants/routes';
import { cn } from '../shared/utils/cn';

const authTabs = [
    { label: 'Đăng nhập', to: ROUTES.LOGIN },
    { label: 'Đăng ký', to: ROUTES.REGISTER },
    { label: 'Quên mật khẩu', to: ROUTES.FORGOT_PASSWORD },
    { label: 'Đặt lại', to: ROUTES.RESET_PASSWORD },
];

const getTabClass = ({ isActive }) =>
    cn(
        'rounded-md px-3 py-2 text-sm font-medium transition-colors',
        isActive
            ? 'bg-[var(--color-secondary)] text-[var(--color-primary-hover)]'
            : 'text-[var(--color-text-muted)] hover:bg-[var(--color-secondary)] hover:text-[var(--color-primary-hover)]'
    );

export default function AuthLayout() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)] px-4 py-10">
            <div className="w-full max-w-md">
                <Link
                    to={ROUTES.HOME}
                    className="mb-6 flex flex-col items-center gap-3 text-center"
                >
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-secondary)] text-[var(--color-primary-hover)]">
                        <Leaf className="h-6 w-6" />
                    </span>
                    <span className="text-xl font-semibold text-[var(--color-primary-hover)]">
                        NguyenLien Shop
                    </span>
                </Link>

                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
                    <nav className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {authTabs.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={getTabClass}
                            >
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>

                    <div className="px-1 pb-1">
                        <Outlet />
                    </div>
                </div>
            </div>
        </div>
    );
}
