import { translate } from '../../../shared/i18n/index';
import {
    Bell,
    Boxes,
    CreditCard,
    FileClock,
    Layers3,
    Package,
    Percent,
    Settings,
    ShoppingBag,
    Truck,
    Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Card, { CardBody, CardHeader } from '../../../shared/components/Card';
import { ROUTES } from '../../../shared/constants/routes';
import {
    ADMIN_ONLY_ROLES,
    CONTENT_MANAGER_ROLES,
} from '../../../shared/constants/roles';
import { useAuthStore } from '../../auth/store/auth.store';

const dashboardSections = [
    {
        title: translate('text.products'),
        description: translate('text.products_categories_variants_and_variant_units'),
        links: [
            { label: translate('text.products'), to: ROUTES.ADMIN_PRODUCTS, icon: Package },
            { label: translate('text.categories'), to: ROUTES.ADMIN_CATEGORIES, icon: Boxes },
            { label: translate('text.variants'), to: ROUTES.ADMIN_VARIANTS, icon: Layers3 },
        ],
        roles: CONTENT_MANAGER_ROLES,
    },
    {
        title: translate('text.content'),
        description: translate('text.banner_and_shop_information'),
        links: [
            { label: translate('text.banners'), to: ROUTES.ADMIN_BANNERS, icon: Bell },
            { label: translate('text.shop_info'), to: ROUTES.ADMIN_SHOP_INFO, icon: Settings },
        ],
        roles: CONTENT_MANAGER_ROLES,
    },
    {
        title: translate('text.operations'),
        description: translate('text.orders_shipping_payments_and_discount_codes'),
        links: [
            { label: translate('text.orders'), to: ROUTES.ADMIN_ORDERS, icon: ShoppingBag },
            { label: translate('text.shipments'), to: ROUTES.ADMIN_SHIPMENTS, icon: Truck },
            { label: translate('text.payments'), to: ROUTES.ADMIN_PAYMENTS, icon: CreditCard },
            { label: translate('text.discounts'), to: ROUTES.ADMIN_DISCOUNTS, icon: Percent },
        ],
        roles: ADMIN_ONLY_ROLES,
    },
    {
        title: translate('text.security_f25ce1b8'),
        description: translate('text.users_and_audit_logs'),
        links: [
            { label: translate('text.users'), to: ROUTES.ADMIN_USERS, icon: Users },
            { label: translate('text.audit_logs'), to: ROUTES.ADMIN_AUDIT_LOGS, icon: FileClock },
        ],
        roles: ADMIN_ONLY_ROLES,
    },
];

export default function AdminDashboardPage() {
    const user = useAuthStore((state) => state.user);
    const roles = user?.roles || [];
    const sections = dashboardSections.filter((section) =>
        section.roles.some((role) => roles.includes(role))
    );

    return (
        <div className="space-y-6">
            <Card>
                <CardBody>
                    <p className="text-sm font-medium text-[var(--color-primary-hover)]"> {translate('text.admin')} </p>
                    <h1 className="mt-1 text-2xl font-semibold text-[var(--color-text-main)]"> {translate('text.administration_overview')} </h1>
                    <p className="mt-2 text-sm text-[var(--color-text-muted)]"> {translate('text.the_admin_interface_is_tracking_be_permissions_manager_only_sees_content')} </p>
                </CardBody>
            </Card>

            <div className="grid gap-6 xl:grid-cols-2">
                {sections.map((section) => (
                    <Card key={section.title}>
                        <CardHeader>
                            <h2 className="font-semibold text-[var(--color-text-main)]">
                                {section.title}
                            </h2>
                            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                                {section.description}
                            </p>
                        </CardHeader>
                        <CardBody>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {section.links.map((link) => {
                                    const Icon = link.icon;

                                    return (
                                        <Link
                                            key={link.to}
                                            to={link.to}
                                            className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] p-4 text-sm font-medium text-[var(--color-text-main)] transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-secondary)]"
                                        >
                                            <Icon className="h-5 w-5 text-[var(--color-primary)]" />
                                            {link.label}
                                        </Link>
                                    );
                                })}
                            </div>
                        </CardBody>
                    </Card>
                ))}
            </div>
        </div>
    );
}
