import { translate } from '../shared/i18n/index';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useClickOutside } from '../shared/hooks/useClickOutside';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
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
import { useCategoryTree } from '../features/categories/hooks/useCategories';
import LanguageSwitcher from '../shared/components/LanguageSwitcher';

function getUserDisplayName(user) {
    return (
        user?.profile?.full_name ||
        user?.full_name ||
        user?.fullName ||
        user?.name ||
        user?.profile?.phone_number ||
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

const navItemBaseClass =
    'inline-flex h-11 items-center rounded-full border border-transparent px-4 text-sm font-semibold transition-colors duration-200';

function getNavItemClass(isActive) {
    return [
        navItemBaseClass,
        isActive
            ? 'border-green-200 bg-green-100 text-[var(--color-primary)] shadow-sm hover:border-green-300 hover:bg-green-100 hover:text-[var(--color-primary-hover)]'
            : 'text-[var(--color-text-main)] hover:border-green-100 hover:bg-green-50 hover:text-[var(--color-primary)]',
    ].join(' ');
}

function getNavLinkClass({ isActive }) {
    return getNavItemClass(isActive);
}

function getStaticNavItemClass() {
    return [
        navItemBaseClass,
        'cursor-default text-[var(--color-text-main)] hover:border-green-100 hover:bg-green-50 hover:text-[var(--color-primary)]',
    ].join(' ');
}

const SHOPEE_STORE_URL = 'https://shopee.vn/minhthu9999_#product_list';
const SUPPLIES_CATEGORY_SLUG = 'san-pham-khac';
const FRUIT_CATEGORY_SLUGS = [
    'tui-bao-trai-xoai',
    'tui-bao-trai-buoi',
    'tui-bao-trai-oi',
    'tui-bao-trai-thanh-long',
    'tui-bao-trai-mit',
    'tui-bao-trai-nho',
    'tui-bao-nhan-vai',
    'tui-bao-trai-chuoi',
    'tui-bao-trai-na-mang-cau',
    'tui-bao-rau-cu-qua-dai',
];
const BAG_TYPE_OPTIONS = [
    { label: 'Túi lưới sọc', value: 'Túi lưới sọc' },
    { label: 'Túi mùng', value: 'Túi mùng' },
    { label: 'Vải không dệt', value: 'Vải không dệt' },
    { label: 'Túi giấy kraft', value: 'Giấy kraft' },
    { label: 'Túi xốp lưới', value: 'Xốp lưới' },
];

function buildProductsUrl(params = {}) {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            searchParams.set(key, String(value));
        }
    });

    if ([...searchParams.keys()].length > 0) {
        searchParams.set('page', '1');
    }

    const query = searchParams.toString();
    return query ? `${ROUTES.PRODUCTS}?${query}` : ROUTES.PRODUCTS;
}

function flattenCategoryTree(categories = []) {
    return categories.flatMap((category) => [
        category,
        ...flattenCategoryTree(category.children || []),
    ]);
}

function findCategoryBySlug(categories, slug) {
    return flattenCategoryTree(categories).find(
        (category) => category.slug === slug
    );
}

