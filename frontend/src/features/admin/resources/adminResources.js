import { translate } from '../../../shared/i18n/index';
import { formatDateTime, formatMoney } from '../utils/adminFormat';
import {
    categoryFormConfig,
    productFormConfig,
} from './adminCatalogForms';
import {
    announcementFormConfig,
    bannerFormConfig,
    contentFilterOptions,
} from './adminContentForms';
import { blogFormConfig, blogStatusOptions } from './adminBlogForms';

const activeStatusOptions = [
    { value: '', label: translate('text.all_statuses') },
    { value: 'ACTIVE', label: translate('text.active') },
    { value: 'INACTIVE', label: translate('text.inactive') },
];

const orderStatusOptions = [
    { value: '', label: translate('text.all_statuses') },
    { value: 'PENDING', label: translate('text.pending_0a7b38b7') },
    { value: 'PAID', label: translate('text.paid_f3534db5') },
    { value: 'PROCESSING', label: translate('text.processing') },
    { value: 'SHIPPED', label: translate('text.shipped') },
    { value: 'DELIVERED', label: translate('text.delivered_1bd2e76f') },
    { value: 'FAILED', label: translate('text.failed_8d33f306') },
    { value: 'CANCELED', label: translate('text.canceled_30b6a2af') },
];

const paymentStatusOptions = [
    { value: '', label: translate('text.all_statuses') },
    { value: 'pending', label: translate('text.pending_e2258693') },
    { value: 'paid', label: translate('text.paid_9e1f1120') },
    { value: 'failed', label: translate('text.failed') },
];

function imageCount(row) {
    return row.images?.length || row.image_urls?.length || 0;
}

function productPriceRange(row) {
    const min = Number(row.min_price || 0);
    const max = Number(row.max_price || 0);

    if (!min && !max) {
        return '-';
    }

    return min === max
        ? formatMoney(min)
        : `${formatMoney(min)} - ${formatMoney(max)}`;
}

function discountValue(row) {
    if (row.type === 'percentage') {
        return `${row.value}%`;
    }

    return formatMoney(row.value);
}

function auditActor(row) {
    return row.actor_email || row.actor_id || row.actor?.email || row.actor?.id || '-';
}

