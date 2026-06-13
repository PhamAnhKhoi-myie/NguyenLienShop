import { translate } from '../../../shared/i18n/index';
import { z } from 'zod';

export const discountStatusOptions = [
    { value: '', label: translate('text.all_statuses') },
    { value: 'active', label: translate('text.active_2bb6b986') },
    { value: 'inactive', label: translate('text.inactive_d436a3f4') },
    { value: 'paused', label: translate('text.paused') },
    { value: 'expired', label: translate('text.expired') },
];

export const discountTypeOptions = [
    { value: '', label: translate('text.all_types') },
    { value: 'percent', label: translate('text.percent') },
    { value: 'fixed', label: translate('text.fixed') },
];

export const discountSortOptions = [
    { value: '-created_at', label: translate('text.latest') },
    { value: 'created_at', label: translate('text.oldest') },
    { value: 'expiry_date', label: translate('text.expiring_soon') },
    { value: '-expiry_date', label: translate('text.late_expiration') },
    { value: '-usage_count', label: translate('text.most_used') },
    { value: 'usage_count', label: translate('text.use_at_least') },
];

const codeSchema = z
    .string()
    .trim()
    .min(3, translate('text.code_needs_at_least_3_characters'))
    .max(20, translate('text.code_must_not_exceed_20_characters'))
    .regex(/^[A-Z0-9_-]+$/i, translate('text.code_must_contain_only_letters_numbers_dashes_or_underlines'));

const objectIdSchema = z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, translate('text.invalid_objectid'));

const optionalIdsTextSchema = z.string().superRefine((value, ctx) => {
    splitIds(value).forEach((id) => {
        const result = objectIdSchema.safeParse(id);

        if (!result.success) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: translate('text.invalid_objectid_value', { value0: id }),
            });
        }
    });
});

const nullableNumberSchema = z.preprocess((value) => {
    if (value === '' || value === null || value === undefined) {
        return null;
    }

    return Number(value);
}, z.number().min(0, translate('text.value_cannot_be_negative')).nullable());

const dateTimeSchema = z.string().min(1, translate('text.please_select_time')).refine(
    (value) => !Number.isNaN(new Date(value).getTime()),
    translate('text.invalid_time')
);

const discountBaseSchema = z
    .object({
        code: codeSchema,
        type: z.enum(['percent', 'fixed']),
        value: z.coerce.number().min(0, translate('text.value_cannot_be_negative')),
        max_discount_amount: nullableNumberSchema,
        application_strategy: z.enum([
            'apply_all',
            'apply_once',
            'apply_cheapest',
            'apply_most_expensive',
        ]),
        applicable_targets_type: z.enum([
            'all',
            'specific_products',
            'specific_categories',
            'specific_variants',
        ]),
        product_ids_text: optionalIdsTextSchema,
        category_ids_text: optionalIdsTextSchema,
        variant_ids_text: optionalIdsTextSchema,
        user_eligibility_type: z.enum([
            'all',
            'first_time_only',
            'specific_users',
            'vip_users',
        ]),
        user_ids_text: optionalIdsTextSchema,
        min_user_tier: z.enum(['', 'bronze', 'silver', 'gold', 'platinum']),
        min_order_value: z.coerce.number().min(0, translate('text.minimum_order_cannot_be_negative')),
        usage_limit: z.coerce.number().int().min(1, translate('text.usage_limit_must_be_1')),
        usage_per_user_limit: z.coerce
            .number()
            .int()
            .min(1, translate('text.limit_each_user_to_1')),
        is_stackable: z.enum(['true', 'false']),
        stack_priority: z.coerce.number().int(),
        show_on_homepage: z.enum(['true', 'false']),
        requires_claim: z.enum(['true', 'false']),
        homepage_priority: z.coerce
            .number()
            .int()
            .min(0, translate('text.homepage_priority_cannot_be_negative'))
            .max(999, translate('text.homepage_priority_does_not_exceed_999')),
        started_at: dateTimeSchema,
        expiry_date: dateTimeSchema,
        status: z.enum(['active', 'inactive', 'paused', 'expired']),
    })
    .superRefine((value, ctx) => {
        if (value.type === 'percent' && !(Number(value.max_discount_amount) > 0)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['max_discount_amount'],
                message: translate('text.percentage_reduction_requires_maximum_reduction'),
            });
        }

        if (value.type === 'percent' && value.value > 100) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['value'],
                message: translate('text.the_reduction_percentage_cannot_exceed_100'),
            });
        }

        if (
            value.type === 'fixed' &&
            value.max_discount_amount &&
            value.max_discount_amount < value.value
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['max_discount_amount'],
                message: translate('text.the_maximum_reduction_cannot_be_less_than_the_reduction_value'),
            });
        }

        if (new Date(value.started_at) >= new Date(value.expiry_date)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['expiry_date'],
                message: translate('text.expiration_date_must_be_after_start_date'),
            });
        }

        if (value.usage_limit < value.usage_per_user_limit) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['usage_limit'],
                message: translate('text.total_usage_must_be_usage_per_user'),
            });
        }

        if (
            value.applicable_targets_type === 'specific_products' &&
            splitIds(value.product_ids_text).length === 0
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['product_ids_text'],
                message: translate('text.need_to_enter_product_ids'),
            });
        }

        if (
            value.applicable_targets_type === 'specific_categories' &&
            splitIds(value.category_ids_text).length === 0
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['category_ids_text'],
                message: translate('text.need_to_enter_category_ids'),
            });
        }

        if (
            value.applicable_targets_type === 'specific_variants' &&
            splitIds(value.variant_ids_text).length === 0
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['variant_ids_text'],
                message: translate('text.need_to_enter_variant_ids'),
            });
        }

        if (
            value.user_eligibility_type === 'specific_users' &&
            splitIds(value.user_ids_text).length === 0
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['user_ids_text'],
                message: translate('text.need_to_enter_user_ids'),
            });
        }
    });

