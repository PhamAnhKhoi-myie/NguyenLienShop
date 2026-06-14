import { translate } from '../../../shared/i18n/index';
import { z } from 'zod';

const positiveInt = (label) =>
    z.coerce
        .number()
        .int(translate('text.value_must_be_an_integer', { value0: label }))
        .positive(translate('text.value_must_be_greater_than_0', { value0: label }));

const nonNegativeInt = (label) =>
    z.coerce
        .number()
        .int(translate('text.value_must_be_an_integer', { value0: label }))
        .min(0, translate('text.value_cannot_be_negative_4e5c385c', { value0: label }));

function splitTierLine(line) {
    return line.split('|').map((part) => part.trim());
}

export function parsePriceTiers(value) {
    return String(value || '')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            const [minQty, maxQty, unitPrice] = splitTierLine(line);

            return {
                min_qty: Number(minQty),
                max_qty: maxQty ? Number(maxQty) : null,
                unit_price: Number(unitPrice),
            };
        });
}

function priceTiersToText(priceTiers = []) {
    if (!Array.isArray(priceTiers)) {
        return '';
    }

    return priceTiers
        .map((tier) =>
            [
                tier.min_qty,
                tier.max_qty === null || tier.max_qty === undefined
                    ? ''
                    : tier.max_qty,
                tier.original_unit_price ?? tier.unit_price,
            ].join('|')
        )
        .join('\n');
}

function toDateTimeLocal(value) {
    if (!value) {
        return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '';
    }

    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toIsoDateOrNull(value) {
    if (!value) {
        return null;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function validatePriceTierText(value, ctx) {
    const lines = String(value || '')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    if (lines.length === 0) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: translate('text.please_enter_at_least_one_price_tier'),
        });
        return;
    }

    const tiers = parsePriceTiers(value);

    tiers.forEach((tier, index) => {
        if (!Number.isInteger(tier.min_qty) || tier.min_qty <= 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: translate('text.line_value_min_qty_must_be_a_positive_integer', { value0: index + 1 }),
            });
        }

        if (
            tier.max_qty !== null &&
            (!Number.isInteger(tier.max_qty) || tier.max_qty <= 0)
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: translate('text.line_value_max_qty_must_be_a_positive_integer_or_blank', { value0: index + 1 }),
            });
        }

        if (
            !Number.isInteger(tier.unit_price) ||
            tier.unit_price <= 0
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: translate('text.line_value_unit_price_must_be_greater_than_0', { value0: index + 1 }),
            });
        }
    });

    const lastTier = tiers[tiers.length - 1];
    if (lastTier?.max_qty !== null) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: translate('text.the_last_price_tier_must_leave_max_qty_empty_for_unlimited'),
        });
    }

    for (let index = 1; index < tiers.length; index += 1) {
        const previous = tiers[index - 1];
        const current = tiers[index];

        if (current.min_qty <= previous.min_qty) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: translate('text.price_tiers_must_increase_according_to_min_qty'),
            });
        }

        if (previous.max_qty !== null && previous.max_qty >= current.min_qty) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: translate('text.price_tiers_cannot_overlap_the'),
            });
        }
    }
}

const variantFormSchema = z.object({
    size: z.string().trim().min(1, translate('text.please_enter_size')).max(50),
    fabric_type: z.string().trim().min(1, translate('text.please_enter_material')).max(100),
    available_stock: nonNegativeInt(translate('text.inventory')),
    status: z.enum(['ACTIVE', 'INACTIVE']),
});

