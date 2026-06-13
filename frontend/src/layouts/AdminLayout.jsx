import { translate } from '../shared/i18n/index';
import {
    BarChart3,
    Boxes,
    CreditCard,
    FileClock,
    Home,
    LayoutDashboard,
    Layers3,
    LogOut,
    Menu,
    MessageSquare,
    Newspaper,
    Package,
    Percent,
    Settings,
    ShoppingBag,
    Truck,
    Users,
    X,
} from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import Button from '../shared/components/Button';
import { ROUTES } from '../shared/constants/routes';
import { cn } from '../shared/utils/cn';
import { useLogout } from '../features/auth/hooks/useLogout';
import { useAuthStore } from '../features/auth/store/auth.store';
import {
    ADMIN_ONLY_ROLES,
    CONTENT_MANAGER_ROLES,
} from '../shared/constants/roles';

const adminNavItems = [
    {
        label: translate('text.overview'),
        to: ROUTES.ADMIN,
        icon: LayoutDashboard,
        end: true,
        roles: CONTENT_MANAGER_ROLES,
    },
    {
        label: translate('text.product'),
        to: ROUTES.ADMIN_PRODUCTS,
        icon: Package,
        roles: CONTENT_MANAGER_ROLES,
    },
    {
        label: translate('text.category'),
        to: ROUTES.ADMIN_CATEGORIES,
        icon: Boxes,
        roles: CONTENT_MANAGER_ROLES,
    },
    {
        label: translate('text.variants'),
        to: ROUTES.ADMIN_VARIANTS,
        icon: Layers3,
        roles: CONTENT_MANAGER_ROLES,
    },
    {
        label: translate('text.banner_c8af83fb'),
        to: ROUTES.ADMIN_BANNERS,
        icon: BarChart3,
        roles: CONTENT_MANAGER_ROLES,
    },
    {
        label: translate('text.article'),
        to: ROUTES.ADMIN_BLOGS,
        icon: Newspaper,
        roles: CONTENT_MANAGER_ROLES,
    },
    {
        label: translate('text.review'),
        to: ROUTES.ADMIN_REVIEWS,
        icon: MessageSquare,
        roles: ADMIN_ONLY_ROLES,
    },
    {
        label: translate('text.shop_information'),
        to: ROUTES.ADMIN_SHOP_INFO,
        icon: Settings,
        roles: CONTENT_MANAGER_ROLES,
    },
    {
        label: translate('text.order_0aba562f'),
        to: ROUTES.ADMIN_ORDERS,
        icon: ShoppingBag,
        roles: ADMIN_ONLY_ROLES,
    },
    {
        label: translate('text.shipping'),
        to: ROUTES.ADMIN_SHIPMENTS,
        icon: Truck,
        roles: ADMIN_ONLY_ROLES,
    },
    {
        label: translate('text.checkout'),
        to: ROUTES.ADMIN_PAYMENTS,
        icon: CreditCard,
        roles: ADMIN_ONLY_ROLES,
    },
    {
        label: translate('text.discount_code'),
        to: ROUTES.ADMIN_DISCOUNTS,
        icon: Percent,
        roles: ADMIN_ONLY_ROLES,
    },
    {
        label: translate('text.user'),
        to: ROUTES.ADMIN_USERS,
        icon: Users,
        roles: ADMIN_ONLY_ROLES,
    },
    {
        label: translate('text.audit_logs'),
        to: ROUTES.ADMIN_AUDIT_LOGS,
        icon: FileClock,
        roles: ADMIN_ONLY_ROLES,
    },
];

const getAdminNavClass = ({ isActive }) =>
    cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        isActive
            ? 'bg-[var(--color-secondary)] text-[var(--color-primary-hover)]'
            : 'text-[var(--color-text-muted)] hover:bg-[var(--color-secondary)] hover:text-[var(--color-primary-hover)]'
    );

export default function AdminLayout() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const logoutMutation = useLogout();
    const user = useAuthStore((state) => state.user);
    const roles = user?.roles || [];
    const visibleNavItems = adminNavItems.filter((item) =>
        item.roles.some((role) => roles.includes(role))
    );
    const displayName =
        user?.profile?.full_name ||
        user?.full_name ||
        user?.profile?.phone_number ||
        user?.email ||
        translate('text.administration');

    return (
        <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-main)] lg:grid lg:grid-cols-[280px_1fr]">
            <aside
                className={cn(
                    'fixed inset-y-0 left-0 z-50 w-72 border-r border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-transform lg:static lg:z-auto lg:w-auto lg:translate-x-0',
                    isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                )}
            >
                <div className="flex h-12 items-center justify-between">
                    <Link
                        to={ROUTES.ADMIN}
                        className="text-lg font-semibold text-[var(--color-primary-hover)]"
                        onClick={() => setIsSidebarOpen(false)}
                    > {translate('text.admin_panel')} </Link>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="lg:hidden"
                        onClick={() => setIsSidebarOpen(false)}
                        aria-label={translate('text.close_menu')}
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                <nav className="mt-6 space-y-1">
                    {visibleNavItems.map((item) => {
                        const Icon = item.icon;

                        return (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                end={item.end}
                                className={getAdminNavClass}
                                onClick={() => setIsSidebarOpen(false)}
                            >
                                <Icon className="h-4 w-4" />
                                {item.label}
                            </NavLink>
                        );
                    })}
                </nav>
            </aside>

            {isSidebarOpen && (
                <button
                    type="button"
                    className="fixed inset-0 z-40 bg-black/30 lg:hidden"
                    aria-label={translate('text.close_menu')}
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <div className="min-w-0">
                <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                    <div className="flex h-16 items-center justify-between gap-4 px-4 lg:px-6">
                        <div className="flex items-center gap-3">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="lg:hidden"
                                onClick={() => setIsSidebarOpen(true)}
                                aria-label={translate('text.open_menu')}
                            >
                                <Menu className="h-5 w-5" />
                            </Button>
                            <div>
                                <p className="text-sm text-[var(--color-text-muted)]"> {translate('text.hello')} </p>
                                <h1 className="text-base font-semibold text-[var(--color-text-main)]">
                                    {displayName}
                                </h1>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <span className="hidden rounded-full bg-[var(--color-secondary)] px-3 py-1 text-xs font-medium text-[var(--color-primary-hover)] sm:inline-flex">
                                {roles.join(', ') || 'NO_ROLE'}
                            </span>
                            <Link
                                to={ROUTES.HOME}
                                className="hidden h-9 items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-medium text-[var(--color-text-main)] transition-colors hover:bg-[var(--color-secondary)] hover:text-[var(--color-primary-hover)] sm:inline-flex"
                            >
                                <Home className="h-4 w-4" /> {translate('text.shop')} </Link>
                            <Button
                                variant="outline"
                                size="sm"
                                isLoading={logoutMutation.isPending}
                                onClick={() => logoutMutation.mutate()}
                            >
                                <LogOut className="h-4 w-4" /> {translate('text.sign_out')} </Button>
                        </div>
                    </div>
                </header>

                <main className="px-4 py-6 lg:px-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
