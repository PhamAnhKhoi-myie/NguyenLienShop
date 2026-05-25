import { z } from 'zod';

export const orderStatusOptions = [
    { value: '', label: 'Tất cả trạng thái' },
    { value: 'PENDING', label: 'PENDING' },
    { value: 'PAID', label: 'PAID' },
    { value: 'PROCESSING', label: 'PROCESSING' },
    { value: 'SHIPPED', label: 'SHIPPED' },
    { value: 'DELIVERED', label: 'DELIVERED' },
    { value: 'FAILED', label: 'FAILED' },
    { value: 'CANCELED', label: 'CANCELED' },
];

export const paymentStatusOptions = [
    { value: '', label: 'Tất cả thanh toán' },
    { value: 'PENDING', label: 'PENDING' },
    { value: 'PAID', label: 'PAID' },
    { value: 'FAILED', label: 'FAILED' },
    { value: 'REFUNDED', label: 'REFUNDED' },
];

const statusValues = [
    'PENDING',
    'PAID',
    'PROCESSING',
    'SHIPPED',
    'DELIVERED',
    'FAILED',
    'CANCELED',
];

function getManualStatusValues(order = {}) {
    const currentStatus = order.status || 'PENDING';
    const paymentMethod = order.payment?.method;
    const paymentStatus = order.payment?.status;

    if (currentStatus === 'PENDING') {
        const nextStatuses = ['CANCELED'];

        if (paymentMethod === 'COD') {
            nextStatuses.push('PROCESSING');
        }

        if (paymentStatus === 'PAID') {
            nextStatuses.push('PAID');
        }

        return [currentStatus, ...nextStatuses];
    }

    if (currentStatus === 'PAID') {
        return [currentStatus, 'PROCESSING', 'CANCELED'];
    }

    if (currentStatus === 'PROCESSING') {
        return [currentStatus, 'CANCELED'];
    }

    return [currentStatus];
}

function getManualStatusOptions(order = {}) {
    const values = getManualStatusValues(order);

    return orderStatusOptions.filter((option) => values.includes(option.value));
}

export const orderStatusFormConfig = {
    title: 'trạng thái đơn hàng',
    schema: z.object({
        status: z.enum(statusValues),
        note: z.string().trim().max(500, 'Ghi chú không vượt quá 500 ký tự'),
    }),
    defaultValues: {
        status: 'PENDING',
        note: '',
    },
    toFormValues: (order = {}) => ({
        status: order.status || 'PENDING',
        note: '',
    }),
    toPayload: (values) => ({
        status: values.status,
        note: values.note.trim() || undefined,
    }),
    fields: [
        {
            name: 'status',
            label: 'Trạng thái',
            type: 'select',
            options: ({ initialData }) => getManualStatusOptions(initialData),
        },
        {
            name: 'note',
            label: 'Ghi chú',
            type: 'textarea',
            rows: 4,
            className: 'md:col-span-2',
        },
    ],
};

export const orderNotesFormConfig = {
    title: 'ghi chú nội bộ',
    schema: z.object({
        admin_notes: z
            .string()
            .trim()
            .max(1000, 'Ghi chú nội bộ không vượt quá 1000 ký tự'),
    }),
    defaultValues: {
        admin_notes: '',
    },
    toFormValues: (order = {}) => ({
        admin_notes: order.admin_notes || '',
    }),
    toPayload: (values) => ({
        admin_notes: values.admin_notes.trim() || '',
    }),
    fields: [
        {
            name: 'admin_notes',
            label: 'Ghi chú nội bộ',
            type: 'textarea',
            rows: 6,
            className: 'md:col-span-2',
        },
    ],
};

export const shipmentFormConfig = {
    title: 'vận đơn',
    schema: z.object({
        carrier: z.string().trim().min(1, 'Đơn vị vận chuyển là bắt buộc').max(50),
        tracking_code: z.string().trim().min(1, 'Mã vận đơn là bắt buộc').max(100),
    }),
    defaultValues: {
        carrier: '',
        tracking_code: '',
    },
    toFormValues: (order = {}) => ({
        carrier: order.shipment?.carrier || '',
        tracking_code: order.shipment?.tracking_code || '',
    }),
    toPayload: (values) => ({
        carrier: values.carrier.trim(),
        tracking_code: values.tracking_code.trim(),
    }),
    fields: [
        { name: 'carrier', label: 'Đơn vị vận chuyển', placeholder: 'GHN, VIETTEL, GRAB...' },
        { name: 'tracking_code', label: 'Mã vận đơn' },
    ],
};

function getPendingItems(order = {}) {
    return (order.items || []).filter(
        (item) =>
            Number(item.quantity_fulfilled || 0) <
            Number(item.quantity_ordered || 0)
    );
}

export function createFulfillmentFormConfig(order = {}) {
    const pendingItems = getPendingItems(order);
    const itemOptions = pendingItems.map((item) => ({
        value: item.id,
        label: `${item.product_name} - còn ${Number(item.quantity_ordered || 0) - Number(item.quantity_fulfilled || 0)} ${item.unit_label || 'đơn vị'}`,
    }));
    const defaultItemId = itemOptions[0]?.value || '';

    return {
        title: 'fulfill sản phẩm',
        schema: z
            .object({
                item_id: z.string().min(1, 'Vui lòng chọn sản phẩm'),
                quantity_fulfilled: z.coerce
                    .number()
                    .int('Số lượng phải là số nguyên')
                    .positive('Số lượng phải lớn hơn 0')
                    .max(1000000, 'Số lượng quá lớn'),
            })
            .superRefine((values, ctx) => {
                const item = pendingItems.find(
                    (pendingItem) => pendingItem.id === values.item_id
                );

                if (!item) {
                    return;
                }

                const remaining =
                    Number(item.quantity_ordered || 0) -
                    Number(item.quantity_fulfilled || 0);

                if (values.quantity_fulfilled > remaining) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: ['quantity_fulfilled'],
                        message: `Số lượng tối đa còn lại là ${remaining}`,
                    });
                }
            }),
        defaultValues: {
            item_id: defaultItemId,
            quantity_fulfilled: 1,
        },
        toFormValues: () => ({
            item_id: defaultItemId,
            quantity_fulfilled: 1,
        }),
        toPayload: (values) => ({
            item_id: values.item_id,
            quantity_fulfilled: Number(values.quantity_fulfilled),
        }),
        fields: [
            {
                name: 'item_id',
                label: 'Sản phẩm',
                type: 'select',
                options: itemOptions,
                emptyLabel: itemOptions.length ? undefined : 'Không còn sản phẩm cần fulfill',
                disabled: itemOptions.length === 0,
            },
            {
                name: 'quantity_fulfilled',
                label: 'Số gói fulfill thêm',
                type: 'number',
            },
        ],
    };
}