const bulkDiscountSchema = z.object({
    code: codeSchema,
    type: z.enum(['percent', 'fixed']),
    value: z.number().min(0),
    max_discount_amount: z.number().min(0).nullable().optional(),
    application_strategy: z
        .enum(['apply_all', 'apply_once', 'apply_cheapest', 'apply_most_expensive'])
        .optional(),
    min_order_value: z.number().min(0).optional(),
    usage_limit: z.number().int().min(1),
    usage_per_user_limit: z.number().int().min(1),
    is_stackable: z.boolean().optional(),
    stack_priority: z.number().int().optional(),
    show_on_homepage: z.boolean().optional(),
    requires_claim: z.boolean().optional(),
    homepage_priority: z.number().int().min(0).max(999).optional(),
    started_at: z.string().optional(),
    expiry_date: z.string().optional(),
    status: z.enum(['active', 'inactive', 'paused', 'expired']).optional(),
});

function splitIds(value) {
    return String(value || '')
        .split(/[\s,]+/)
        .map((item) => item.trim())
        .filter(Boolean);
}

function idsToText(values = []) {
    return Array.isArray(values)
        ? values.map((value) => String(value)).join('\n')
        : '';
}

function pad(value) {
    return String(value).padStart(2, '0');
}

function toDateTimeLocal(value) {
    const date = value ? new Date(value) : new Date();

    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return [
        date.getFullYear(),
        '-',
        pad(date.getMonth() + 1),
        '-',
        pad(date.getDate()),
        'T',
        pad(date.getHours()),
        ':',
        pad(date.getMinutes()),
    ].join('');
}

function defaultExpiryDate() {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return toDateTimeLocal(date);
}

function toIso(value) {
    return new Date(value).toISOString();
}

function buildApplicableTargets(values) {
    const type = values.applicable_targets_type;

    return {
        type,
        product_ids:
            type === 'specific_products' ? splitIds(values.product_ids_text) : [],
        category_ids:
            type === 'specific_categories' ? splitIds(values.category_ids_text) : [],
        variant_ids:
            type === 'specific_variants' ? splitIds(values.variant_ids_text) : [],
    };
}

function buildUserEligibility(values) {
    return {
        type: values.user_eligibility_type,
        user_ids:
            values.user_eligibility_type === 'specific_users'
                ? splitIds(values.user_ids_text)
                : [],
        min_user_tier: values.min_user_tier || null,
    };
}

function buildDiscountPayload(values) {
    return {
        code: values.code.trim().toUpperCase(),
        type: values.type,
        value: Number(values.value),
        max_discount_amount:
            values.max_discount_amount === null ||
            values.max_discount_amount === undefined
                ? null
                : Number(values.max_discount_amount),
        application_strategy: values.application_strategy,
        applicable_targets: buildApplicableTargets(values),
        user_eligibility: buildUserEligibility(values),
        min_order_value: Number(values.min_order_value || 0),
        usage_limit: Number(values.usage_limit),
        usage_per_user_limit: Number(values.usage_per_user_limit),
        is_stackable:
            values.is_stackable === true || values.is_stackable === 'true',
        stack_priority: Number(values.stack_priority || 0),
        show_on_homepage:
            values.show_on_homepage === true ||
            values.show_on_homepage === 'true',
        requires_claim:
            values.requires_claim === true ||
            values.requires_claim === 'true',
        homepage_priority: Number(values.homepage_priority || 0),
        started_at: toIso(values.started_at),
        expiry_date: toIso(values.expiry_date),
        status: values.status,
    };
}

