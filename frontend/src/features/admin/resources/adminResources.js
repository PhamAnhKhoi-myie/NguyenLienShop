import { formatDateTime, formatMoney } from '../utils/adminFormat';

const activeStatusOptions = [
    { value: '', label: 'Tất cả trạng thái' },
    { value: 'ACTIVE', label: 'ACTIVE' },
    { value: 'INACTIVE', label: 'INACTIVE' },
];

const orderStatusOptions = [
    { value: '', label: 'Tất cả trạng thái' },
    { value: 'PENDING', label: 'PENDING' },
    { value: 'PAID', label: 'PAID' },
    { value: 'PROCESSING', label: 'PROCESSING' },
    { value: 'SHIPPED', label: 'SHIPPED' },
    { value: 'DELIVERED', label: 'DELIVERED' },
    { value: 'FAILED', label: 'FAILED' },
    { value: 'CANCELED', label: 'CANCELED' },
];

const paymentStatusOptions = [
    { value: '', label: 'Tất cả trạng thái' },
    { value: 'pending', label: 'pending' },
    { value: 'paid', label: 'paid' },
    { value: 'failed', label: 'failed' },
];

function imageCount(row) {
    return row.images?.length || row.image_urls?.length || 0;
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
        title: 'Quản lý sản phẩm',
        description: 'ADMIN/MANAGER quản lý sản phẩm. Form tạo/sửa chi tiết sẽ nối tiếp trên nền bảng này.',
        endpoint: '/products',
        limit: 20,
        filters: [
            { name: 'search', label: 'Tìm kiếm', placeholder: 'Tên sản phẩm...' },
            { name: 'status', label: 'Trạng thái', type: 'select', options: activeStatusOptions },
        ],
        columns: [
            { key: 'name', header: 'Tên sản phẩm', value: 'name' },
            { key: 'category', header: 'Danh mục', value: (row) => row.category?.name || row.category_name },
            { key: 'status', header: 'Trạng thái', value: 'status', type: 'status' },
            { key: 'price', header: 'Khoảng giá', value: (row) => row.price_range || row.priceRange },
            { key: 'images', header: 'Ảnh', value: imageCount },
            { key: 'created_at', header: 'Ngày tạo', value: 'created_at', type: 'date' },
        ],
        getDeleteEndpoint: (row) => `/products/${row.id || row._id}`,
        deleteConfirm: 'Xóa mềm sản phẩm này?',
    },
    categories: {
        title: 'Quản lý danh mục',
        description: 'ADMIN/MANAGER quản lý cây danh mục sản phẩm.',
        endpoint: '/categories/all',
        limit: 100,
        filters: [
            { name: 'status', label: 'Trạng thái', type: 'select', options: activeStatusOptions },
        ],
        columns: [
            { key: 'name', header: 'Tên danh mục', value: 'name' },
            { key: 'slug', header: 'Slug', value: 'slug' },
            { key: 'parent', header: 'Danh mục cha', value: (row) => row.parent?.name || row.parent_name },
            { key: 'status', header: 'Trạng thái', value: 'status', type: 'status' },
            { key: 'display_order', header: 'Thứ tự', value: 'display_order' },
        ],
        getDeleteEndpoint: (row) => `/categories/${row.id || row._id}`,
        deleteConfirm: 'Xóa mềm danh mục này?',
    },
    banners: {
        title: 'Quản lý banner',
        description: 'ADMIN/MANAGER quản lý banner hiển thị theo vị trí.',
        endpoint: '/banners',
        limit: 50,
        columns: [
            { key: 'title', header: 'Tiêu đề', value: 'title' },
            { key: 'location', header: 'Vị trí', value: 'location' },
            { key: 'is_active', header: 'Hiển thị', value: 'is_active', type: 'status' },
            { key: 'sort_order', header: 'Thứ tự', value: 'sort_order' },
            { key: 'created_at', header: 'Ngày tạo', value: 'created_at', type: 'date' },
        ],
        getDeleteEndpoint: (row) => `/banners/${row.id || row._id}`,
        deleteConfirm: 'Xóa banner này?',
    },
    announcements: {
        title: 'Quản lý thông báo shop',
        description: 'ADMIN/MANAGER quản lý announcement hiển thị cho khách.',
        endpoint: '/announcements/admin/all',
        limit: 50,
        columns: [
            { key: 'title', header: 'Tiêu đề', value: 'title' },
            { key: 'type', header: 'Loại', value: 'type' },
            { key: 'priority', header: 'Ưu tiên', value: 'priority', type: 'status' },
            { key: 'is_active', header: 'Đang bật', value: 'is_active', type: 'status' },
            { key: 'start_at', header: 'Bắt đầu', value: 'start_at', type: 'date' },
            { key: 'end_at', header: 'Kết thúc', value: 'end_at', type: 'date' },
        ],
        getDeleteEndpoint: (row) => `/announcements/${row.id || row._id}`,
        deleteConfirm: 'Xóa thông báo này?',
    },
    orders: {
        title: 'Quản lý đơn hàng',
        description: 'ADMIN xem đơn hàng, trạng thái thanh toán và tổng tiền.',
        endpoint: '/orders/admin/orders',
        limit: 20,
        filters: [
            { name: 'status', label: 'Trạng thái đơn', type: 'select', options: orderStatusOptions },
            {
                name: 'payment_status',
                label: 'Thanh toán',
                type: 'select',
                options: [
                    { value: '', label: 'Tất cả thanh toán' },
                    { value: 'PENDING', label: 'PENDING' },
                    { value: 'PAID', label: 'PAID' },
                    { value: 'FAILED', label: 'FAILED' },
                    { value: 'REFUNDED', label: 'REFUNDED' },
                ],
            },
        ],
        columns: [
            { key: 'order_code', header: 'Mã đơn', value: 'order_code' },
            { key: 'status', header: 'Trạng thái', value: 'status', type: 'status' },
            { key: 'payment_status', header: 'Thanh toán', value: 'payment_status', type: 'status' },
            { key: 'total_amount', header: 'Tổng tiền', value: 'total_amount', type: 'money' },
            { key: 'total_items', header: 'Số lượng', value: 'total_items' },
            { key: 'created_at', header: 'Ngày tạo', value: 'created_at', type: 'date' },
        ],
    },
    shipments: {
        title: 'Quản lý vận chuyển',
        description: 'ADMIN theo dõi shipment và trạng thái giao hàng.',
        endpoint: '/shipments/admin',
        limit: 20,
        columns: [
            { key: 'tracking_code', header: 'Mã vận đơn', value: 'tracking_code' },
            { key: 'order_id', header: 'Order', value: 'order_id' },
            { key: 'carrier', header: 'Đơn vị', value: 'carrier' },
            { key: 'status', header: 'Trạng thái', value: 'status', type: 'status' },
            { key: 'created_at', header: 'Ngày tạo', value: 'created_at', type: 'date' },
        ],
        getDeleteEndpoint: (row) => `/shipments/admin/${row.id || row._id}`,
        deleteConfirm: 'Xóa shipment này?',
    },
    payments: {
        title: 'Quản lý thanh toán',
        description: 'ADMIN theo dõi payment VNPAY và trạng thái xác thực.',
        endpoint: '/payments/admin',
        limit: 20,
        filters: [
            { name: 'status', label: 'Trạng thái', type: 'select', options: paymentStatusOptions },
            {
                name: 'provider',
                label: 'Provider',
                type: 'select',
                options: [
                    { value: '', label: 'Tất cả provider' },
                    { value: 'vnpay', label: 'vnpay' },
                ],
            },
        ],
        columns: [
            { key: 'id', header: 'Payment', value: 'id' },
            { key: 'order_id', header: 'Order', value: 'order_id' },
            { key: 'provider', header: 'Provider', value: 'provider' },
            { key: 'amount', header: 'Số tiền', value: 'amount', type: 'money' },
            { key: 'status', header: 'Trạng thái', value: 'status', type: 'status' },
            { key: 'verification_status', header: 'Xác thực', value: 'verification_status', type: 'status' },
            { key: 'created_at', header: 'Ngày tạo', value: 'created_at', type: 'date' },
        ],
        getDeleteEndpoint: (row) => `/payments/admin/${row.id || row._id}`,
        deleteConfirm: 'Xóa mềm payment này?',
    },
    discounts: {
        title: 'Quản lý mã giảm giá',
        description: 'ADMIN quản lý discount, usage và thời hạn.',
        endpoint: '/discounts',
        limit: 20,
        filters: [
            { name: 'search', label: 'Tìm mã', placeholder: 'CODE...' },
            {
                name: 'status',
                label: 'Trạng thái',
                type: 'select',
                options: [
                    { value: '', label: 'Tất cả trạng thái' },
                    { value: 'ACTIVE', label: 'ACTIVE' },
                    { value: 'INACTIVE', label: 'INACTIVE' },
                    { value: 'EXPIRED', label: 'EXPIRED' },
                ],
            },
        ],
        columns: [
            { key: 'code', header: 'Mã', value: 'code' },
            { key: 'name', header: 'Tên', value: 'name' },
            { key: 'type', header: 'Loại', value: 'type' },
            { key: 'value', header: 'Giá trị', value: discountValue },
            { key: 'status', header: 'Trạng thái', value: 'status', type: 'status' },
            { key: 'usage', header: 'Đã dùng', value: (row) => `${row.usage_count || 0}/${row.usage_limit || '-'}` },
        ],
        getDeleteEndpoint: (row) => `/discounts/${row.id || row._id}`,
        deleteConfirm: 'Xóa mã giảm giá này?',
    },
    users: {
        title: 'Quản lý người dùng',
        description: 'ADMIN quản lý tài khoản, vai trò và trạng thái.',
        endpoint: '/users',
        limit: 20,
        filters: [
            { name: 'search', label: 'Tìm kiếm', placeholder: 'Email hoặc tên...' },
            {
                name: 'status',
                label: 'Trạng thái',
                type: 'select',
                options: [
                    { value: '', label: 'Tất cả trạng thái' },
                    { value: 'ACTIVE', label: 'ACTIVE' },
                    { value: 'INACTIVE', label: 'INACTIVE' },
                    { value: 'SUSPENDED', label: 'SUSPENDED' },
                ],
            },
        ],
        columns: [
            { key: 'email', header: 'Email', value: 'email' },
            { key: 'name', header: 'Tên', value: (row) => row.profile?.full_name },
            { key: 'roles', header: 'Vai trò', value: 'roles' },
            { key: 'tier', header: 'Tier', value: 'tier' },
            { key: 'status', header: 'Trạng thái', value: 'status', type: 'status' },
            { key: 'created_at', header: 'Ngày tạo', value: 'created_at', type: 'date' },
        ],
    },
    auditLogs: {
        title: 'Audit logs',
        description: 'ADMIN xem lịch sử thao tác hệ thống.',
        endpoint: '/audit-logs',
        limit: 20,
        filters: [
            {
                name: 'domain',
                label: 'Domain',
                type: 'select',
                options: [
                    { value: '', label: 'Tất cả domain' },
                    { value: 'USER', label: 'USER' },
                    { value: 'AUTH', label: 'AUTH' },
                    { value: 'PRODUCT', label: 'PRODUCT' },
                    { value: 'CATEGORY', label: 'CATEGORY' },
                    { value: 'ORDER', label: 'ORDER' },
                    { value: 'PAYMENT', label: 'PAYMENT' },
                    { value: 'SHIPMENT', label: 'SHIPMENT' },
                    { value: 'DISCOUNT', label: 'DISCOUNT' },
                    { value: 'CART', label: 'CART' },
                    { value: 'EMAIL', label: 'EMAIL' },
                ],
            },
            {
                name: 'level',
                label: 'Level',
                type: 'select',
                options: [
                    { value: '', label: 'Tất cả level' },
                    { value: 'INFO', label: 'INFO' },
                    { value: 'WARN', label: 'WARN' },
                    { value: 'ERROR', label: 'ERROR' },
                ],
            },
        ],
        columns: [
            { key: 'created_at', header: 'Thời gian', value: (row) => formatDateTime(row.created_at || row.timestamp) },
            { key: 'domain', header: 'Domain', value: 'domain' },
            { key: 'action', header: 'Action', value: 'action' },
            { key: 'actor', header: 'Actor', value: auditActor },
            { key: 'level', header: 'Level', value: 'level', type: 'status' },
            { key: 'target', header: 'Target', value: (row) => row.target_id || row.target?.id || row.order_id || row.payment_id },
        ],
    },
};