const variantUnitFormSchema = z
    .object({
        unit_type: z.enum(['UNIT', 'PACK', 'BOX', 'CARTON']),
        display_name: z
            .string()
            .trim()
            .min(1, translate('text.please_enter_the_unit_name'))
            .max(100),
        pack_size: positiveInt(translate('text.specification')),
        price_tiers_text: z.string().superRefine(validatePriceTierText),
        min_order_qty: positiveInt(translate('text.minimum_number_of_packages')),
        max_order_qty: z.string().trim(),
        qty_step: positiveInt(translate('text.quantity_jump')),
        is_default: z.enum(['true', 'false']),
        currency: z.enum(['VND', 'USD', 'EUR']),
        promotion_enabled: z.enum(['true', 'false']),
        promotion_type: z.enum(['FIXED', 'PERCENT']),
        promotion_value: nonNegativeInt(translate('text.discount_value')),
        promotion_starts_at: z.string(),
        promotion_ends_at: z.string(),
        promotion_allow_voucher: z.enum(['true', 'false']),
    })
    .superRefine((values, ctx) => {
        if (values.max_order_qty) {
            const maxOrderQty = Number(values.max_order_qty);
            if (!Number.isInteger(maxOrderQty) || maxOrderQty <= 0) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['max_order_qty'],
                    message: translate('text.maximum_number_of_packets_must_be_a_positive_integer_or_blank'),
                });
            } else if (maxOrderQty < values.min_order_qty) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['max_order_qty'],
                    message: translate('text.maximum_number_of_packages_must_be_greater_than_or_equal_to_minimum'),
                });
            }
        }

        if (values.promotion_enabled === 'true') {
            if (values.promotion_value <= 0) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['promotion_value'],
                    message: translate('text.discount_value_must_be_greater_than_zero'),
                });
            }

            if (
                values.promotion_type === 'PERCENT' &&
                values.promotion_value >= 100
            ) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['promotion_value'],
                    message: translate('text.discount_percent_must_be_less_than_100'),
                });
            }

            if (values.promotion_type === 'FIXED') {
                const tiers = parsePriceTiers(values.price_tiers_text);
                if (
                    tiers.some(
                        (tier) =>
                            values.promotion_value >= tier.unit_price
                    )
                ) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: ['promotion_value'],
                        message: translate('text.fixed_discount_must_be_less_than_all_prices'),
                    });
                }
            }
        }

        if (
            values.promotion_starts_at &&
            values.promotion_ends_at &&
            new Date(values.promotion_ends_at) <=
                new Date(values.promotion_starts_at)
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['promotion_ends_at'],
                message: translate('text.promotion_end_must_be_after_start'),
            });
        }
    });

export const variantFormConfig = {
    title: translate('text.variant'),
    schema: variantFormSchema,
    defaultValues: {
        size: '',
        fabric_type: '',
        available_stock: 0,
        status: 'ACTIVE',
    },
    toFormValues: (variant = {}) => ({
        size: variant.size || '',
        fabric_type: variant.fabric_type || '',
        available_stock: variant.stock?.available ?? variant.available_stock ?? 0,
        status: variant.status || 'ACTIVE',
    }),
    toPayload: (values, { mode }) => {
        if (mode === 'edit') {
            return {
                status: values.status,
            };
        }

        return {
            size: values.size.trim(),
            fabric_type: values.fabric_type.trim(),
            stock: {
                available: Number(values.available_stock || 0),
            },
            status: values.status,
        };
    },
    fields: [
        {
            name: 'size',
            label: translate('text.size'),
            placeholder: translate('text.16x16_cm'),
            readOnly: ({ mode }) => mode === 'edit',
            helperText: ({ mode }) =>
                mode === 'edit' ? translate('text.be_currently_does_not_allow_variant_sizes_to_be_edited') : '',
        },
        {
            name: 'fabric_type',
            label: translate('text.material'),
            placeholder: translate('text.white_non_woven_fabric'),
            readOnly: ({ mode }) => mode === 'edit',
            helperText: ({ mode }) =>
                mode === 'edit' ? translate('text.be_currently_does_not_allow_variant_materials_to_be_edited') : '',
        },
        {
            name: 'available_stock',
            label: translate('text.initial_inventory'),
            type: 'number',
            readOnly: ({ mode }) => mode === 'edit',
            helperText: ({ mode }) =>
                mode === 'edit' ? translate('text.be_currently_does_not_allow_inventory_editing_via_the_variant_update_end') : '',
        },
        {
            name: 'status',
            label: translate('text.status'),
            type: 'select',
            options: [
                { value: 'ACTIVE', label: translate('text.active') },
                { value: 'INACTIVE', label: translate('text.inactive') },
            ],
        },
    ],
};

