import { createBrowserRouter, Navigate } from 'react-router-dom';

import AdminLayout from '../layouts/AdminLayout';
import MainLayout from '../layouts/MainLayout';
import RootRoute from './RootRoute';

import ProtectedRoute from '../features/auth/components/ProtectedRoute';
import RoleRoute from '../features/auth/components/RoleRoute';
import {
    AdminAuditLogsPage,
    AdminConfiguredPage,
    AdminDashboardPage,
    AdminDiscountsPage,
    AdminOrdersPage,
    AdminPaymentsPage,
    AdminReviewsPage,
    AdminShipmentsPage,
    AdminShopInfoPage,
    AdminUsersPage,
    AdminVariantsPage,
    AddressesPage,
    BlogDetailPage,
    BlogListPage,
    CartPage,
    CheckoutPage,
    CheckoutResultPage,
    ChangePasswordPage,
    ForgotPasswordPage,
    HomePage,
    LoginPage,
    NotFoundPage,
    NotificationsPage,
    OrderDetailPage,
    OrderListPage,
    PaymentReturnPage,
    ProductDetailPage,
    ProductListPage,
    ProfilePage,
    ProfileReviewsPage,
    ProfileVouchersPage,
    RegisterPage,
    ResetPasswordPage,
    StoreLocationPage,
    RouteSuspense,
} from './routePages';
import { ROUTES } from '../shared/constants/routes';
import {
    ADMIN_ENTRY_ROLES,
    ADMIN_ONLY_ROLES,
    CONTENT_MANAGER_ROLES,
} from '../shared/constants/roles';

function routePage(element) {
    return <RouteSuspense>{element}</RouteSuspense>;
}

function adminRoute(element, allowedRoles = CONTENT_MANAGER_ROLES) {
    return (
        <RoleRoute allowedRoles={allowedRoles}>{routePage(element)}</RoleRoute>
    );
}

