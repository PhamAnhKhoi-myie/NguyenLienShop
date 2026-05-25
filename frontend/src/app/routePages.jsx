import { lazy, Suspense } from 'react';

import Loading from '../shared/components/Loading';

export const AdminAuditLogsPage = lazy(() =>
    import('../features/admin/pages/AdminAuditLogsPage')
);
export const AdminConfiguredPage = lazy(() =>
    import('../features/admin/pages/AdminConfiguredPage')
);
export const AdminDashboardPage = lazy(() =>
    import('../features/admin/pages/AdminDashboardPage')
);
export const AdminDiscountsPage = lazy(() =>
    import('../features/admin/pages/AdminDiscountsPage')
);
export const AdminOrdersPage = lazy(() =>
    import('../features/admin/pages/AdminOrdersPage')
);
export const AdminPaymentsPage = lazy(() =>
    import('../features/admin/pages/AdminPaymentsPage')
);
export const AdminReviewsPage = lazy(() =>
    import('../features/admin/pages/AdminReviewsPage')
);
export const AdminShipmentsPage = lazy(() =>
    import('../features/admin/pages/AdminShipmentsPage')
);
export const AdminShopInfoPage = lazy(() =>
    import('../features/admin/pages/AdminShopInfoPage')
);
export const AdminUsersPage = lazy(() =>
    import('../features/admin/pages/AdminUsersPage')
);
export const AdminVariantsPage = lazy(() =>
    import('../features/admin/pages/AdminVariantsPage')
);
export const AddressesPage = lazy(() =>
    import('../features/profile/pages/AddressesPage')
);
export const BlogDetailPage = lazy(() =>
    import('../features/blogs/pages/BlogDetailPage')
);
export const BlogListPage = lazy(() =>
    import('../features/blogs/pages/BlogListPage')
);
export const StoreLocationPage = lazy(() =>
    import('../features/contact/pages/StoreLocationPage')
);
export const CartPage = lazy(() => import('../features/cart/pages/CartPage'));
export const CheckoutPage = lazy(() =>
    import('../features/checkout/pages/CheckoutPage')
);
export const CheckoutResultPage = lazy(() =>
    import('../features/checkout/pages/CheckoutResultPage')
);
export const ChangePasswordPage = lazy(() =>
    import('../features/profile/pages/ChangePasswordPage')
);
export const ForgotPasswordPage = lazy(() =>
    import('../features/auth/pages/ForgotPasswordPage')
);
export const HomePage = lazy(() => import('../features/home/pages/HomePage'));
export const LoginPage = lazy(() => import('../features/auth/pages/LoginPage'));
export const NotFoundPage = lazy(() =>
    import('../features/home/pages/NotFoundPage')
);
export const NotificationsPage = lazy(() =>
    import('../features/notifications/pages/NotificationsPage')
);
export const OrderDetailPage = lazy(() =>
    import('../features/orders/pages/OrderDetailPage')
);
export const OrderListPage = lazy(() =>
    import('../features/orders/pages/OrderListPage')
);
export const PaymentReturnPage = lazy(() =>
    import('../features/payments/pages/PaymentReturnPage')
);
export const ProductDetailPage = lazy(() =>
    import('../features/products/pages/ProductDetailPage')
);
export const ProductListPage = lazy(() =>
    import('../features/products/pages/ProductListPage')
);
export const ProfilePage = lazy(() =>
    import('../features/profile/pages/ProfilePage')
);
export const ProfileReviewsPage = lazy(() =>
    import('../features/profile/pages/ProfileReviewsPage')
);
export const ProfileVouchersPage = lazy(() =>
    import('../features/profile/pages/ProfileVouchersPage')
);
export const RegisterPage = lazy(() =>
    import('../features/auth/pages/RegisterPage')
);
export const ResetPasswordPage = lazy(() =>
    import('../features/auth/pages/ResetPasswordPage')
);

export function RouteSuspense({ children }) {
    return <Suspense fallback={<Loading fullPage />}>{children}</Suspense>;
}
