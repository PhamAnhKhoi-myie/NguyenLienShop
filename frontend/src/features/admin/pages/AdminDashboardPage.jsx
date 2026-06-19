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
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import Card, { CardBody, CardHeader } from '../../../shared/components/Card';
import Loading from '../../../shared/components/Loading';
import { ROUTES } from '../../../shared/constants/routes';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import {
    ADMIN_ONLY_ROLES,
    CONTENT_MANAGER_ROLES,
    ORDER_MANAGER_ROLES,
} from '../../../shared/constants/roles';
import { useAuthStore } from '../../auth/store/auth.store';
import { useAdminDashboardStats } from '../hooks/useAdminResource';

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
        roles: ORDER_MANAGER_ROLES,
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

const rangeOptions = [
    { value: '30', label: '30 ngày' },
    { value: '90', label: '90 ngày' },
    { value: '180', label: '6 tháng' },
    { value: '365', label: '12 tháng' },
];

const chartColors = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed'];

function toDateInputValue(date) {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
}

function getPresetRange(days) {
    const today = new Date();
    const from = new Date(today);

    from.setDate(today.getDate() - Number(days) + 1);

    return {
        date_from: toDateInputValue(from),
        date_to: toDateInputValue(today),
    };
}

function formatNumber(value) {
    return new Intl.NumberFormat().format(Number(value) || 0);
}

function compactCurrency(value) {
    return new Intl.NumberFormat('vi-VN', {
        notation: 'compact',
        maximumFractionDigits: 1,
    }).format(Number(value) || 0);
}

function ChartTooltip({ active, payload, label }) {
    if (!active || !payload?.length) {
        return null;
    }

    return (
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm shadow-sm">
            <p className="font-semibold text-[var(--color-text-main)]">{label}</p>
            {payload.map((item) => (
                <p key={item.dataKey} style={{ color: item.color }}>
                    {item.name}: {item.dataKey === 'revenue'
                        ? formatCurrency(item.value || 0)
                        : formatNumber(item.value || 0)}
                </p>
            ))}
        </div>
    );
}

function MetricCard({ icon: Icon, label, value, detail }) {
    return (
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)] p-4">
            <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-[var(--color-text-muted)]">{label}</p>
                <Icon className="h-4 w-4 text-[var(--color-primary)]" />
            </div>
            <p className="mt-2 text-2xl font-semibold text-[var(--color-text-main)]">
                {value}
            </p>
            {detail && (
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    {detail}
                </p>
            )}
        </div>
    );
}

