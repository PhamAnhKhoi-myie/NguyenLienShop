import {
    Menu,
    Search,
    ShieldCheck,
    ShoppingCart,
    User,
    X,
} from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import Badge from '../shared/components/Badge';
import Button from '../shared/components/Button';
import { ROUTES } from '../shared/constants/routes';
import { ADMIN_ENTRY_ROLES } from '../shared/constants/roles';
import { cn } from '../shared/utils/cn';
import { useAuthStore } from '../features/auth/store/auth.store';
import { useCartSummary } from '../features/cart/hooks/useCart';

const navItems = [
    { label: 'Trang chủ', to: ROUTES.HOME, end: true },
    { label: 'Sản phẩm', to: ROUTES.PRODUCTS },
    { label: 'Đơn hàng', to: ROUTES.ORDERS, protected: true },
];

const getNavClass = ({ isActive }) =>
    cn(
        'rounded-md px-3 py-2 text-sm font-medium transition-colors',
        isActive
            ? 'bg-[var(--color-secondary)] text-[var(--color-primary-hover)]'
            : 'text-[var(--color-text-muted)] hover:bg-[var(--color-secondary)] hover:text-[var(--color-primary-hover)]'
    );

export default function MainLayout() {
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    const user = useAuthStore((state) => state.user);
    const accessToken = useAuthStore((state) => state.accessToken);
    const isAuthReady = useAuthStore((state) => state.isAuthReady);
    const cartSummaryQuery = useCartSummary({ enabled: isAuthReady });
    const cartSummary = cartSummaryQuery.data?.data;
    const cartCount = cartSummary?.items_total_units || cartSummary?.item_count || 0;
    const userRoles = user?.roles || [];
    const canOpenAdmin = ADMIN_ENTRY_ROLES.some((role) =>
        userRoles.includes(role)
    );
    const displayName =
        user?.profile?.full_name || user?.full_name || user?.email || 'Tài khoản';

    const handleSearch = (event) => {
        event.preventDefault();
        const keyword = searchValue.trim();
        const target = keyword
            ? `${ROUTES.PRODUCTS}?search=${encodeURIComponent(keyword)}`
            : ROUTES.PRODUCTS;

        navigate(target);
        setIsMobileMenuOpen(false);
    };

    return (
        <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-main)]">
            <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
                    <Link
                        to={ROUTES.HOME}
                        className="shrink-0 text-lg font-semibold text-[var(--color-primary-hover)]"
                    >
                        NguyenLien Shop
                    </Link>

                    <nav className="hidden items-center gap-1 md:flex">
                        {navItems.map((item) => {
                            if (item.protected && !accessToken) {
                                return null;
                            }

                            return (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    end={item.end}
                                    className={getNavClass}
                                >
                                    {item.label}
                                </NavLink>
                            );
                        })}
                    </nav>

                    <form
                        onSubmit={handleSearch}
                        className="ml-auto hidden min-w-72 max-w-sm flex-1 items-center rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 md:flex"
                    >
                        <Search className="h-4 w-4 text-[var(--color-text-muted)]" />
                        <input
                            value={searchValue}
                            onChange={(event) => setSearchValue(event.target.value)}
                            placeholder="Tìm túi bao trái cây..."
                            className="h-10 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-[var(--color-text-muted)]"
                        />
                    </form>

                    <Link
                        to={ROUTES.CART}
                        className="relative inline-flex h-10 w-10 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-main)] transition-colors hover:bg-[var(--color-secondary)] hover:text-[var(--color-primary-hover)]"
                        aria-label="Giỏ hàng"
                    >
                        <ShoppingCart className="h-5 w-5" />
                        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-accent)] px-1 text-xs font-semibold text-white">
                            {cartCount}
                        </span>
                    </Link>

                    <div className="hidden items-center gap-2 md:flex">
                        {canOpenAdmin && (
                            <Link
                                to={ROUTES.ADMIN}
                                className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-medium text-[var(--color-text-main)] transition-colors hover:bg-[var(--color-secondary)] hover:text-[var(--color-primary-hover)]"
                            >
                                <ShieldCheck className="h-4 w-4" />
                                Admin
                            </Link>
                        )}

                        {accessToken ? (
                            <Link
                                to={ROUTES.PROFILE}
                                className="inline-flex h-10 items-center gap-2 rounded-md bg-[var(--color-secondary)] px-3 text-sm font-medium text-[var(--color-primary-hover)]"
                            >
                                <User className="h-4 w-4" />
                                <span className="max-w-32 truncate">
                                    {displayName}
                                </span>
                            </Link>
                        ) : (
                            <Link
                                to={ROUTES.LOGIN}
                                className="inline-flex h-9 items-center justify-center rounded-md bg-[var(--color-primary)] px-3 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)]"
                            >
                                Đăng nhập
                            </Link>
                        )}
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        className="md:hidden"
                        onClick={() => setIsMobileMenuOpen((current) => !current)}
                        aria-label="Mở menu"
                    >
                        {isMobileMenuOpen ? (
                            <X className="h-5 w-5" />
                        ) : (
                            <Menu className="h-5 w-5" />
                        )}
                    </Button>
                </div>

                {isMobileMenuOpen && (
                    <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 md:hidden">
                        <form onSubmit={handleSearch} className="mb-4 flex rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3">
                            <Search className="mt-3 h-4 w-4 text-[var(--color-text-muted)]" />
                            <input
                                value={searchValue}
                                onChange={(event) =>
                                    setSearchValue(event.target.value)
                                }
                                placeholder="Tìm sản phẩm..."
                                className="h-10 flex-1 bg-transparent px-2 text-sm outline-none"
                            />
                        </form>

                        <div className="flex flex-col gap-1">
                            {navItems.map((item) => {
                                if (item.protected && !accessToken) {
                                    return null;
                                }

                                return (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        end={item.end}
                                        className={getNavClass}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        {item.label}
                                    </NavLink>
                                );
                            })}
                            <NavLink
                                to={ROUTES.CART}
                                className={getNavClass}
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Giỏ hàng
                            </NavLink>
                            {canOpenAdmin && (
                                <NavLink
                                    to={ROUTES.ADMIN}
                                    className={getNavClass}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    Admin
                                </NavLink>
                            )}
                            <NavLink
                                to={accessToken ? ROUTES.PROFILE : ROUTES.LOGIN}
                                className={getNavClass}
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                {accessToken ? displayName : 'Đăng nhập'}
                            </NavLink>
                        </div>
                    </div>
                )}
            </header>

            <main className="mx-auto max-w-7xl px-4 py-6">
                <Outlet />
            </main>

            <footer className="mt-10 border-t border-[var(--color-border)] bg-[var(--color-primary-hover)] text-white">
                <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <span className="font-semibold">NguyenLien Shop</span>
                    <span className="text-green-100">
                        Vật tư nông nghiệp sạch, bảo vệ cây trồng hiệu quả.
                    </span>
                    <Badge variant="accent">Túi bao trái cây</Badge>
                </div>
            </footer>
        </div>
    );
}