function HeaderDropdown({ label, to, items = [], isActive = false }) {
    const [isOpen, setIsOpen] = useState(false);
    const hasItems = items.length > 0;

    const openDropdown = () => {
        if (hasItems) {
            setIsOpen(true);
        }
    };

    const closeDropdown = () => {
        setIsOpen(false);
    };

    const handleBlur = (event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
            closeDropdown();
        }
    };

    return (
        <div
            className="relative flex h-16 items-center"
            onMouseEnter={openDropdown}
            onMouseLeave={closeDropdown}
            onFocus={openDropdown}
            onBlur={handleBlur}
        >
            <Link
                to={to}
                className={`${getNavItemClass(isActive || isOpen)} gap-1.5`}
                aria-haspopup={hasItems ? 'menu' : undefined}
                aria-expanded={hasItems ? isOpen : undefined}
            >
                <span>{label}</span>
                {hasItems && (
                    <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                )}
            </Link>

            {hasItems && (
                <div
                    className={[
                        'absolute left-1/2 top-full z-50 w-64 -translate-x-1/2 pt-2 transition-all duration-150',
                        isOpen
                            ? 'visible translate-y-0 opacity-100'
                            : 'invisible translate-y-1 opacity-0',
                    ].join(' ')}
                >
                    <div className="overflow-hidden rounded-lg border border-green-100 bg-[var(--color-surface)] py-2 shadow-xl shadow-black/10 ring-1 ring-black/5">
                        {items.map((item) => (
                            <Link
                                key={`${item.label}-${item.to}`}
                                to={item.to}
                                className="block px-4 py-2.5 text-sm font-medium text-[var(--color-text-main)] transition-colors hover:bg-green-50 hover:text-[var(--color-primary)]"
                            >
                                {item.label}
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

const productMenuItems = [
    {
        label: 'Tất cả sản phẩm',
        to: ROUTES.PRODUCTS,
    },
    {
        label: 'Sản phẩm mới',
        to: buildProductsUrl({ badge: 'new', sortBy: 'newest' }),
    },
    {
        label: 'Sản phẩm bán chạy',
        to: buildProductsUrl({ badge: 'best_seller', sortBy: 'popular' }),
    },
    {
        label: 'Sản phẩm đang giảm giá',
        to: buildProductsUrl({ badge: 'on_sale', sortBy: 'newest' }),
    },
];

function Header() {
    const location = useLocation();
    const navigate = useNavigate();

    const searchValueFromUrl =
        location.pathname === ROUTES.PRODUCTS
            ? new URLSearchParams(location.search).get('search') || ''
            : '';

    const searchInputKey = `${location.pathname}-${location.search}`;

    const [isAccountOpen, setIsAccountOpen] = useState(false);
    const [isNavVisible, setIsNavVisible] = useState(true);

    const accountMenuRef = useRef(null);
    const lastScrollYRef = useRef(0);
    const navVisibleRef = useRef(true);
    const scrollIntentRef = useRef(0);

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

        const updateNavVisible = (nextVisible) => {
            if (navVisibleRef.current === nextVisible) {
                return;
            }

            navVisibleRef.current = nextVisible;
            setIsNavVisible(nextVisible);
        };

        const handleScroll = () => {
            const maxScrollY = Math.max(
                document.documentElement.scrollHeight - window.innerHeight,
                0
            );
            const currentScrollY = Math.min(
                Math.max(window.scrollY, 0),
                maxScrollY
            );
            const difference = currentScrollY - lastScrollYRef.current;

            if (currentScrollY <= 8) {
                updateNavVisible(true);
                scrollIntentRef.current = 0;
                lastScrollYRef.current = currentScrollY;
                return;
            }

            if (Math.abs(difference) < 2) {
                return;
            }

            if (difference > 0) {
                scrollIntentRef.current =
                    scrollIntentRef.current > 0
                        ? scrollIntentRef.current + difference
                        : difference;

                if (scrollIntentRef.current >= 14) {
                    updateNavVisible(false);
                    scrollIntentRef.current = 0;
                }
            } else {
                const upwardDistance = Math.abs(difference);

                scrollIntentRef.current =
                    scrollIntentRef.current < 0
                        ? scrollIntentRef.current - upwardDistance
                        : -upwardDistance;

                if (Math.abs(scrollIntentRef.current) >= 22) {
                    updateNavVisible(true);
                    scrollIntentRef.current = 0;
                }
            }

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
    const accountLabel = isLoggedIn ? displayName || translate('text.account') : translate('text.guest');
    const initials = getInitials(
        displayName || user?.profile?.phone_number || user?.email
    );
    const unreadCount = unreadCountQuery.data?.data?.unread_count || 0;

    const cartSummaryQuery = useCartSummary();

    const cart = cartSummaryQuery.data?.data;
    const cartItemCount =
        cart?.item_count ??
        cart?.totals?.item_count ??
        cart?.items?.length ??
        0;
    const categoryTreeQuery = useCategoryTree();
    const categories = useMemo(
        () => categoryTreeQuery.data?.data || [],
        [categoryTreeQuery.data?.data]
    );
    const flatCategories = useMemo(
        () => flattenCategoryTree(categories),
        [categories]
    );
    const fruitMenuItems = useMemo(
        () => [
            { label: 'Tất cả loại trái cây', to: ROUTES.PRODUCTS },
            ...FRUIT_CATEGORY_SLUGS
                .map((slug) =>
                    flatCategories.find((category) => category.slug === slug)
                )
                .filter(Boolean)
                .map((category) => ({
                    label: category.name,
                    to: buildProductsUrl({ category_id: category.id }),
                    categoryId: category.id,
                })),
        ],
        [flatCategories]
    );
    const suppliesCategory = useMemo(
        () => findCategoryBySlug(categories, SUPPLIES_CATEGORY_SLUG),
        [categories]
    );
    const otherProductMenuItems = useMemo(
        () => [
            {
                label: 'Tất cả sản phẩm khác',
                to: buildProductsUrl({
                    category_id: suppliesCategory?.id,
                }),
                categoryId: suppliesCategory?.id,
            },
            {
                label: 'Dây thun đen',
                to: buildProductsUrl({
                    category_id: suppliesCategory?.id,
                    search: 'day thun den',
                }),
                categoryId: suppliesCategory?.id,
            },
        ],
        [suppliesCategory?.id]
    );
    const bagTypeMenuItems = useMemo(
        () => [
            { label: 'Tất cả loại túi', to: ROUTES.PRODUCTS },
            ...BAG_TYPE_OPTIONS.map((option) => ({
                label: option.label,
                to: buildProductsUrl({ bag_type: option.value }),
            })),
        ],
        []
    );
    const currentParams = new URLSearchParams(location.search);
    const activeCategoryId = currentParams.get('category_id') || '';
    const isProductsRoute = location.pathname === ROUTES.PRODUCTS;
    const isBagTypeActive = isProductsRoute && Boolean(currentParams.get('bag_type'));
    const isSuppliesActive =
        isProductsRoute &&
        Boolean(suppliesCategory?.id) &&
        activeCategoryId === suppliesCategory.id;
    const isFruitTypeActive =
        isProductsRoute &&
        !isSuppliesActive &&
        fruitMenuItems.some((item) => item.categoryId === activeCategoryId);
    const isProductNavActive =
        isProductsRoute &&
        !isBagTypeActive &&
        !isFruitTypeActive &&
        !isSuppliesActive;

    const closeAccountMenu = () => {
        setIsAccountOpen(false);
    };

    const handleLogout = () => {
        setIsAccountOpen(false);
        logoutMutation.mutate();
    };

    const handleSearchSubmit = (event) => {
        event.preventDefault();

        const formData = new FormData(event.currentTarget);
        const keyword = String(formData.get('search') || '').trim();

        if (!keyword) {
            navigate(ROUTES.PRODUCTS);
            return;
        }

        const params = new URLSearchParams({
            search: keyword,
            page: '1',
        });

        navigate(`${ROUTES.PRODUCTS}?${params.toString()}`);
    };

    return (
        <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="relative z-40 bg-[var(--color-surface)]">
                <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-3 sm:gap-4 sm:px-4">
                    <Link to={ROUTES.HOME} className="flex items-center">
                        <img
                            src={logo}
                            alt={translate('text.nguyenlien_shop')}
                            className="h-8 w-auto object-contain sm:h-9"
                        />
                    </Link>

                    <form
                        className="ml-auto hidden w-full max-w-sm items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 md:flex"
                        onSubmit={handleSearchSubmit}
                    >
                        <Search
                            size={18}
                            aria-hidden="true"
                            className="shrink-0 text-[var(--color-text-muted)]"
                        />

                        <input
                            key={searchInputKey}
                            name="search"
                            type="search"
                            placeholder={translate('text.product_search_examples')}
                            aria-label={translate('text.search_for_product')}
                            defaultValue={searchValueFromUrl}
                            onKeyDown={(event) => {
                                if (
                                    event.key === 'Enter' &&
                                    !event.nativeEvent.isComposing
                                ) {
                                    event.preventDefault();
                                    event.currentTarget.form?.requestSubmit();
                                }
                            }}
                            className="w-full bg-transparent px-2 py-2 text-sm outline-none"
                        />
                    </form>

                    <Link
                        to={ROUTES.CART}
                        className="relative rounded-lg border border-[var(--color-border)] p-2 hover:bg-[var(--color-background)]"
                        aria-label={translate('text.cart')}
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
                            aria-label={translate('text.notice')}
                        >
                            <Bell size={20} />
                            {unreadCount > 0 && (
                                <span className="absolute -right-2 -top-2 rounded-full bg-[var(--color-error)] px-1.5 text-xs font-semibold text-white">
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}
                        </Link>
                    )}

                    <LanguageSwitcher />

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
                                                        {displayName || translate('text.account')}
                                                    </p>

                                                    <p className="truncate text-xs text-[var(--color-text-muted)]">
                                                        {user?.profile?.phone_number ||
                                                            user?.email}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="py-2">
                                            <Link
                                                to={ROUTES.PROFILE}
                                                onClick={closeAccountMenu}
                                                className="block px-4 py-2 text-sm text-[var(--color-text-main)] hover:bg-[var(--color-background)]"
                                            > {translate('text.account_information')} </Link>

                                            <Link
                                                to={ROUTES.ORDERS}
                                                onClick={closeAccountMenu}
                                                className="block px-4 py-2 text-sm text-[var(--color-text-main)] hover:bg-[var(--color-background)]"
                                            > {translate('text.my_order')} </Link>

                                            <Link
                                                to={ROUTES.ADDRESSES}
                                                onClick={closeAccountMenu}
                                                className="block px-4 py-2 text-sm text-[var(--color-text-main)] hover:bg-[var(--color-background)]"
                                            > {translate('text.delivery_address')} </Link>

                                            <button
                                                type="button"
                                                onClick={handleLogout}
                                                disabled={logoutMutation.isPending}
                                                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-[var(--color-error)] hover:bg-red-50 disabled:opacity-60"
                                            >
                                                <LogOut size={15} />
                                                {logoutMutation.isPending
                                                    ? translate('text.signing_out')
                                                    : translate('text.sign_out')}
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="py-2">
                                        <Link
                                            to={ROUTES.LOGIN}
                                            onClick={closeAccountMenu}
                                            className="block px-4 py-2 text-sm text-[var(--color-text-main)] hover:bg-[var(--color-background)]"
                                        > {translate('text.login')} </Link>

                                        <Link
                                            to={ROUTES.REGISTER}
                                            onClick={closeAccountMenu}
                                            className="block px-4 py-2 text-sm text-[var(--color-text-main)] hover:bg-[var(--color-background)]"
                                        > {translate('text.subscribe_to')} </Link>
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
                            <span>{translate('text.administration')}</span>
                        </NavLink>
                    )}
                </div>
            </div>
            <div
                className={[
                    'fixed left-0 right-0 top-16 z-30 hidden h-16 overflow-visible border-b border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm transition-transform duration-300 ease-out will-change-transform sm:block',
                    isNavVisible
                        ? 'translate-y-0'
                        : 'pointer-events-none -translate-y-full',
                ].join(' ')}
            >
                <nav className="mx-auto flex h-16 max-w-7xl items-center justify-center gap-3 px-4 text-sm font-medium">
                    <HeaderDropdown
                        label={translate('text.product')}
                        to={ROUTES.PRODUCTS}
                        items={productMenuItems}
                        isActive={isProductNavActive}
                    />

                    <HeaderDropdown
                        label={translate('text.bag_type')}
                        to={ROUTES.PRODUCTS}
                        items={bagTypeMenuItems}
                        isActive={isBagTypeActive}
                    />

                    <HeaderDropdown
                        label={translate('text.fruit_type')}
                        to={ROUTES.PRODUCTS}
                        items={fruitMenuItems}
                        isActive={isFruitTypeActive}
                    />

                    <HeaderDropdown
                        label={translate('text.other_products')}
                        to={ROUTES.PRODUCTS}
                        items={otherProductMenuItems}
                        isActive={isSuppliesActive}
                    />

                    <NavLink to={ROUTES.HOME} end className={getNavLinkClass}>
                        {translate('text.home')}
                    </NavLink>

                    <span className={getStaticNavItemClass()}>
                        {translate('text.about')}
                    </span>

                    <NavLink to={ROUTES.BLOGS} className={getNavLinkClass}>
                        {translate('text.blog')}
                    </NavLink>

                    <a
                        href={SHOPEE_STORE_URL}
                        target="_blank"
                        rel="noreferrer"
                        className={getNavItemClass(false)}
                    >
                        {translate('text.shopee_store')}
                    </a>

                    <NavLink
                        to={ROUTES.STORE_LOCATION}
                        className={getNavLinkClass}
                    >
                        {translate('text.google_maps')}
                    </NavLink>
                </nav>
            </div>
        </header>
    );
}

export default Header;