export const adminResources = {
    products: {
        title: translate('text.product_management'),
        description: translate('text.admin_manager_creates_edits_soft_deletes_and_manages_products'),
        endpoint: '/products',
        limit: 20,
        form: productFormConfig,
        filters: [
            { name: 'search', label: translate('text.search'), placeholder: translate('text.product_name_1f1c0d91') },
            { name: 'status', label: translate('text.status'), type: 'select', options: activeStatusOptions },
        ],
        columns: [
            { key: 'name', header: translate('text.product_name'), value: 'name' },
            { key: 'category', header: translate('text.category'), value: (row) => row.category?.name || row.category_name },
            {
                key: 'product_type',
                header: 'Loại sản phẩm',
                value: (row) =>
                    row.product_type === 'SIMPLE'
                        ? 'Đơn giản'
                        : 'Có biến thể',
            },
            { key: 'status', header: translate('text.status'), value: 'status', type: 'status' },
            { key: 'price', header: translate('text.price_range'), value: productPriceRange },
            { key: 'is_new', header: translate('text.new_arrival'), value: 'is_new' },
            { key: 'is_best_seller', header: translate('text.best_seller'), value: 'is_best_seller' },
            { key: 'is_on_sale', header: translate('text.discounted'), value: 'is_on_sale' },
            { key: 'images', header: translate('text.photo'), value: imageCount },
            { key: 'created_at', header: translate('text.creation_date'), value: 'created_at', type: 'date' },
        ],
        getDeleteEndpoint: (row) => `/products/${row.id || row._id}`,
        deleteConfirm: translate('text.soft_delete_this_product'),
    },
    categories: {
        title: translate('text.manage_categories'),
        description: translate('text.admin_manager_creates_edits_soft_deletes_and_manages_product_catalog_tre'),
        endpoint: '/categories/all',
        limit: 100,
        form: categoryFormConfig,
        filters: [
            { name: 'status', label: translate('text.status'), type: 'select', options: activeStatusOptions },
        ],
        columns: [
            { key: 'name', header: translate('text.category_name'), value: 'name' },
            { key: 'slug', header: translate('text.slug'), value: 'slug' },
            { key: 'parent', header: translate('text.parent_category'), value: (row) => row.parent?.name || row.parent_name },
            { key: 'status', header: translate('text.status'), value: 'status', type: 'status' },
            { key: 'display_order', header: translate('text.order'), value: 'display_order' },
        ],
        getDeleteEndpoint: (row) => `/categories/${row.id || row._id}`,
        deleteConfirm: translate('text.soft_delete_this_category'),
    },
    banners: {
        title: translate('text.manage_banner'),
        description: translate('text.admin_manager_manages_banner_display_by_position'),
        endpoint: '/banners',
        limit: 50,
        form: bannerFormConfig,
        filters: [
            {
                name: 'location',
                label: translate('text.location'),
                type: 'select',
                options: [
                    { value: '', label: translate('text.all_locations') },
                    ...contentFilterOptions.bannerLocations,
                ],
            },
        ],
        columns: [
            { key: 'image', header: translate('text.photo'), value: (row) => row.image?.alt_text || row.image?.url },
            { key: 'location', header: translate('text.location'), value: 'location' },
            { key: 'is_active', header: translate('text.displays'), value: 'is_active', type: 'status' },
            { key: 'sort_order', header: translate('text.order'), value: 'sort_order' },
            { key: 'start_at', header: translate('text.start'), value: 'start_at', type: 'date' },
            { key: 'end_at', header: translate('text.end'), value: 'end_at', type: 'date' },
        ],
        getDeleteEndpoint: (row) => `/banners/${row.id || row._id}`,
        deleteConfirm: translate('text.delete_this_banner'),
    },
    announcements: {
        title: translate('text.manage_shop_notifications'),
        description: translate('text.admin_manager_manages_announcements_displayed_to_guests'),
        endpoint: '/announcements/admin/all',
        limit: 50,
        form: announcementFormConfig,
        filters: [
            {
                name: 'target',
                label: translate('text.object'),
                type: 'select',
                options: [
                    { value: '', label: translate('text.all_objects') },
                    ...contentFilterOptions.announcementTargets,
                ],
            },
            {
                name: 'type',
                label: translate('text.type'),
                type: 'select',
                options: [
                    { value: '', label: translate('text.all_types') },
                    ...contentFilterOptions.announcementTypes,
                ],
            },
            {
                name: 'activeOnly',
                label: translate('text.valid'),
                type: 'select',
                options: [
                    { value: '', label: translate('text.all') },
                    { value: 'true', label: translate('text.showing') },
                ],
            },
        ],
        columns: [
            { key: 'title', header: translate('text.title'), value: 'title' },
            { key: 'type', header: translate('text.type'), value: 'type' },
            { key: 'target', header: translate('text.object'), value: 'target' },
            { key: 'priority', header: translate('text.priority'), value: 'priority', type: 'status' },
            { key: 'is_active', header: translate('text.on'), value: 'is_active', type: 'status' },
            { key: 'start_at', header: translate('text.start'), value: 'start_at', type: 'date' },
            { key: 'end_at', header: translate('text.end'), value: 'end_at', type: 'date' },
        ],
        getDeleteEndpoint: (row) => `/announcements/${row.id || row._id}`,
        deleteConfirm: translate('text.delete_this_message'),
    },
    blogs: {
        title: translate('text.manage_articles'),
        description: translate('text.admin_manager_creates_edits_publishes_and_archives_articles'),
        endpoint: '/blogs/admin/all',
        limit: 20,
        form: blogFormConfig,
        filters: [
            { name: 'search', label: translate('text.search'), placeholder: translate('text.title_or_content') },
            { name: 'status', label: translate('text.status'), type: 'select', options: blogStatusOptions },
            { name: 'category', label: translate('text.category'), placeholder: translate('text.instructions_for_use') },
            { name: 'tag', label: translate('text.tag'), placeholder: translate('text.bag') },
        ],
        columns: [
            { key: 'title', header: translate('text.title'), value: 'title' },
            { key: 'category', header: translate('text.category'), value: 'category' },
            { key: 'status', header: translate('text.status'), value: 'status', type: 'status' },
            { key: 'published_at', header: translate('text.publish'), value: 'published_at', type: 'date' },
            { key: 'view_count', header: translate('text.views'), value: 'view_count' },
            { key: 'updated_at', header: translate('text.update'), value: 'updated_at', type: 'date' },
        ],
        getDeleteEndpoint: (row) => `/blogs/${row.id || row._id}`,
        deleteConfirm: translate('text.archive_this_article'),
    },
    orders: {
        title: translate('text.order_management'),
        description: translate('text.admin_views_orders_payment_status_and_total_amount'),
        endpoint: '/orders/admin/orders',
        limit: 20,
        filters: [
            { name: 'status', label: translate('text.single_status'), type: 'select', options: orderStatusOptions },
            {
                name: 'payment_status',
                label: translate('text.checkout'),
                type: 'select',
                options: [
                    { value: '', label: translate('text.all_payments') },
                    { value: 'PENDING', label: translate('text.pending_0a7b38b7') },
                    { value: 'PAID', label: translate('text.paid_f3534db5') },
                    { value: 'FAILED', label: translate('text.failed_8d33f306') },
                    { value: 'REFUNDED', label: translate('text.refunded') },
                ],
            },
        ],
        columns: [
            { key: 'order_code', header: translate('text.item_code'), value: 'order_code' },
            { key: 'status', header: translate('text.status'), value: 'status', type: 'status' },
            { key: 'payment_status', header: translate('text.checkout'), value: 'payment_status', type: 'status' },
            { key: 'total_amount', header: translate('text.total_amount'), value: 'total_amount', type: 'money' },
            { key: 'total_items', header: translate('text.quantity'), value: 'total_items' },
            { key: 'created_at', header: translate('text.creation_date'), value: 'created_at', type: 'date' },
        ],
    },
    shipments: {
        title: translate('text.shipping_management'),
        description: translate('text.admin_tracks_shipments_and_delivery_status'),
        endpoint: '/shipments/admin',
        limit: 20,
        columns: [
            { key: 'tracking_code', header: translate('text.bill_of_lading_code'), value: 'tracking_code' },
            { key: 'order_id', header: translate('text.order'), value: 'order_id' },
            { key: 'carrier', header: translate('text.unit'), value: 'carrier' },
            { key: 'status', header: translate('text.status'), value: 'status', type: 'status' },
            { key: 'created_at', header: translate('text.creation_date'), value: 'created_at', type: 'date' },
        ],
        getDeleteEndpoint: (row) => `/shipments/admin/${row.id || row._id}`,
        deleteConfirm: translate('text.delete_this_shipment'),
    },
    payments: {
        title: translate('text.payment_management'),
        description: translate('text.admin_tracks_online_payment_and_authentication_status'),
        endpoint: '/payments/admin',
        limit: 20,
        filters: [
            { name: 'status', label: translate('text.status'), type: 'select', options: paymentStatusOptions },
            {
                name: 'provider',
                label: translate('text.provider'),
                type: 'select',
                options: [
                    { value: '', label: translate('text.all_providers') },
                    { value: 'vnpay', label: translate('text.vnpay') },
                    { value: 'payos', label: translate('text.payos') },
                ],
            },
        ],
        columns: [
            { key: 'id', header: translate('text.payment_b41a92be'), value: 'id' },
            { key: 'order_id', header: translate('text.order'), value: 'order_id' },
            { key: 'provider', header: translate('text.provider'), value: 'provider' },
            { key: 'amount', header: translate('text.amount'), value: 'amount', type: 'money' },
            { key: 'status', header: translate('text.status'), value: 'status', type: 'status' },
            { key: 'verification_status', header: translate('text.validate'), value: 'verification_status', type: 'status' },
            { key: 'created_at', header: translate('text.creation_date'), value: 'created_at', type: 'date' },
        ],
        getDeleteEndpoint: (row) => `/payments/admin/${row.id || row._id}`,
        deleteConfirm: translate('text.soft_delete_this_payment'),
    },
    discounts: {
        title: translate('text.manage_discount_code'),
        description: translate('text.admin_manages_discounts_usage_and_deadlines'),
        endpoint: '/discounts',
        limit: 20,
        filters: [
            { name: 'search', label: translate('text.find_code'), placeholder: translate('text.code_e8246e47') },
            {
                name: 'status',
                label: translate('text.status'),
                type: 'select',
                options: [
                    { value: '', label: translate('text.all_statuses') },
                    { value: 'ACTIVE', label: translate('text.active') },
                    { value: 'INACTIVE', label: translate('text.inactive') },
                    { value: 'EXPIRED', label: translate('text.expired_72c0bb5a') },
                ],
            },
        ],
        columns: [
            { key: 'code', header: translate('text.code'), value: 'code' },
            { key: 'name', header: translate('text.name'), value: 'name' },
            { key: 'type', header: translate('text.type'), value: 'type' },
            { key: 'value', header: translate('text.value'), value: discountValue },
            { key: 'status', header: translate('text.status'), value: 'status', type: 'status' },
            { key: 'usage', header: translate('text.used'), value: (row) => `${row.usage_count || 0}/${row.usage_limit || '-'}` },
        ],
        getDeleteEndpoint: (row) => `/discounts/${row.id || row._id}`,
        deleteConfirm: translate('text.delete_this_discount_code'),
    },
    users: {
        title: translate('text.user_management'),
        description: translate('text.admin_manages_accounts_roles_and_status'),
        endpoint: '/users',
        limit: 20,
        filters: [
            {
                name: 'search',
                label: translate('text.search'),
                placeholder: translate('text.phone_number_email_or_name'),
            },
            {
                name: 'status',
                label: translate('text.status'),
                type: 'select',
                options: [
                    { value: '', label: translate('text.all_statuses') },
                    { value: 'ACTIVE', label: translate('text.active') },
                    { value: 'INACTIVE', label: translate('text.inactive') },
                    { value: 'SUSPENDED', label: translate('text.suspended') },
                ],
            },
        ],
        columns: [
            {
                key: 'phone_number',
                header: translate('text.phone_number'),
                value: (row) => row.profile?.phone_number,
            },
            { key: 'name', header: translate('text.name'), value: (row) => row.profile?.full_name },
            { key: 'roles', header: translate('text.role'), value: 'roles' },
            { key: 'tier', header: translate('text.tier'), value: 'tier' },
            { key: 'status', header: translate('text.status'), value: 'status', type: 'status' },
            { key: 'created_at', header: translate('text.creation_date'), value: 'created_at', type: 'date' },
        ],
    },
    auditLogs: {
        title: translate('text.audit_logs'),
        description: translate('text.admin_views_system_operation_history'),
        endpoint: '/audit-logs',
        limit: 20,
        filters: [
            {
                name: 'domain',
                label: translate('text.domain'),
                type: 'select',
                options: [
                    { value: '', label: translate('text.all_domains') },
                    { value: 'USER', label: translate('text.user_6eb0c612') },
                    { value: 'AUTH', label: translate('text.auth') },
                    { value: 'PRODUCT', label: translate('text.product_964bd565') },
                    { value: 'CATEGORY', label: translate('text.category_762258cf') },
                    { value: 'ORDER', label: translate('text.order_683e61c8') },
                    { value: 'PAYMENT', label: translate('text.payment') },
                    { value: 'SHIPMENT', label: translate('text.shipment') },
                    { value: 'DISCOUNT', label: translate('text.discount_62775f06') },
                    { value: 'CART', label: translate('text.cart_7cd0c455') },
                    { value: 'EMAIL', label: translate('text.email') },
                ],
            },
            {
                name: 'level',
                label: translate('text.level'),
                type: 'select',
                options: [
                    { value: '', label: translate('text.all_levels') },
                    { value: 'INFO', label: translate('text.info') },
                    { value: 'WARN', label: translate('text.warn') },
                    { value: 'ERROR', label: translate('text.error') },
                ],
            },
        ],
        columns: [
            { key: 'created_at', header: translate('text.time'), value: (row) => formatDateTime(row.created_at || row.timestamp) },
            { key: 'domain', header: translate('text.domain'), value: 'domain' },
            { key: 'action', header: translate('text.action'), value: 'action' },
            { key: 'actor', header: translate('text.actor'), value: auditActor },
            { key: 'level', header: translate('text.level'), value: 'level', type: 'status' },
            { key: 'target', header: translate('text.target'), value: (row) => row.target_id || row.target?.id || row.order_id || row.payment_id },
        ],
    },
};
