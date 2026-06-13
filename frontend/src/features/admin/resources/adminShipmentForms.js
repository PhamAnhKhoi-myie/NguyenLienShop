import { translate } from '../../../shared/i18n/index';
import { z } from 'zod';

export const carrierOptions = [
    { value: '', label: translate('text.all_units') },
    { value: 'GHN', label: translate('text.ghn') },
    { value: 'GHTK', label: translate('text.ghtk') },
    { value: 'JT', label: 'J&T' },
    { value: 'GRAB', label: translate('text.grab') },
    { value: 'BEST', label: translate('text.best') },
    { value: 'OTHER', label: translate('text.other_957c024b') },
];

export const shipmentStatusOptions = [
    { value: '', label: translate('text.all_statuses') },
    { value: 'pending', label: translate('text.pending_e2258693') },
    { value: 'picked_up', label: translate('text.picked_up_cd46abb7') },
    { value: 'in_transit', label: translate('text.in_transit') },
    { value: 'at_destination', label: translate('text.at_destination') },
    { value: 'delivered', label: translate('text.delivered_f818910a') },
    { value: 'failed', label: translate('text.failed') },
    { value: 'cancelled', label: translate('text.cancelled') },
    { value: 'returned', label: translate('text.returned_1302aeee') },
];

const nextStatusByCurrent = {
    pending: ['picked_up'],
    picked_up: ['in_transit'],
    in_transit: ['at_destination'],
    at_destination: ['delivered'],
};

const failureReasonOptions = [
    { value: 'address_incorrect', label: translate('text.wrong_address') },
    { value: 'recipient_unavailable', label: translate('text.recipient_not_found') },
    { value: 'refused_delivery', label: translate('text.customer_refuses_to_receive') },
    { value: 'damaged_package', label: translate('text.damaged_item') },
    { value: 'lost', label: translate('text.lost') },
    { value: 'weather_delay', label: translate('text.delayed_due_to_weather') },
    { value: 'carrier_error', label: translate('text.shipping_unit_error') },
    { value: 'other', label: translate('text.other') },
];

const carrierValueOptions = carrierOptions.filter((option) => option.value);

const trackingCodeSchema = z
    .string()
    .trim()
    .min(5, translate('text.bill_of_lading_code_must_be_at_least_5_characters'))
    .max(100, translate('text.bill_of_lading_code_must_not_exceed_100_characters'))
    .regex(/^[A-Z0-9\-_]+$/i, translate('text.bill_of_lading_code_includes_only_letters_numbers_dashes_or_underlines'));

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
    title: translate('text.bill_of_lading_information'),
    schema: z
        .object({
            carrier: z.enum(['GHN', 'GHTK', 'JT', 'GRAB', 'BEST', 'OTHER']),
            tracking_code: trackingCodeSchema,
            admin_notes: z
                .string()
                .trim()
                .max(1000, translate('text.internal_notes_cannot_exceed_1000_characters')),
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
            label: translate('text.shipping_unit'),
            type: 'select',
            options: carrierValueOptions,
        },
        {
            name: 'tracking_code',
            label: translate('text.bill_of_lading_code'),
        },
        {
            name: 'admin_notes',
            label: translate('text.internal_notes'),
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
        title: translate('text.shipping_status_b865dfb7'),
        schema: z.object({
            status: z.enum(statusValues),
            notes: z.string().trim().max(500, translate('text.notes_must_not_exceed_500_characters')),
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
                label: translate('text.next_status'),
                type: 'select',
                options,
                emptyLabel: options.length ? undefined : translate('text.no_longer_valid_status'),
                disabled: options.length === 0,
            },
            {
                name: 'notes',
                label: translate('text.note'),
                type: 'textarea',
                rows: 4,
                className: 'md:col-span-2',
            },
        ],
    };
}

export const shipmentFailureFormConfig = {
    title: translate('text.delivery_error'),
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
            .min(1, translate('text.error_note_is_required'))
            .max(500, translate('text.error_note_must_not_exceed_500_characters')),
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
            label: translate('text.reason'),
            type: 'select',
            options: failureReasonOptions,
        },
        {
            name: 'failure_notes',
            label: translate('text.error_note'),
            type: 'textarea',
            rows: 5,
            className: 'md:col-span-2',
        },
    ],
};

export const shipmentCancelFormConfig = {
    title: translate('text.cancel_bill_of_lading_3d442fc6'),
    schema: z.object({
        reason: z
            .string()
            .trim()
            .min(5, translate('text.cancel_reason_needs_at_least_5_characters'))
            .max(500, translate('text.cancellation_reason_cannot_exceed_500_characters')),
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
            label: translate('text.cancellation_reason'),
            type: 'textarea',
            rows: 5,
            className: 'md:col-span-2',
        },
    ],
};
