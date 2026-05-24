import { useCallback, useEffect, useRef, useState } from 'react';
import { useClickOutside } from '../shared/hooks/useClickOutside';
import { Link, NavLink } from 'react-router-dom';
import {
    Bell,
    ChevronDown,
    LayoutDashboard,
    LogOut,
    Search,
    ShoppingCart,
    UserRound,
} from 'lucide-react';

import logo from '../assets/images/logo.png';
import { useLogout } from '../features/auth/hooks/useLogout';
import { useAuthStore } from '../features/auth/store/auth.store';
import { useUnreadNotificationCount } from '../features/notifications/hooks/useNotifications';
import { ROUTES } from '../shared/constants/routes';
import { ADMIN_ENTRY_ROLES } from '../shared/constants/roles';
import { useCartSummary } from '../features/cart/hooks/useCart';

function getUserDisplayName(user) {
    return (
        user?.profile?.full_name ||
        user?.full_name ||
        user?.fullName ||
        user?.name ||
        user?.email ||
        null
    );
}

function getUserAvatarUrl(user) {
    return (
        user?.profile?.avatar_url ||
        user?.profile?.avatar ||
        user?.avatar_url ||
        user?.avatar ||
        null
    );
}

function getInitials(value) {
    if (!value) return 'U';

    return value
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word.charAt(0).toUpperCase())
        .join('');
}

function UserAvatar({ user, initials, size = 'sm' }) {
    const avatarUrl = getUserAvatarUrl(user);

    const sizeClass = size === 'lg' ? 'h-10 w-10 text-sm' : 'h-6 w-6 text-xs';
    const iconSize = size === 'lg' ? 20 : 15;

    return (
        <span
            className={`flex ${sizeClass} shrink-0 items-center justify-center overflow-hidden rounded-full bg-green-100 font-semibold text-[var(--color-primary)]`}
        >
            {avatarUrl ? (
                <img
                    src={avatarUrl}
                    alt={getUserDisplayName(user) || 'Avatar'}
                    className="h-full w-full object-cover"
                />
            ) : user ? (
                <span>{initials}</span>
            ) : (
                <UserRound size={iconSize} />
            )}
        </span>
    );
}

function hasAdminAccess(user) {
    const roles = user?.roles || [];

    return roles.some((role) => ADMIN_ENTRY_ROLES.includes(role));
}

function getNavLinkClass({ isActive }) {
    return isActive
        ? 'text-[var(--color-primary)]'
        : 'text-[var(--color-text-main)] hover:text-[var(--color-primary)]';
}

const navItems = [
    {
        label: 'Trang chủ',
        to: ROUTES.HOME,
        end: true,
    },
    {
        label: 'Sản phẩm',
        to: ROUTES.PRODUCTS,
    },
    {
        label: 'Blog',
        to: ROUTES.BLOGS,
    },
];

