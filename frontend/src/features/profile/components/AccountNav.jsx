import { translate } from '../../../shared/i18n/index';
import { NavLink } from 'react-router-dom';
import {
    Bell,
    KeyRound,
    MapPin,
    MessageSquare,
    PackageCheck,
    TicketPercent,
    UserRound,
} from 'lucide-react';
import { ROUTES } from '../../../shared/constants/routes';
import { cn } from '../../../shared/utils/cn';

const links = [
    {
        to: ROUTES.PROFILE,
        label: translate('text.profile'),
        icon: UserRound,
        end: true,
    },
    {
        to: ROUTES.ADDRESSES,
        label: translate('text.address'),
        icon: MapPin,
    },
    {
        to: ROUTES.CHANGE_PASSWORD,
        label: translate('text.change_password'),
        icon: KeyRound,
    },
    {
        to: ROUTES.ORDERS,
        label: translate('text.order_0aba562f'),
        icon: PackageCheck,
    },
    {
        to: ROUTES.PROFILE_REVIEWS,
        label: translate('text.review'),
        icon: MessageSquare,
    },
    {
        to: ROUTES.PROFILE_VOUCHERS,
        label: translate('text.voucher'),
        icon: TicketPercent,
    },
    {
        to: ROUTES.NOTIFICATIONS,
        label: translate('text.notice'),
        icon: Bell,
    },
];

export default function AccountNav() {
    return (
        <nav className="flex gap-2 overflow-x-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
            {links.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                    key={to}
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                        cn(
                            'inline-flex h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors',
                            isActive
                                ? 'bg-[var(--color-secondary)] text-[var(--color-primary-hover)]'
                                : 'text-[var(--color-text-muted)] hover:bg-[var(--color-background)] hover:text-[var(--color-text-main)]'
                        )
                    }
                >
                    <Icon className="h-4 w-4" />
                    {label}
                </NavLink>
            ))}
        </nav>
    );
}