function parseBulkDiscounts(value) {
    return JSON.parse(value);
}

export const discountFormConfig = {
    title: translate('text.discount_code_20b1cc35'),
    schema: discountBaseSchema,
    defaultValues: {
        code: '',
        type: 'percent',
        value: 10,
        max_discount_amount: 50000,
        application_strategy: 'apply_all',
        applicable_targets_type: 'all',
        product_ids_text: '',
        category_ids_text: '',
        variant_ids_text: '',
        user_eligibility_type: 'all',
        user_ids_text: '',
        min_user_tier: '',
        min_order_value: 0,
        usage_limit: 100,
        usage_per_user_limit: 1,
        is_stackable: 'false',
        stack_priority: 0,
        show_on_homepage: 'false',
        requires_claim: 'false',
        homepage_priority: 0,
        started_at: toDateTimeLocal(),
        expiry_date: defaultExpiryDate(),
        status: 'active',
    },
    toFormValues: (discount = {}) => ({
        code: discount.code || '',
        type: discount.type || 'percent',
        value: discount.value ?? 10,
        max_discount_amount: discount.max_discount_amount ?? '',
        application_strategy: discount.application_strategy || 'apply_all',
        applicable_targets_type: discount.applicable_targets?.type || 'all',
        product_ids_text: idsToText(discount.applicable_targets?.product_ids),
        category_ids_text: idsToText(discount.applicable_targets?.category_ids),
        variant_ids_text: idsToText(discount.applicable_targets?.variant_ids),
        user_eligibility_type: discount.user_eligibility?.type || 'all',
        user_ids_text: idsToText(discount.user_eligibility?.user_ids),
        min_user_tier: discount.user_eligibility?.min_user_tier || '',
        min_order_value: discount.min_order_value ?? 0,
        usage_limit: discount.usage_limit ?? 100,
        usage_per_user_limit: discount.usage_per_user_limit ?? 1,
        is_stackable: discount.is_stackable ? 'true' : 'false',
        stack_priority: discount.stack_priority ?? 0,
        show_on_homepage: discount.show_on_homepage ? 'true' : 'false',
        requires_claim: discount.requires_claim ? 'true' : 'false',
        homepage_priority: discount.homepage_priority ?? 0,
        started_at: discount.started_at
            ? toDateTimeLocal(discount.started_at)
            : toDateTimeLocal(),
        expiry_date: discount.expiry_date
            ? toDateTimeLocal(discount.expiry_date)
            : defaultExpiryDate(),
        status: discount.status || 'active',
    }),
    toPayload: buildDiscountPayload,
    fields: [
        { name: 'code', label: translate('text.discount_code'), placeholder: translate('text.vd_baotrai10') },
        {
            name: 'status',
            label: translate('text.status'),
            type: 'select',
            options: discountStatusOptions.filter((option) => option.value),
        },
        {
            name: 'type',
            label: translate('text.reduction_type'),
            type: 'select',
            options: discountTypeOptions.filter((option) => option.value),
        },
        { name: 'value', label: translate('text.value'), type: 'number' },
        {
            name: 'max_discount_amount',
            label: translate('text.maximum_reduction'),
            type: 'number',
            helperText: translate('text.required_with_percent_optional_with_fixed'),
        },
        { name: 'min_order_value', label: translate('text.minimum_order'), type: 'number' },
        { name: 'usage_limit', label: translate('text.total_uses'), type: 'number' },
        {
            name: 'usage_per_user_limit',
            label: translate('text.number_of_uses_per_user'),
            type: 'number',
        },
        {
            name: 'application_strategy',
            label: translate('text.how_to_apply'),
            type: 'select',
            options: [
                { value: 'apply_all', label: translate('text.apply_all') },
                { value: 'apply_once', label: translate('text.apply_once') },
                { value: 'apply_cheapest', label: translate('text.apply_cheapest') },
                { value: 'apply_most_expensive', label: translate('text.apply_most_expensive') },
            ],
        },
        {
            name: 'is_stackable',
            label: translate('text.allows_accumulation_of'),
            type: 'select',
            options: [
                { value: 'false', label: translate('text.no') },
                { value: 'true', label: translate('text.yes') },
            ],
        },
        { name: 'stack_priority', label: translate('text.cumulative_priority'), type: 'number' },
        {
            name: 'show_on_homepage',
            label: translate('text.display_homepage'),
            type: 'select',
            options: [
                { value: 'false', label: translate('text.no') },
                { value: 'true', label: translate('text.yes') },
            ],
            helperText: translate('text.only_the_code_that_enables_this_item_will_be_shown_to_the_recipient_on_t'),
        },
        {
            name: 'requires_claim',
            label: translate('text.required_to_receive_voucher'),
            type: 'select',
            options: [
                { value: 'false', label: translate('text.no') },
                { value: 'true', label: translate('text.yes') },
            ],
            helperText: translate('text.if_enabled_the_user_must_receive_the_voucher_before_entering_the_code_at'),
        },
        {
            name: 'homepage_priority',
            label: translate('text.priority_homepage'),
            type: 'number',
            helperText: translate('text.larger_numbers_are_displayed_first'),
        },
        { name: 'started_at', label: translate('text.start'), type: 'datetime-local' },
        { name: 'expiry_date', label: translate('text.expires'), type: 'datetime-local' },
        {
            name: 'applicable_targets_type',
            label: translate('text.product_range'),
            type: 'select',
            options: [
                { value: 'all', label: translate('text.all_d87c4480') },
                { value: 'specific_products', label: translate('text.specific_products') },
                { value: 'specific_categories', label: translate('text.specific_categories') },
                { value: 'specific_variants', label: translate('text.specific_variants') },
            ],
        },
        {
            name: 'user_eligibility_type',
            label: translate('text.user_condition'),
            type: 'select',
            options: [
                { value: 'all', label: translate('text.all_d87c4480') },
                { value: 'first_time_only', label: translate('text.first_time_only') },
                { value: 'specific_users', label: translate('text.specific_users') },
                { value: 'vip_users', label: translate('text.vip_users') },
            ],
        },
        {
            name: 'min_user_tier',
            label: translate('text.minimum_tier'),
            type: 'select',
            emptyLabel: translate('text.does_not_require_tier'),
            options: [
                { value: 'bronze', label: translate('text.bronze') },
                { value: 'silver', label: translate('text.silver') },
                { value: 'gold', label: translate('text.gold') },
                { value: 'platinum', label: translate('text.platinum') },
            ],
        },
        {
            name: 'product_ids_text',
            label: translate('text.product_ids'),
            type: 'textarea',
            rows: 3,
            className: 'md:col-span-2',
        },
        {
            name: 'category_ids_text',
            label: translate('text.category_ids'),
            type: 'textarea',
            rows: 3,
            className: 'md:col-span-2',
        },
        {
            name: 'variant_ids_text',
            label: translate('text.variant_ids'),
            type: 'textarea',
            rows: 3,
            className: 'md:col-span-2',
        },
        {
            name: 'user_ids_text',
            label: translate('text.user_ids'),
            type: 'textarea',
            rows: 3,
            className: 'md:col-span-2',
        },
    ],
};

