import { createBrowserRouter, Navigate } from 'react-router-dom';

import AdminLayout from '../layouts/AdminLayout';
import AuthLayout from '../layouts/AuthLayout';
import MainLayout from '../layouts/MainLayout';

import AdminDashboardPage from '../features/admin/pages/AdminDashboardPage';
import AdminSectionPage from '../features/admin/pages/AdminSectionPage';
import CartPage from '../features/cart/pages/CartPage';
import CheckoutPage from '../features/checkout/pages/CheckoutPage';
import ForgotPasswordPage from '../features/auth/pages/ForgotPasswordPage';
import HomePage from '../features/home/pages/HomePage';
import LoginPage from '../features/auth/pages/LoginPage';
import NotFoundPage from '../features/home/pages/NotFoundPage';
import OrderListPage from '../features/orders/pages/OrderListPage';
import ProductDetailPage from '../features/products/pages/ProductDetailPage';
import ProductListPage from '../features/products/pages/ProductListPage';
import ProfilePage from '../features/profile/pages/ProfilePage';
import ProtectedRoute from '../features/auth/components/ProtectedRoute';
import RegisterPage from '../features/auth/pages/RegisterPage';
import ResetPasswordPage from '../features/auth/pages/ResetPasswordPage';
import RoleRoute from '../features/auth/components/RoleRoute';
import { ROUTES } from '../shared/constants/routes';
import { ADMIN_ENTRY_ROLES } from '../shared/constants/roles';

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
                path: 'checkout',
                element: (
                    <ProtectedRoute>
                        <CheckoutPage />
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
                path: 'profile',
                element: (
                    <ProtectedRoute>
                        <ProfilePage />
                    </ProtectedRoute>
                ),
            },
        ],
    },
    {
        path: '/auth',
        element: <AuthLayout />,
        children: [
            {
                index: true,
                element: <Navigate to={ROUTES.LOGIN} replace />,
            },
            {
                path: 'login',
                element: <LoginPage />,
            },
            {
                path: 'register',
                element: <RegisterPage />,
            },
            {
                path: 'forgot-password',
                element: <ForgotPasswordPage />,
            },
            {
                path: 'reset-password',
                element: <ResetPasswordPage />,
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
                element: (
                    <AdminSectionPage
                        title="Quản lý sản phẩm"
                        description="Quản lý sản phẩm, biến thể và đơn vị bán."
                    />
                ),
            },
            {
                path: 'categories',
                element: <AdminSectionPage title="Quản lý danh mục" />,
            },
            {
                path: 'orders',
                element: <AdminSectionPage title="Quản lý đơn hàng" />,
            },
            {
                path: 'payments',
                element: <AdminSectionPage title="Quản lý thanh toán" />,
            },
            {
                path: 'shipments',
                element: <AdminSectionPage title="Quản lý vận chuyển" />,
            },
            {
                path: 'discounts',
                element: <AdminSectionPage title="Quản lý mã giảm giá" />,
            },
            {
                path: 'banners',
                element: <AdminSectionPage title="Quản lý banner" />,
            },
            {
                path: 'announcements',
                element: <AdminSectionPage title="Quản lý thông báo" />,
            },
            {
                path: 'shop-info',
                element: <AdminSectionPage title="Thông tin cửa hàng" />,
            },
            {
                path: 'users',
                element: <AdminSectionPage title="Quản lý người dùng" />,
            },
            {
                path: 'audit-logs',
                element: <AdminSectionPage title="Audit logs" />,
            },
        ],
    },
    {
        path: '*',
        element: <NotFoundPage />,
    },
]);
