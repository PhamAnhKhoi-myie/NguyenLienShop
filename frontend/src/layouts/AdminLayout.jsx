import {
    BarChart3,
    Bell,
    Boxes,
    CreditCard,
    FileClock,
    Home,
    LayoutDashboard,
    LogOut,
    Menu,
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

const adminNavItems = [
    { label: 'Tổng quan', to: ROUTES.ADMIN, icon: LayoutDashboard, end: true },
    { label: 'Sản phẩm', to: ROUTES.ADMIN_PRODUCTS, icon: Package },
    { label: 'Danh mục', to: ROUTES.ADMIN_CATEGORIES, icon: Boxes },
    { label: 'Đơn hàng', to: ROUTES.ADMIN_ORDERS, icon: ShoppingBag },
    { label: 'Thanh toán', to: ROUTES.ADMIN_PAYMENTS, icon: CreditCard },
    { label: 'Vận chuyển', to: ROUTES.ADMIN_SHIPMENTS, icon: Truck },
    { label: 'Mã giảm giá', to: ROUTES.ADMIN_DISCOUNTS, icon: Percent },
    { label: 'Banner', to: ROUTES.ADMIN_BANNERS, icon: BarChart3 },
    { label: 'Thông báo', to: ROUTES.ADMIN_ANNOUNCEMENTS, icon: Bell },
    { label: 'Thông tin shop', to: ROUTES.ADMIN_SHOP_INFO, icon: Settings },
    { label: 'Người dùng', to: ROUTES.ADMIN_USERS, icon: Users },
    { label: 'Audit logs', to: ROUTES.ADMIN_AUDIT_LOGS, icon: FileClock },
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
    const displayName =
        user?.profile?.full_name || user?.full_name || user?.email || 'Quản trị';

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
                    >
                        Admin Panel
                    </Link>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="lg:hidden"
                        onClick={() => setIsSidebarOpen(false)}
                        aria-label="Đóng menu"
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                <nav className="mt-6 space-y-1">
                    {adminNavItems.map((item) => {
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
                    aria-label="Đóng menu"
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
                                aria-label="Mở menu"
                            >
                                <Menu className="h-5 w-5" />
                            </Button>
                            <div>
                                <p className="text-sm text-[var(--color-text-muted)]">
                                    Xin chào
                                </p>
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
                                <Home className="h-4 w-4" />
                                Shop
                            </Link>
                            <Button
                                variant="outline"
                                size="sm"
                                isLoading={logoutMutation.isPending}
                                onClick={() => logoutMutation.mutate()}
                            >
                                <LogOut className="h-4 w-4" />
                                Đăng xuất
                            </Button>
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