export const variantUnitFormConfig = {
    title: translate('text.sales_unit_d4b7c050'),
    schema: variantUnitFormSchema,
    defaultValues: {
        unit_type: 'PACK',
        display_name: '',
        pack_size: 1,
        price_tiers_text: '',
        min_order_qty: 1,
        max_order_qty: '',
        qty_step: 1,
        is_default: 'false',
        currency: 'VND',
        promotion_enabled: 'false',
        promotion_type: 'FIXED',
        promotion_value: 0,
        promotion_starts_at: '',
        promotion_ends_at: '',
        promotion_allow_voucher: 'true',
    },
    toFormValues: (unit = {}) => ({
        unit_type: unit.unit_type || 'PACK',
        display_name: unit.display_name || '',
        pack_size: unit.pack_size || 1,
        price_tiers_text: priceTiersToText(unit.price_tiers),
        min_order_qty:
            unit.min_order_qty || unit.constraints?.min_order_qty || 1,
        max_order_qty:
            unit.max_order_qty || unit.constraints?.max_order_qty || '',
        qty_step: unit.qty_step || unit.constraints?.qty_step || 1,
        is_default: unit.is_default ? 'true' : 'false',
        currency: unit.currency || unit.pricing?.currency || 'VND',
        promotion_enabled: unit.promotion?.enabled ? 'true' : 'false',
        promotion_type: unit.promotion?.type || 'FIXED',
        promotion_value: unit.promotion?.value || 0,
        promotion_starts_at: toDateTimeLocal(
            unit.promotion?.starts_at
        ),
        promotion_ends_at: toDateTimeLocal(
            unit.promotion?.ends_at
        ),
        promotion_allow_voucher:
            unit.promotion?.allow_voucher === false ? 'false' : 'true',
    }),
    toPayload: (values, { mode }) => {
        const payload = {
            unit_type: values.unit_type,
            display_name: values.display_name.trim(),
            price_tiers: parsePriceTiers(values.price_tiers_text),
            min_order_qty: Number(values.min_order_qty),
            max_order_qty: values.max_order_qty
                ? Number(values.max_order_qty)
                : null,
            qty_step: Number(values.qty_step),
            is_default: values.is_default === 'true',
            currency: values.currency,
            promotion: {
                enabled: values.promotion_enabled === 'true',
                type: values.promotion_type,
                value: Number(values.promotion_value || 0),
                starts_at: toIsoDateOrNull(
                    values.promotion_starts_at
                ),
                ends_at: toIsoDateOrNull(values.promotion_ends_at),
                allow_voucher:
                    values.promotion_allow_voucher === 'true',
            },
        };

        if (mode === 'create') {
            payload.pack_size = Number(values.pack_size);
        }

        return payload;
    },
    fields: [
        {
            name: 'unit_type',
            label: translate('text.unit_type'),
            type: 'select',
            options: [
                { value: 'UNIT', label: translate('text.unit_9676e3f3') },
                { value: 'PACK', label: translate('text.pack') },
                { value: 'BOX', label: translate('text.box') },
                { value: 'CARTON', label: translate('text.carton') },
            ],
        },
        {
            name: 'display_name',
            label: translate('text.display_name'),
            placeholder: translate('text.pack_of_100_bags'),
        },
        {
            name: 'pack_size',
            label: translate('text.number_of_bags_packages'),
            type: 'number',
            readOnly: ({ mode }) => mode === 'edit',
            helperText: ({ mode }) =>
                mode === 'edit' ? translate('text.be_currently_does_not_allow_editing_the_unit_s_pack_size') : '',
        },
        {
            name: 'currency',
            label: translate('text.currency'),
            type: 'select',
            options: [
                { value: 'VND', label: translate('text.vnd') },
                { value: 'USD', label: translate('text.usd') },
                { value: 'EUR', label: translate('text.eur') },
            ],
        },
        {
            name: 'price_tiers_text',
            label: translate('text.price_tiers'),
            type: 'textarea',
            rows: 5,
            placeholder: '1|9|25000\n10||23000',
            helperText: translate('text.each_line_min_qty_max_qty_unit_price_the_last_line_leaves_max_qty_blank'),
            className: 'md:col-span-2',
        },
        {
            name: 'min_order_qty',
            label: translate('text.minimum_number_of_packages'),
            type: 'number',
        },
        {
            name: 'max_order_qty',
            label: translate('text.maximum_number_of_packages'),
            placeholder: translate('text.leave_blank_if_not_limited_to'),
        },
        {
            name: 'qty_step',
            label: translate('text.quantity_jump'),
            type: 'number',
        },
        {
            name: 'is_default',
            label: translate('text.default'),
            type: 'select',
            options: [
                { value: 'false', label: translate('text.no') },
                { value: 'true', label: translate('text.yes') },
            ],
        },
        {
            name: 'promotion_enabled',
            label: translate('text.promotion_enabled'),
            type: 'select',
            options: [
                { value: 'false', label: translate('text.no') },
                { value: 'true', label: translate('text.yes') },
            ],
        },
        {
            name: 'promotion_type',
            label: translate('text.promotion_type'),
            type: 'select',
            options: [
                { value: 'FIXED', label: translate('text.fixed_amount') },
                { value: 'PERCENT', label: translate('text.percentage') },
            ],
        },
        {
            name: 'promotion_value',
            label: translate('text.discount_value'),
            type: 'number',
            helperText: translate('text.promotion_value_helper'),
        },
        {
            name: 'promotion_allow_voucher',
            label: translate('text.allow_voucher_with_promotion'),
            type: 'select',
            options: [
                { value: 'true', label: translate('text.yes') },
                { value: 'false', label: translate('text.no') },
            ],
        },
        {
            name: 'promotion_starts_at',
            label: translate('text.promotion_starts_at'),
            type: 'datetime-local',
        },
        {
            name: 'promotion_ends_at',
            label: translate('text.promotion_ends_at'),
            type: 'datetime-local',
        },
    ],
};