export const duplicateDiscountFormConfig = {
    title: translate('text.duplicate_discount_code_ecbce673'),
    schema: z.object({
        newCode: codeSchema,
    }),
    defaultValues: {
        newCode: '',
    },
    toFormValues: (discount = {}) => ({
        newCode: discount.code ? `${discount.code}_COPY`.slice(0, 20) : '',
    }),
    toPayload: (values) => ({
        newCode: values.newCode.trim().toUpperCase(),
    }),
    fields: [
        {
            name: 'newCode',
            label: translate('text.new_code'),
            placeholder: translate('text.vd_baotrai10_copy'),
        },
    ],
};

export const bulkDiscountsFormConfig = {
    title: translate('text.import_discount_code_5bf15ec5'),
    schema: z.object({
        discounts_json: z.string().superRefine((value, ctx) => {
            let parsed;

            try {
                parsed = parseBulkDiscounts(value);
            } catch {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: translate('text.invalid_json'),
                });
                return;
            }

            const result = z.array(bulkDiscountSchema).min(1).safeParse(parsed);

            if (!result.success) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message:
                        result.error.issues[0]?.message ||
                        translate('text.invalid_discount_list'),
                });
            }
        }),
    }),
    defaultValues: {
        discounts_json: '[\n  {\n    "code": "BAOTRAI10",\n    "type": "percent",\n    "value": 10,\n    "max_discount_amount": 50000,\n    "usage_limit": 100,\n    "usage_per_user_limit": 1\n  }\n]',
    },
    toFormValues: () => ({
        discounts_json: '[\n  {\n    "code": "BAOTRAI10",\n    "type": "percent",\n    "value": 10,\n    "max_discount_amount": 50000,\n    "usage_limit": 100,\n    "usage_per_user_limit": 1\n  }\n]',
    }),
    toPayload: (values) => ({
        discounts: parseBulkDiscounts(values.discounts_json),
    }),
    fields: [
        {
            name: 'discounts_json',
            label: translate('text.discount_json'),
            type: 'textarea',
            rows: 14,
            className: 'md:col-span-2',
        },
    ],
};