function Header() {
    const [isAccountOpen, setIsAccountOpen] = useState(false);
    const [isNavVisible, setIsNavVisible] = useState(true);
    const accountMenuRef = useRef(null);
    const lastScrollYRef = useRef(0);

    const user = useAuthStore((state) => state.user);
    const logoutMutation = useLogout();
    const unreadCountQuery = useUnreadNotificationCount({
        enabled: Boolean(user),
    });

    const closeAllDropdowns = useCallback(() => {
        setIsAccountOpen(false);
    }, []);

    useClickOutside(accountMenuRef, closeAllDropdowns, isAccountOpen);

    useEffect(() => {
        lastScrollYRef.current = window.scrollY;

        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            const difference = currentScrollY - lastScrollYRef.current;

            if (currentScrollY <= 8) {
                setIsNavVisible(true);
                lastScrollYRef.current = currentScrollY;
                return;
            }

            if (Math.abs(difference) < 6) {
                return;
            }

            setIsNavVisible(difference < 0);
            lastScrollYRef.current = currentScrollY;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    const isLoggedIn = Boolean(user);
    const canAccessAdmin = hasAdminAccess(user);
    const displayName = getUserDisplayName(user);
    const accountLabel = isLoggedIn ? displayName || 'Tài khoản' : 'Khách';
    const initials = getInitials(displayName || user?.email);
    const unreadCount = unreadCountQuery.data?.data?.unread_count || 0;

    const cartSummaryQuery = useCartSummary();

    const cart = cartSummaryQuery.data?.data;
    const cartItemCount =
        cart?.item_count ??
        cart?.totals?.item_count ??
        cart?.items?.length ??
        0;

    const closeAccountMenu = () => {
        setIsAccountOpen(false);
    };

    const handleLogout = () => {
        setIsAccountOpen(false);
        logoutMutation.mutate();
    };

    return (
        <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-3 sm:gap-4 sm:px-4">
                <Link to={ROUTES.HOME} className="flex items-center">
                    <img
                        src={logo}
                        alt="NguyenLien Shop"
                        className="h-8 w-auto object-contain sm:h-9"
                    />
                </Link>

                <div className="ml-auto hidden w-full max-w-sm items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 md:flex">
                    <Search
                        size={18}
                        className="text-[var(--color-text-muted)]"
                    />

                    <input
                        type="search"
                        placeholder="Tìm túi bao trái cây..."
                        className="w-full bg-transparent px-2 py-2 text-sm outline-none"
                    />
                </div>

                <Link
                    to={ROUTES.CART}
                    className="relative rounded-lg border border-[var(--color-border)] p-2 hover:bg-[var(--color-background)]"
                    aria-label="Giỏ hàng"
                >
                    <ShoppingCart size={20} />

                    <span className="absolute -right-2 -top-2 min-w-5 rounded-full bg-[var(--color-warning)] px-1.5 text-center text-xs font-semibold leading-5 text-white">
                        {cartItemCount > 99 ? '99+' : cartItemCount}
                    </span>
                </Link>

                {isLoggedIn && (
                    <Link
                        to={ROUTES.NOTIFICATIONS}
                        className="relative rounded-lg border border-[var(--color-border)] p-2 hover:bg-[var(--color-background)]"
                        aria-label="Thông báo"
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <span className="absolute -right-2 -top-2 rounded-full bg-[var(--color-error)] px-1.5 text-xs font-semibold text-white">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </Link>
                )}

                <div ref={accountMenuRef} className="relative">
                    <button
                        type="button"
                        onClick={() => setIsAccountOpen((current) => !current)}
                        className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm font-medium text-[var(--color-text-main)] transition-colors hover:bg-[var(--color-background)] sm:px-3"
                    >
                        <UserAvatar user={isLoggedIn ? user : null} initials={initials} />

                        <span className="hidden max-w-28 truncate sm:inline">
                            {accountLabel}
                        </span>
                        <ChevronDown size={15} className="hidden sm:block" />
                    </button>

                    {isAccountOpen && (
                        <div className="absolute right-0 top-11 z-50 w-64 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg">
                            {isLoggedIn ? (
                                <>
                                    <div className="border-b border-[var(--color-border)] px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <UserAvatar user={user} initials={initials} size="lg" />

                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-[var(--color-text-main)]">
                                                    {displayName || 'Tài khoản'}
                                                </p>

                                                {user?.email ? (
                                                    <p className="truncate text-xs text-[var(--color-text-muted)]">
                                                        {user.email}
                                                    </p>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="py-2">
                                        <Link
                                            to={ROUTES.PROFILE}
                                            onClick={closeAccountMenu}
                                            className="block px-4 py-2 text-sm text-[var(--color-text-main)] hover:bg-[var(--color-background)]"
                                        >
                                            Thông tin tài khoản
                                        </Link>

                                        <Link
                                            to={ROUTES.ORDERS}
                                            onClick={closeAccountMenu}
                                            className="block px-4 py-2 text-sm text-[var(--color-text-main)] hover:bg-[var(--color-background)]"
                                        >
                                            Đơn hàng của tôi
                                        </Link>

                                        <Link
                                            to={ROUTES.ADDRESSES}
                                            onClick={closeAccountMenu}
                                            className="block px-4 py-2 text-sm text-[var(--color-text-main)] hover:bg-[var(--color-background)]"
                                        >
                                            Địa chỉ giao hàng
                                        </Link>

                                        <button
                                            type="button"
                                            onClick={handleLogout}
                                            disabled={logoutMutation.isPending}
                                            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-[var(--color-error)] hover:bg-red-50 disabled:opacity-60"
                                        >
                                            <LogOut size={15} />
                                            {logoutMutation.isPending
                                                ? 'Đang đăng xuất...'
                                                : 'Đăng xuất'}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="py-2">
                                    <Link
                                        to={ROUTES.LOGIN}
                                        onClick={closeAccountMenu}
                                        className="block px-4 py-2 text-sm text-[var(--color-text-main)] hover:bg-[var(--color-background)]"
                                    >
                                        Đăng nhập
                                    </Link>

                                    <Link
                                        to={ROUTES.REGISTER}
                                        onClick={closeAccountMenu}
                                        className="block px-4 py-2 text-sm text-[var(--color-text-main)] hover:bg-[var(--color-background)]"
                                    >
                                        Đăng ký
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                {canAccessAdmin && (
                    <NavLink
                        to={ROUTES.ADMIN}
                        className={({ isActive }) =>
                            [
                                'hidden h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold transition-colors sm:inline-flex',
                                'border border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-sm',
                                'hover:bg-[var(--color-primary-hover)] hover:border-[var(--color-primary-hover)]',
                                isActive ? 'ring-2 ring-[var(--color-secondary)]' : '',
                            ].join(' ')
                        }
                    >
                        <LayoutDashboard className="h-4 w-4" />
                        <span>Quản trị</span>
                    </NavLink>
                )}
            </div>
            <div
                className={[
                    'hidden overflow-hidden border-t border-[var(--color-border)] bg-[var(--color-surface)] transition-[max-height,opacity,transform] duration-300 ease-out sm:block',
                    isNavVisible
                        ? 'max-h-12 translate-y-0 opacity-100'
                        : 'max-h-0 -translate-y-full opacity-0',
                ].join(' ')}
            >
                <nav className="mx-auto flex h-11 max-w-7xl items-center gap-6 px-4 text-sm font-medium">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            className={getNavLinkClass}
                        >
                            {item.label}
                        </NavLink>
                    ))}
                </nav>
            </div>
        </header>
    );
}

export default Header;
