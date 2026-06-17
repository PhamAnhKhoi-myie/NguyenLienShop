import { translate } from '../../../shared/i18n/index';
import { z } from 'zod';

export const orderStatusOptions = [
    { value: '', label: translate('text.all_statuses') },
    { value: 'PENDING', label: translate('text.pending_0a7b38b7') },
    { value: 'PAID', label: translate('text.paid_f3534db5') },
    { value: 'PROCESSING', label: translate('text.processing') },
    { value: 'SHIPPED', label: translate('text.shipped') },
    { value: 'DELIVERED', label: translate('text.delivered_1bd2e76f') },
    { value: 'FAILED', label: translate('text.failed_8d33f306') },
    { value: 'CANCELED', label: translate('text.canceled_30b6a2af') },
];

export const paymentStatusOptions = [
    { value: '', label: translate('text.all_payments') },
    { value: 'PENDING', label: translate('text.pending_0a7b38b7') },
    { value: 'PAID', label: translate('text.paid_f3534db5') },
    { value: 'FAILED', label: translate('text.failed_8d33f306') },
    { value: 'REFUND_PENDING', label: translate('text.refund_pending') },
    { value: 'REFUNDED', label: translate('text.refunded') },
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
    title: translate('text.order_status'),
    schema: z.object({
        status: z.enum(statusValues),
        note: z.string().trim().max(500, translate('text.notes_must_not_exceed_500_characters')),
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
            label: translate('text.status'),
            type: 'select',
            options: ({ initialData }) => getManualStatusOptions(initialData),
        },
        {
            name: 'note',
            label: translate('text.note'),
            type: 'textarea',
            rows: 4,
            className: 'md:col-span-2',
        },
    ],
};

export const orderNotesFormConfig = {
    title: translate('text.internal_note'),
    schema: z.object({
        admin_notes: z
            .string()
            .trim()
            .max(1000, translate('text.internal_notes_cannot_exceed_1000_characters')),
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
            label: translate('text.internal_notes'),
            type: 'textarea',
            rows: 6,
            className: 'md:col-span-2',
        },
    ],
};

export const manualRefundFormConfig = {
    title: translate('text.confirm_refund_completed'),
    schema: z.object({
        refund_reference: z
            .string()
            .trim()
            .max(100, translate('text.refund_reference_cannot_exceed_100_characters')),
        refund_note: z
            .string()
            .trim()
            .max(500, translate('text.refund_note_cannot_exceed_500_characters')),
    }),
    defaultValues: {
        refund_reference: '',
        refund_note: '',
    },
    toFormValues: (order = {}) => ({
        refund_reference: order.payment?.refund_reference || '',
        refund_note: order.payment?.refund_note || '',
    }),
    toPayload: (values) => ({
        refund_reference: values.refund_reference.trim() || undefined,
        refund_note: values.refund_note.trim() || undefined,
    }),
    fields: [
        {
            name: 'refund_reference',
            label: translate('text.refund_reference'),
            placeholder: translate('text.provider_refund_transaction_code'),
        },
        {
            name: 'refund_note',
            label: translate('text.refund_note'),
            type: 'textarea',
            rows: 4,
            className: 'md:col-span-2',
        },
    ],
};

export const shipmentFormConfig = {
    title: translate('text.bill_of_lading_f4a566af'),
    schema: z.object({
        carrier: z.string().trim().min(1, translate('text.shipping_unit_is_required')).max(50),
        tracking_code: z.string().trim().min(1, translate('text.waybill_code_is_required')).max(100),
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
        { name: 'carrier', label: translate('text.shipping_unit'), placeholder: translate('text.ghn_viettel_grab') },
        { name: 'tracking_code', label: translate('text.bill_of_lading_code') },
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
        label: translate('text.value_also_value_value', { value0: item.product_name, value1: Number(item.quantity_ordered || 0) - Number(item.quantity_fulfilled || 0), value2: item.unit_label || translate('text.unit') }),
    }));
    const defaultItemId = itemOptions[0]?.value || '';

    return {
        title: translate('text.fulfill_product_05c12e9e'),
        schema: z
            .object({
                item_id: z.string().min(1, translate('text.please_select_product')),
                quantity_fulfilled: z.coerce
                    .number()
                    .int(translate('text.quantity_must_be_an_integer'))
                    .positive(translate('text.quantity_must_be_greater_than_0'))
                    .max(1000000, translate('text.quantity_too_large')),
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
                        message: translate('text.maximum_remaining_quantity_is_value', { value0: remaining }),
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
                label: translate('text.product'),
                type: 'select',
                options: itemOptions,
                emptyLabel: itemOptions.length ? undefined : translate('text.no_more_products_to_fulfill'),
                disabled: itemOptions.length === 0,
            },
            {
                name: 'quantity_fulfilled',
                label: translate('text.number_of_additional_fulfillment_packages'),
                type: 'number',
            },
        ],
    };
}