export const router = createBrowserRouter([
    {
        element: <RootRoute />,
        children: [
            {
                path: ROUTES.HOME,
                element: <MainLayout />,
                children: [
                    {
                        index: true,
                        element: routePage(<HomePage />),
                    },
                    {
                        path: 'products',
                        element: routePage(<ProductListPage />),
                    },
                    {
                        path: 'products/:productId',
                        element: routePage(<ProductDetailPage />),
                    },
                    {
                        path: 'blogs',
                        element: routePage(<BlogListPage />),
                    },
                    {
                        path: 'blogs/:slug',
                        element: routePage(<BlogDetailPage />),
                    },
                    {
                        path: 'store-location',
                        element: routePage(<StoreLocationPage />),
                    },
                    {
                        path: 'cart',
                        element: routePage(<CartPage />),
                    },
                    {
                        path: 'auth',
                        element: <Navigate to={ROUTES.LOGIN} replace />,
                    },
                    {
                        path: 'auth/login',
                        element: routePage(<LoginPage />),
                    },
                    {
                        path: 'auth/register',
                        element: routePage(<RegisterPage />),
                    },
                    {
                        path: 'auth/forgot-password',
                        element: routePage(<ForgotPasswordPage />),
                    },
                    {
                        path: 'auth/reset-password',
                        element: routePage(<ResetPasswordPage />),
                    },
                    {
                        path: 'checkout',
                        element: (
                            <ProtectedRoute>
                                {routePage(<CheckoutPage />)}
                            </ProtectedRoute>
                        ),
                    },
                    {
                        path: 'checkout/success',
                        element: (
                            <ProtectedRoute>
                                {routePage(<CheckoutResultPage status="success" />)}
                            </ProtectedRoute>
                        ),
                    },
                    {
                        path: 'checkout/fail',
                        element: (
                            <ProtectedRoute>
                                {routePage(<CheckoutResultPage status="fail" />)}
                            </ProtectedRoute>
                        ),
                    },
                    {
                        path: 'payment-return',
                        element: (
                            <ProtectedRoute>
                                {routePage(<PaymentReturnPage />)}
                            </ProtectedRoute>
                        ),
                    },
                    {
                        path: 'payment/vnpay-return',
                        element: (
                            <ProtectedRoute>
                                {routePage(<PaymentReturnPage />)}
                            </ProtectedRoute>
                        ),
                    },
                    {
                        path: 'orders',
                        element: (
                            <ProtectedRoute>
                                {routePage(<OrderListPage />)}
                            </ProtectedRoute>
                        ),
                    },
                    {
                        path: 'orders/:orderId',
                        element: (
                            <ProtectedRoute>
                                {routePage(<OrderDetailPage />)}
                            </ProtectedRoute>
                        ),
                    },
                    {
                        path: 'profile',
                        element: (
                            <ProtectedRoute>
                                {routePage(<ProfilePage />)}
                            </ProtectedRoute>
                        ),
                    },
                    {
                        path: 'profile/addresses',
                        element: (
                            <ProtectedRoute>
                                {routePage(<AddressesPage />)}
                            </ProtectedRoute>
                        ),
                    },
                    {
                        path: 'profile/reviews',
                        element: (
                            <ProtectedRoute>
                                {routePage(<ProfileReviewsPage />)}
                            </ProtectedRoute>
                        ),
                    },
                    {
                        path: 'profile/vouchers',
                        element: (
                            <ProtectedRoute>
                                {routePage(<ProfileVouchersPage />)}
                            </ProtectedRoute>
                        ),
                    },
                    {
                        path: 'profile/change-password',
                        element: (
                            <ProtectedRoute>
                                {routePage(<ChangePasswordPage />)}
                            </ProtectedRoute>
                        ),
                    },
                    {
                        path: 'notifications',
                        element: (
                            <ProtectedRoute>
                                {routePage(<NotificationsPage />)}
                            </ProtectedRoute>
                        ),
                    },
                ],
            },
            {
                path: ROUTES.ADMIN,
                element: (
                    <ProtectedRoute>
                        <RoleRoute allowedRoles={ADMIN_ENTRY_ROLES}>
                            <AdminLayout />
                        </RoleRoute>
                    </ProtectedRoute>
                ),
                children: [
                    {
                        index: true,
                        element: routePage(<AdminDashboardPage />),
                    },
                    {
                        path: 'products',
                        element: adminRoute(<AdminConfiguredPage resourceKey="products" />),
                    },
                    {
                        path: 'categories',
                        element: adminRoute(<AdminConfiguredPage resourceKey="categories" />),
                    },
                    {
                        path: 'variants',
                        element: adminRoute(<AdminVariantsPage />),
                    },
                    {
                        path: 'orders',
                        element: adminRoute(<AdminOrdersPage />, ADMIN_ONLY_ROLES),
                    },
                    {
                        path: 'payments',
                        element: adminRoute(<AdminPaymentsPage />, ADMIN_ONLY_ROLES),
                    },
                    {
                        path: 'shipments',
                        element: adminRoute(<AdminShipmentsPage />, ADMIN_ONLY_ROLES),
                    },
                    {
                        path: 'discounts',
                        element: adminRoute(<AdminDiscountsPage />, ADMIN_ONLY_ROLES),
                    },
                    {
                        path: 'banners',
                        element: adminRoute(<AdminConfiguredPage resourceKey="banners" />),
                    },
                    {
                        path: 'blogs',
                        element: adminRoute(<AdminConfiguredPage resourceKey="blogs" />),
                    },
                    {
                        path: 'reviews',
                        element: adminRoute(<AdminReviewsPage />, ADMIN_ONLY_ROLES),
                    },
                    {
                        path: 'shop-info',
                        element: adminRoute(<AdminShopInfoPage />),
                    },
                    {
                        path: 'users',
                        element: adminRoute(<AdminUsersPage />, ADMIN_ONLY_ROLES),
                    },
                    {
                        path: 'audit-logs',
                        element: adminRoute(<AdminAuditLogsPage />, ADMIN_ONLY_ROLES),
                    },
                ],
            },
            {
                path: '*',
                element: routePage(<NotFoundPage />),
            },
        ],
    },
]);
