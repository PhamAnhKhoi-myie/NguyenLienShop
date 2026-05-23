import { createBrowserRouter, Navigate } from 'react-router-dom';

import AdminLayout from '../layouts/AdminLayout';
import MainLayout from '../layouts/MainLayout';

import AdminConfiguredPage from '../features/admin/pages/AdminConfiguredPage';
import AdminDashboardPage from '../features/admin/pages/AdminDashboardPage';
import AdminShopInfoPage from '../features/admin/pages/AdminShopInfoPage';
import AdminVariantsPage from '../features/admin/pages/AdminVariantsPage';
import AddressesPage from '../features/profile/pages/AddressesPage';
import CartPage from '../features/cart/pages/CartPage';
import CheckoutPage from '../features/checkout/pages/CheckoutPage';
import CheckoutResultPage from '../features/checkout/pages/CheckoutResultPage';
import ForgotPasswordPage from '../features/auth/pages/ForgotPasswordPage';
import HomePage from '../features/home/pages/HomePage';
import LoginPage from '../features/auth/pages/LoginPage';
import NotFoundPage from '../features/home/pages/NotFoundPage';
import NotificationsPage from '../features/notifications/pages/NotificationsPage';
import OrderDetailPage from '../features/orders/pages/OrderDetailPage';
import OrderListPage from '../features/orders/pages/OrderListPage';
import PaymentReturnPage from '../features/payments/pages/PaymentReturnPage';
import ProductDetailPage from '../features/products/pages/ProductDetailPage';
import ProductListPage from '../features/products/pages/ProductListPage';
import ProfilePage from '../features/profile/pages/ProfilePage';
import ProtectedRoute from '../features/auth/components/ProtectedRoute';
import RegisterPage from '../features/auth/pages/RegisterPage';
import ResetPasswordPage from '../features/auth/pages/ResetPasswordPage';
import RoleRoute from '../features/auth/components/RoleRoute';
import { ROUTES } from '../shared/constants/routes';
import {
    ADMIN_ENTRY_ROLES,
    ADMIN_ONLY_ROLES,
    CONTENT_MANAGER_ROLES,
} from '../shared/constants/roles';

function adminRoute(element, allowedRoles = CONTENT_MANAGER_ROLES) {
    return <RoleRoute allowedRoles={allowedRoles}>{element}</RoleRoute>;
}

export const router = createBrowserRouter([
    {
        path: ROUTES.HOME,
        element: <MainLayout />,
        children: [
            {
                index: true,
                element: <HomePage />,
            },
            {
                path: 'products',
                element: <ProductListPage />,
            },
            {
                path: 'products/:productId',
                element: <ProductDetailPage />,
            },
            {
                path: 'cart',
                element: <CartPage />,
            },
            {
                path: 'auth',
                element: <Navigate to={ROUTES.LOGIN} replace />,
            },
            {
                path: 'auth/login',
                element: <LoginPage />,
            },
            {
                path: 'auth/register',
                element: <RegisterPage />,
            },
            {
                path: 'auth/forgot-password',
                element: <ForgotPasswordPage />,
            },
            {
                path: 'auth/reset-password',
                element: <ResetPasswordPage />,
            },
            {
                path: 'checkout',
                element: (
                    <ProtectedRoute>
                        <CheckoutPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: 'checkout/success',
                element: (
                    <ProtectedRoute>
                        <CheckoutResultPage status="success" />
                    </ProtectedRoute>
                ),
            },
            {
                path: 'checkout/fail',
                element: (
                    <ProtectedRoute>
                        <CheckoutResultPage status="fail" />
                    </ProtectedRoute>
                ),
            },
            {
                path: 'payment-return',
                element: (
                    <ProtectedRoute>
                        <PaymentReturnPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: 'payment/vnpay-return',
                element: (
                    <ProtectedRoute>
                        <PaymentReturnPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: 'orders',
                element: (
                    <ProtectedRoute>
                        <OrderListPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: 'orders/:orderId',
                element: (
                    <ProtectedRoute>
                        <OrderDetailPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: 'profile',
                element: (
                    <ProtectedRoute>
                        <ProfilePage />
                    </ProtectedRoute>
                ),
            },
            {
                path: 'profile/addresses',
                element: (
                    <ProtectedRoute>
                        <AddressesPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: 'notifications',
                element: (
                    <ProtectedRoute>
                        <NotificationsPage />
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
                element: <AdminDashboardPage />,
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
                element: adminRoute(
                    <AdminConfiguredPage resourceKey="orders" />,
                    ADMIN_ONLY_ROLES
                ),
            },
            {
                path: 'payments',
                element: adminRoute(
                    <AdminConfiguredPage resourceKey="payments" />,
                    ADMIN_ONLY_ROLES
                ),
            },
            {
                path: 'shipments',
                element: adminRoute(
                    <AdminConfiguredPage resourceKey="shipments" />,
                    ADMIN_ONLY_ROLES
                ),
            },
            {
                path: 'discounts',
                element: adminRoute(
                    <AdminConfiguredPage resourceKey="discounts" />,
                    ADMIN_ONLY_ROLES
                ),
            },
            {
                path: 'banners',
                element: adminRoute(<AdminConfiguredPage resourceKey="banners" />),
            },
            {
                path: 'announcements',
                element: adminRoute(
                    <AdminConfiguredPage resourceKey="announcements" />
                ),
            },
            {
                path: 'shop-info',
                element: adminRoute(<AdminShopInfoPage />),
            },
            {
                path: 'users',
                element: adminRoute(
                    <AdminConfiguredPage resourceKey="users" />,
                    ADMIN_ONLY_ROLES
                ),
            },
            {
                path: 'audit-logs',
                element: adminRoute(
                    <AdminConfiguredPage resourceKey="auditLogs" />,
                    ADMIN_ONLY_ROLES
                ),
            },
        ],
    },
    {
        path: '*',
        element: <NotFoundPage />,
    },
]);