function SimpleBreakdown({ items = [], labelKey, valueKey = 'count' }) {
    const max = Math.max(...items.map((item) => item[valueKey] || 0), 1);

    return (
        <div className="space-y-3">
            {items.map((item, index) => {
                const value = item[valueKey] || 0;
                const label = item[labelKey] || 'UNKNOWN';

                return (
                    <div key={`${label}-${index}`} className="space-y-1">
                        <div className="flex justify-between gap-3 text-sm">
                            <span className="truncate text-[var(--color-text-main)]">
                                {label}
                            </span>
                            <span className="font-medium text-[var(--color-text-main)]">
                                {formatNumber(value)}
                            </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[var(--color-border)]">
                            <div
                                className="h-full rounded-full"
                                style={{
                                    width: `${Math.max((value / max) * 100, 4)}%`,
                                    backgroundColor:
                                        chartColors[index % chartColors.length],
                                }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default function AdminDashboardPage() {
    const user = useAuthStore((state) => state.user);
    const roles = user?.roles || [];
    const [rangePreset, setRangePreset] = useState('30');
    const [granularity, setGranularity] = useState('day');
    const [dateRange, setDateRange] = useState(() => getPresetRange(30));
    const sections = dashboardSections.filter((section) =>
        section.roles.some((role) => roles.includes(role))
    );
    const analyticsParams = useMemo(
        () => ({
            ...dateRange,
            granularity,
        }),
        [dateRange, granularity]
    );
    const analyticsQuery = useAdminDashboardStats(analyticsParams);
    const analytics = analyticsQuery.data?.data;
    const revenueSeries = analytics?.revenue?.series || [];
    const customerSeries = analytics?.customers?.new_series || [];
    const topProducts = analytics?.products?.top_selling || [];

    const handlePresetChange = (event) => {
        const days = event.target.value;

        setRangePreset(days);
        setDateRange(getPresetRange(days));
        setGranularity(Number(days) > 180 ? 'month' : 'day');
    };

    const handleDateChange = (field, value) => {
        setRangePreset('custom');
        setDateRange((current) => ({
            ...current,
            [field]: value,
        }));
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardBody>
                    <p className="text-sm font-medium text-[var(--color-primary-hover)]"> {translate('text.admin')} </p>
                    <h1 className="mt-1 text-2xl font-semibold text-[var(--color-text-main)]"> {translate('text.administration_overview')} </h1>
                    <p className="mt-2 text-sm text-[var(--color-text-muted)]"> {translate('text.the_admin_interface_is_tracking_be_permissions_manager_only_sees_content')} </p>
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h2 className="font-semibold text-[var(--color-text-main)]">
                                Analytics
                            </h2>
                            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                                Customer, products và doanh thu đã thanh toán
                            </p>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-4">
                            <select
                                value={rangePreset}
                                onChange={handlePresetChange}
                                className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-main)]"
                            >
                                {rangeOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                                <option value="custom">Tùy chỉnh</option>
                            </select>
                            <input
                                type="date"
                                value={dateRange.date_from}
                                onChange={(event) =>
                                    handleDateChange('date_from', event.target.value)
                                }
                                className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-main)]"
                            />
                            <input
                                type="date"
                                value={dateRange.date_to}
                                onChange={(event) =>
                                    handleDateChange('date_to', event.target.value)
                                }
                                className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-main)]"
                            />
                            <select
                                value={granularity}
                                onChange={(event) =>
                                    setGranularity(event.target.value)
                                }
                                className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-main)]"
                            >
                                <option value="day">Theo ngày</option>
                                <option value="month">Theo tháng</option>
                            </select>
                        </div>
                    </div>
                </CardHeader>
                <CardBody className="space-y-6">
                    {analyticsQuery.isLoading ? (
                        <Loading label="Đang tải analytics" />
                    ) : analyticsQuery.isError ? (
                        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--color-error)]">
                            {analyticsQuery.error.message}
                        </p>
                    ) : (
                        <>
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                <MetricCard
                                    icon={Users}
                                    label="Customers"
                                    value={formatNumber(analytics?.customers?.total)}
                                    detail={`${formatNumber(
                                        customerSeries.reduce(
                                            (sum, item) => sum + (item.count || 0),
                                            0
                                        )
                                    )} customer mới`}
                                />
                                <MetricCard
                                    icon={Package}
                                    label="Products"
                                    value={formatNumber(analytics?.products?.total)}
                                    detail={`${formatNumber(
                                        topProducts.reduce(
                                            (sum, item) => sum + (item.quantity || 0),
                                            0
                                        )
                                    )} sản phẩm đã bán`}
                                />
                                <MetricCard
                                    icon={CreditCard}
                                    label="Doanh thu đã thanh toán"
                                    value={formatCurrency(
                                        analytics?.revenue?.net_revenue || 0
                                    )}
                                    detail={`${formatNumber(
                                        analytics?.revenue?.order_count
                                    )} đơn hàng`}
                                />
                                <MetricCard
                                    icon={ShoppingBag}
                                    label="Giá trị đơn trung bình"
                                    value={formatCurrency(
                                        analytics?.revenue
                                            ?.average_order_value || 0
                                    )}
                                    detail="Tính trên đơn đã thanh toán"
                                />
                            </div>

                            <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
                                <div className="rounded-md border border-[var(--color-border)] p-4">
                                    <h3 className="font-semibold text-[var(--color-text-main)]">
                                        Doanh thu
                                    </h3>
                                    <div className="mt-4 h-72">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={revenueSeries}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="date" tickMargin={8} />
                                                <YAxis
                                                    tickFormatter={compactCurrency}
                                                    width={72}
                                                />
                                                <Tooltip content={<ChartTooltip />} />
                                                <Line
                                                    type="monotone"
                                                    dataKey="revenue"
                                                    name="Doanh thu"
                                                    stroke="#2563eb"
                                                    strokeWidth={2}
                                                    dot={false}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="rounded-md border border-[var(--color-border)] p-4">
                                    <h3 className="font-semibold text-[var(--color-text-main)]">
                                        Cơ cấu doanh thu
                                    </h3>
                                    <div className="mt-4 space-y-3 text-sm">
                                        <div className="flex justify-between gap-4">
                                            <span className="text-[var(--color-text-muted)]">
                                                Gross sales
                                            </span>
                                            <span className="font-medium text-[var(--color-text-main)]">
                                                {formatCurrency(
                                                    analytics?.revenue?.gross_sales || 0
                                                )}
                                            </span>
                                        </div>
                                        <div className="flex justify-between gap-4">
                                            <span className="text-[var(--color-text-muted)]">
                                                Khuyến mãi sản phẩm
                                            </span>
                                            <span className="font-medium text-[var(--color-error)]">
                                                -{formatCurrency(
                                                    analytics?.revenue
                                                        ?.product_discount || 0
                                                )}
                                            </span>
                                        </div>
                                        <div className="flex justify-between gap-4">
                                            <span className="text-[var(--color-text-muted)]">
                                                Voucher
                                            </span>
                                            <span className="font-medium text-[var(--color-error)]">
                                                -{formatCurrency(
                                                    analytics?.revenue
                                                        ?.voucher_discount || 0
                                                )}
                                            </span>
                                        </div>
                                        <div className="flex justify-between gap-4">
                                            <span className="text-[var(--color-text-muted)]">
                                                Phí ship thu khách
                                            </span>
                                            <span className="font-medium text-[var(--color-text-main)]">
                                                {formatCurrency(
                                                    analytics?.revenue?.shipping_fee || 0
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-6 xl:grid-cols-2">
                                <div className="rounded-md border border-[var(--color-border)] p-4">
                                    <h3 className="font-semibold text-[var(--color-text-main)]">
                                        Customer mới
                                    </h3>
                                    <div className="mt-4 h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={customerSeries}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="date" tickMargin={8} />
                                                <YAxis allowDecimals={false} width={48} />
                                                <Tooltip content={<ChartTooltip />} />
                                                <Bar
                                                    dataKey="count"
                                                    name="Customer"
                                                    fill="#16a34a"
                                                    radius={[4, 4, 0, 0]}
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="rounded-md border border-[var(--color-border)] p-4">
                                    <h3 className="font-semibold text-[var(--color-text-main)]">
                                        Top sản phẩm bán chạy
                                    </h3>
                                    <div className="mt-4 h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart
                                                data={topProducts}
                                                layout="vertical"
                                                margin={{ left: 16, right: 16 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis type="number" allowDecimals={false} />
                                                <YAxis
                                                    type="category"
                                                    dataKey="name"
                                                    width={120}
                                                    tick={{ fontSize: 12 }}
                                                />
                                                <Tooltip content={<ChartTooltip />} />
                                                <Bar
                                                    dataKey="quantity"
                                                    name="Số lượng"
                                                    fill="#f59e0b"
                                                    radius={[0, 4, 4, 0]}
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-6 lg:grid-cols-3">
                                <div className="rounded-md border border-[var(--color-border)] p-4">
                                    <h3 className="mb-4 font-semibold text-[var(--color-text-main)]">
                                        Customer theo trạng thái
                                    </h3>
                                    <SimpleBreakdown
                                        items={analytics?.customers?.status_breakdown}
                                        labelKey="status"
                                    />
                                </div>
                                <div className="rounded-md border border-[var(--color-border)] p-4">
                                    <h3 className="mb-4 font-semibold text-[var(--color-text-main)]">
                                        Customer theo tier
                                    </h3>
                                    <SimpleBreakdown
                                        items={analytics?.customers?.tier_breakdown}
                                        labelKey="tier"
                                    />
                                </div>
                                <div className="rounded-md border border-[var(--color-border)] p-4">
                                    <h3 className="mb-4 font-semibold text-[var(--color-text-main)]">
                                        Products theo category
                                    </h3>
                                    <SimpleBreakdown
                                        items={analytics?.products?.category_breakdown}
                                        labelKey="name"
                                    />
                                </div>
                            </div>
                        </>
                    )}
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
