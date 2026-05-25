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
        title: 'Products',
        description: 'Sản phẩm, danh mục, variants và variant units.',
        links: [
            { label: 'Products', to: ROUTES.ADMIN_PRODUCTS, icon: Package },
            { label: 'Categories', to: ROUTES.ADMIN_CATEGORIES, icon: Boxes },
            { label: 'Variants', to: ROUTES.ADMIN_VARIANTS, icon: Layers3 },
        ],
        roles: CONTENT_MANAGER_ROLES,
    },
    {
        title: 'Content',
        description: 'Banner và thông tin shop.',
        links: [
            { label: 'Banners', to: ROUTES.ADMIN_BANNERS, icon: Bell },
            { label: 'Shop info', to: ROUTES.ADMIN_SHOP_INFO, icon: Settings },
        ],
        roles: CONTENT_MANAGER_ROLES,
    },
    {
        title: 'Operations',
        description: 'Đơn hàng, vận chuyển, thanh toán và mã giảm giá.',
        links: [
            { label: 'Orders', to: ROUTES.ADMIN_ORDERS, icon: ShoppingBag },
            { label: 'Shipments', to: ROUTES.ADMIN_SHIPMENTS, icon: Truck },
            { label: 'Payments', to: ROUTES.ADMIN_PAYMENTS, icon: CreditCard },
            { label: 'Discounts', to: ROUTES.ADMIN_DISCOUNTS, icon: Percent },
        ],
        roles: ADMIN_ONLY_ROLES,
    },
    {
        title: 'Security',
        description: 'Người dùng và audit logs.',
        links: [
            { label: 'Users', to: ROUTES.ADMIN_USERS, icon: Users },
            { label: 'Audit logs', to: ROUTES.ADMIN_AUDIT_LOGS, icon: FileClock },
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
                    <p className="text-sm font-medium text-[var(--color-primary-hover)]">
                        Admin
                    </p>
                    <h1 className="mt-1 text-2xl font-semibold text-[var(--color-text-main)]">
                        Tổng quan quản trị
                    </h1>
                    <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                        Giao diện admin đang bám theo quyền BE. MANAGER chỉ thấy nhóm nội dung và catalog; ADMIN thấy toàn bộ vận hành nhạy cảm.
                    </p>
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
