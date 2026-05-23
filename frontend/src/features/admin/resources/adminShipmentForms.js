import { z } from 'zod';

export const carrierOptions = [
    { value: '', label: 'Tất cả đơn vị' },
    { value: 'GHN', label: 'GHN' },
    { value: 'GHTK', label: 'GHTK' },
    { value: 'JT', label: 'J&T' },
    { value: 'GRAB', label: 'GRAB' },
    { value: 'BEST', label: 'BEST' },
    { value: 'OTHER', label: 'OTHER' },
];

export const shipmentStatusOptions = [
    { value: '', label: 'Tất cả trạng thái' },
    { value: 'pending', label: 'pending' },
    { value: 'picked_up', label: 'picked_up' },
    { value: 'in_transit', label: 'in_transit' },
    { value: 'at_destination', label: 'at_destination' },
    { value: 'delivered', label: 'delivered' },
    { value: 'failed', label: 'failed' },
    { value: 'cancelled', label: 'cancelled' },
    { value: 'returned', label: 'returned' },
];

const nextStatusByCurrent = {
    pending: ['picked_up'],
    picked_up: ['in_transit'],
    in_transit: ['at_destination'],
    at_destination: ['delivered'],
};

const failureReasonOptions = [
    { value: 'address_incorrect', label: 'Địa chỉ sai' },
    { value: 'recipient_unavailable', label: 'Không gặp người nhận' },
    { value: 'refused_delivery', label: 'Khách từ chối nhận' },
    { value: 'damaged_package', label: 'Hàng bị hư hỏng' },
    { value: 'lost', label: 'Thất lạc' },
    { value: 'weather_delay', label: 'Trì hoãn do thời tiết' },
    { value: 'carrier_error', label: 'Lỗi đơn vị vận chuyển' },
    { value: 'other', label: 'Khác' },
];

const carrierValueOptions = carrierOptions.filter((option) => option.value);

const trackingCodeSchema = z
    .string()
    .trim()
    .min(5, 'Mã vận đơn cần ít nhất 5 ký tự')
    .max(100, 'Mã vận đơn không vượt quá 100 ký tự')
    .regex(/^[A-Z0-9\-_]+$/i, 'Mã vận đơn chỉ gồm chữ, số, gạch ngang hoặc gạch dưới');

function getNextStatusOptions(status) {
    return (nextStatusByCurrent[status] || []).map((value) => ({
        value,
        label: value,
    }));
}

export function hasNextShipmentStatus(status) {
    return getNextStatusOptions(status).length > 0;
}

export const shipmentInfoFormConfig = {
    title: 'thông tin vận đơn',
    schema: z
        .object({
            carrier: z.enum(['GHN', 'GHTK', 'JT', 'GRAB', 'BEST', 'OTHER']),
            tracking_code: trackingCodeSchema,
            admin_notes: z
                .string()
                .trim()
                .max(1000, 'Ghi chú nội bộ không vượt quá 1000 ký tự'),
        }),
    defaultValues: {
        carrier: 'GHN',
        tracking_code: '',
        admin_notes: '',
    },
    toFormValues: (shipment = {}) => ({
        carrier: shipment.carrier || 'GHN',
        tracking_code: shipment.tracking_code || '',
        admin_notes: shipment.admin_notes || '',
    }),
    toPayload: (values) => ({
        carrier: values.carrier,
        tracking_code: values.tracking_code.trim().toUpperCase(),
        admin_notes: values.admin_notes.trim() || '',
    }),
    fields: [
        {
            name: 'carrier',
            label: 'Đơn vị vận chuyển',
            type: 'select',
            options: carrierValueOptions,
        },
        {
            name: 'tracking_code',
            label: 'Mã vận đơn',
        },
        {
            name: 'admin_notes',
            label: 'Ghi chú nội bộ',
            type: 'textarea',
            rows: 5,
            className: 'md:col-span-2',
        },
    ],
};

export function createShipmentStatusFormConfig(shipment = {}) {
    const options = getNextStatusOptions(shipment.status);
    const statusValues = options.length
        ? options.map((option) => option.value)
        : ['pending'];

    return {
        title: 'trạng thái vận chuyển',
        schema: z.object({
            status: z.enum(statusValues),
            notes: z.string().trim().max(500, 'Ghi chú không vượt quá 500 ký tự'),
        }),
        defaultValues: {
            status: options[0]?.value || '',
            notes: '',
        },
        toFormValues: () => ({
            status: options[0]?.value || '',
            notes: '',
        }),
        toPayload: (values) => ({
            status: values.status,
            notes: values.notes.trim() || undefined,
        }),
        fields: [
            {
                name: 'status',
                label: 'Trạng thái tiếp theo',
                type: 'select',
                options,
                emptyLabel: options.length ? undefined : 'Không còn trạng thái hợp lệ',
                disabled: options.length === 0,
            },
            {
                name: 'notes',
                label: 'Ghi chú',
                type: 'textarea',
                rows: 4,
                className: 'md:col-span-2',
            },
        ],
    };
}

export const shipmentFailureFormConfig = {
    title: 'lỗi giao hàng',
    schema: z.object({
        failure_reason: z.enum([
            'address_incorrect',
            'recipient_unavailable',
            'refused_delivery',
            'damaged_package',
            'lost',
            'weather_delay',
            'carrier_error',
            'other',
        ]),
        failure_notes: z
            .string()
            .trim()
            .min(1, 'Ghi chú lỗi là bắt buộc')
            .max(500, 'Ghi chú lỗi không vượt quá 500 ký tự'),
    }),
    defaultValues: {
        failure_reason: 'carrier_error',
        failure_notes: '',
    },
    toFormValues: () => ({
        failure_reason: 'carrier_error',
        failure_notes: '',
    }),
    toPayload: (values) => ({
        failure_reason: values.failure_reason,
        failure_notes: values.failure_notes.trim(),
    }),
    fields: [
        {
            name: 'failure_reason',
            label: 'Lý do',
            type: 'select',
            options: failureReasonOptions,
        },
        {
            name: 'failure_notes',
            label: 'Ghi chú lỗi',
            type: 'textarea',
            rows: 5,
            className: 'md:col-span-2',
        },
    ],
};

export const shipmentCancelFormConfig = {
    title: 'hủy vận đơn',
    schema: z.object({
        reason: z
            .string()
            .trim()
            .min(5, 'Lý do hủy cần ít nhất 5 ký tự')
            .max(500, 'Lý do hủy không vượt quá 500 ký tự'),
    }),
    defaultValues: {
        reason: '',
    },
    toFormValues: () => ({
        reason: '',
    }),
    toPayload: (values) => ({
        reason: values.reason.trim(),
    }),
    fields: [
        {
            name: 'reason',
            label: 'Lý do hủy',
            type: 'textarea',
            rows: 5,
            className: 'md:col-span-2',
        },
    ],
};
