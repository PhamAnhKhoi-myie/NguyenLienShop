import { ChevronRight, Home } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

import { ROUTES } from '../constants/routes';
import { translate } from '../i18n/index';
import { cn } from '../utils/cn';

const STATIC_LABELS = {
    products: 'text.products',
    blogs: 'text.blog',
    'store-location': 'text.store_location',
    cart: 'text.cart',
    auth: 'text.account',
    login: 'text.login',
    register: 'text.register',
    'forgot-password': 'text.forgot_password',
    'reset-password': 'text.reset_password',
    checkout: 'text.checkout',
    'payment-return': 'text.payment_results',
    payment: 'text.payment_b41a92be',
    orders: 'text.orders',
    profile: 'text.profile',
    addresses: 'text.address',
    reviews: 'text.reviews',
    vouchers: 'text.voucher',
    'change-password': 'text.change_password',
    notifications: 'text.notifications',
    success: 'text.success',
    fail: 'text.failure',
    cancel: 'text.cancel',
    'vnpay-return': 'text.payment_results',
};

const DETAIL_LABELS = {
    products: 'text.product_details',
    blogs: 'text.article_details',
    orders: 'text.order_details',
};

function getLabelKey(segment, previousSegment, isLast) {
    if (isLast && DETAIL_LABELS[previousSegment]) {
        return DETAIL_LABELS[previousSegment];
    }

    return STATIC_LABELS[segment] || null;
}

function formatFallbackLabel(segment) {
    return decodeURIComponent(segment)
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function Breadcrumb({ className }) {
    const location = useLocation();
    const segments = location.pathname.split('/').filter(Boolean);

    if (segments.length === 0 || segments[0] === 'admin') {
        return null;
    }

    const items = [
        {
            label: translate('text.home'),
            to: ROUTES.HOME,
            icon: Home,
        },
        ...segments.map((segment, index) => {
            const isLast = index === segments.length - 1;
            const labelKey = getLabelKey(segment, segments[index - 1], isLast);

            return {
                label: labelKey ? translate(labelKey) : formatFallbackLabel(segment),
                to: `/${segments.slice(0, index + 1).join('/')}`,
                isLast,
            };
        }),
    ];

    return (
        <nav
            aria-label={translate('text.breadcrumb')}
            className={cn(
                'mb-5 overflow-x-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 shadow-sm',
                className
            )}
        >
            <ol className="flex min-w-max items-center gap-1 text-sm text-[var(--color-text-muted)]">
                {items.map((item, index) => {
                    const Icon = item.icon;
                    const isLast = index === items.length - 1;

                    return (
                        <li key={`${item.to}-${item.label}`} className="flex items-center gap-1">
                            {index > 0 && (
                                <ChevronRight className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
                            )}
                            {isLast ? (
                                <span
                                    aria-current="page"
                                    className="inline-flex items-center gap-1.5 whitespace-nowrap font-medium text-[var(--color-text-main)]"
                                >
                                    {Icon && <Icon className="h-4 w-4" />}
                                    {item.label}
                                </span>
                            ) : (
                                <Link
                                    to={item.to}
                                    className="inline-flex items-center gap-1.5 whitespace-nowrap rounded px-1.5 py-1 transition-colors hover:bg-[var(--color-secondary)] hover:text-[var(--color-primary-hover)]"
                                >
                                    {Icon && <Icon className="h-4 w-4" />}
                                    {item.label}
                                </Link>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
