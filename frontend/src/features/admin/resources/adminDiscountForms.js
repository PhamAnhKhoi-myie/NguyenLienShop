import { z } from 'zod';

export const discountStatusOptions = [
    { value: '', label: 'Tất cả trạng thái' },
    { value: 'active', label: 'active' },
    { value: 'inactive', label: 'inactive' },
    { value: 'paused', label: 'paused' },
    { value: 'expired', label: 'expired' },
];

export const discountTypeOptions = [
    { value: '', label: 'Tất cả loại' },
    { value: 'percent', label: 'percent' },
    { value: 'fixed', label: 'fixed' },
];

export const discountSortOptions = [
    { value: '-created_at', label: 'Mới nhất' },
    { value: 'created_at', label: 'Cũ nhất' },
    { value: 'expiry_date', label: 'Sắp hết hạn' },
    { value: '-expiry_date', label: 'Hết hạn muộn' },
    { value: '-usage_count', label: 'Dùng nhiều nhất' },
    { value: 'usage_count', label: 'Dùng ít nhất' },
];

const codeSchema = z
    .string()
    .trim()
    .min(3, 'Mã cần ít nhất 3 ký tự')
    .max(20, 'Mã không vượt quá 20 ký tự')
    .regex(/^[A-Z0-9_-]+$/i, 'Mã chỉ gồm chữ, số, gạch ngang hoặc gạch dưới');

const objectIdSchema = z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'ObjectId không hợp lệ');

const optionalIdsTextSchema = z.string().superRefine((value, ctx) => {
    splitIds(value).forEach((id) => {
        const result = objectIdSchema.safeParse(id);

        if (!result.success) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `ObjectId không hợp lệ: ${id}`,
            });
        }
    });
});

const nullableNumberSchema = z.preprocess((value) => {
    if (value === '' || value === null || value === undefined) {
        return null;
    }

    return Number(value);
}, z.number().min(0, 'Giá trị không được âm').nullable());

const dateTimeSchema = z.string().min(1, 'Vui lòng chọn thời gian').refine(
    (value) => !Number.isNaN(new Date(value).getTime()),
    'Thời gian không hợp lệ'
);

const discountBaseSchema = z
    .object({
        code: codeSchema,
        type: z.enum(['percent', 'fixed']),
        value: z.coerce.number().min(0, 'Giá trị không được âm'),
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
        min_order_value: z.coerce.number().min(0, 'Đơn tối thiểu không được âm'),
        usage_limit: z.coerce.number().int().min(1, 'Giới hạn dùng phải >= 1'),
        usage_per_user_limit: z.coerce
            .number()
            .int()
            .min(1, 'Giới hạn mỗi user phải >= 1'),
        is_stackable: z.enum(['true', 'false']),
        stack_priority: z.coerce.number().int(),
        show_on_homepage: z.enum(['true', 'false']),
        requires_claim: z.enum(['true', 'false']),
        homepage_priority: z.coerce
            .number()
            .int()
            .min(0, 'Ưu tiên homepage không được âm')
            .max(999, 'Ưu tiên homepage không vượt quá 999'),
        started_at: dateTimeSchema,
        expiry_date: dateTimeSchema,
        status: z.enum(['active', 'inactive', 'paused', 'expired']),
    })
    .superRefine((value, ctx) => {
        if (value.type === 'percent' && !(Number(value.max_discount_amount) > 0)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['max_discount_amount'],
                message: 'Giảm theo phần trăm cần mức giảm tối đa',
            });
        }

        if (value.type === 'percent' && value.value > 100) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['value'],
                message: 'Phần trăm giảm không được vượt quá 100',
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
                message: 'Mức giảm tối đa không được nhỏ hơn giá trị giảm',
            });
        }

        if (new Date(value.started_at) >= new Date(value.expiry_date)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['expiry_date'],
                message: 'Ngày hết hạn phải sau ngày bắt đầu',
            });
        }

        if (value.usage_limit < value.usage_per_user_limit) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['usage_limit'],
                message: 'Tổng lượt dùng phải >= lượt dùng mỗi user',
            });
        }

        if (
            value.applicable_targets_type === 'specific_products' &&
            splitIds(value.product_ids_text).length === 0
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['product_ids_text'],
                message: 'Cần nhập product IDs',
            });
        }

        if (
            value.applicable_targets_type === 'specific_categories' &&
            splitIds(value.category_ids_text).length === 0
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['category_ids_text'],
                message: 'Cần nhập category IDs',
            });
        }

        if (
            value.applicable_targets_type === 'specific_variants' &&
            splitIds(value.variant_ids_text).length === 0
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['variant_ids_text'],
                message: 'Cần nhập variant IDs',
            });
        }

        if (
            value.user_eligibility_type === 'specific_users' &&
            splitIds(value.user_ids_text).length === 0
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['user_ids_text'],
                message: 'Cần nhập user IDs',
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
    title: 'mã giảm giá',
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
        { name: 'code', label: 'Mã giảm giá', placeholder: 'VD: BAOTRAI10' },
        {
            name: 'status',
            label: 'Trạng thái',
            type: 'select',
            options: discountStatusOptions.filter((option) => option.value),
        },
        {
            name: 'type',
            label: 'Loại giảm',
            type: 'select',
            options: discountTypeOptions.filter((option) => option.value),
        },
        { name: 'value', label: 'Giá trị', type: 'number' },
        {
            name: 'max_discount_amount',
            label: 'Mức giảm tối đa',
            type: 'number',
            helperText: 'Bắt buộc với percent, tùy chọn với fixed.',
        },
        { name: 'min_order_value', label: 'Đơn tối thiểu', type: 'number' },
        { name: 'usage_limit', label: 'Tổng lượt dùng', type: 'number' },
        {
            name: 'usage_per_user_limit',
            label: 'Lượt dùng mỗi user',
            type: 'number',
        },
        {
            name: 'application_strategy',
            label: 'Cách áp dụng',
            type: 'select',
            options: [
                { value: 'apply_all', label: 'apply_all' },
                { value: 'apply_once', label: 'apply_once' },
                { value: 'apply_cheapest', label: 'apply_cheapest' },
                { value: 'apply_most_expensive', label: 'apply_most_expensive' },
            ],
        },
        {
            name: 'is_stackable',
            label: 'Cho phép cộng dồn',
            type: 'select',
            options: [
                { value: 'false', label: 'Không' },
                { value: 'true', label: 'Có' },
            ],
        },
        { name: 'stack_priority', label: 'Ưu tiên cộng dồn', type: 'number' },
        {
            name: 'show_on_homepage',
            label: 'Hiển thị homepage',
            type: 'select',
            options: [
                { value: 'false', label: 'Không' },
                { value: 'true', label: 'Có' },
            ],
            helperText: 'Chỉ mã bật mục này mới hiện cho khách nhận ở trang chủ.',
        },
        {
            name: 'requires_claim',
            label: 'Bắt buộc nhận voucher',
            type: 'select',
            options: [
                { value: 'false', label: 'Không' },
                { value: 'true', label: 'Có' },
            ],
            helperText: 'Nếu bật, user phải nhận voucher trước khi nhập mã ở checkout.',
        },
        {
            name: 'homepage_priority',
            label: 'Ưu tiên homepage',
            type: 'number',
            helperText: 'Số lớn hơn hiển thị trước.',
        },
        { name: 'started_at', label: 'Bắt đầu', type: 'datetime-local' },
        { name: 'expiry_date', label: 'Hết hạn', type: 'datetime-local' },
        {
            name: 'applicable_targets_type',
            label: 'Phạm vi sản phẩm',
            type: 'select',
            options: [
                { value: 'all', label: 'all' },
                { value: 'specific_products', label: 'specific_products' },
                { value: 'specific_categories', label: 'specific_categories' },
                { value: 'specific_variants', label: 'specific_variants' },
            ],
        },
        {
            name: 'user_eligibility_type',
            label: 'Điều kiện user',
            type: 'select',
            options: [
                { value: 'all', label: 'all' },
                { value: 'first_time_only', label: 'first_time_only' },
                { value: 'specific_users', label: 'specific_users' },
                { value: 'vip_users', label: 'vip_users' },
            ],
        },
        {
            name: 'min_user_tier',
            label: 'Tier tối thiểu',
            type: 'select',
            emptyLabel: 'Không yêu cầu tier',
            options: [
                { value: 'bronze', label: 'bronze' },
                { value: 'silver', label: 'silver' },
                { value: 'gold', label: 'gold' },
                { value: 'platinum', label: 'platinum' },
            ],
        },
        {
            name: 'product_ids_text',
            label: 'Product IDs',
            type: 'textarea',
            rows: 3,
            className: 'md:col-span-2',
        },
        {
            name: 'category_ids_text',
            label: 'Category IDs',
            type: 'textarea',
            rows: 3,
            className: 'md:col-span-2',
        },
        {
            name: 'variant_ids_text',
            label: 'Variant IDs',
            type: 'textarea',
            rows: 3,
            className: 'md:col-span-2',
        },
        {
            name: 'user_ids_text',
            label: 'User IDs',
            type: 'textarea',
            rows: 3,
            className: 'md:col-span-2',
        },
    ],
};

export const duplicateDiscountFormConfig = {
    title: 'nhân bản mã giảm giá',
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
            label: 'Mã mới',
            placeholder: 'VD: BAOTRAI10_COPY',
        },
    ],
};

export const bulkDiscountsFormConfig = {
    title: 'import mã giảm giá',
    schema: z.object({
        discounts_json: z.string().superRefine((value, ctx) => {
            let parsed;

            try {
                parsed = parseBulkDiscounts(value);
            } catch {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'JSON không hợp lệ',
                });
                return;
            }

            const result = z.array(bulkDiscountSchema).min(1).safeParse(parsed);

            if (!result.success) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message:
                        result.error.issues[0]?.message ||
                        'Danh sách discount không hợp lệ',
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
            label: 'Discount JSON',
            type: 'textarea',
            rows: 14,
            className: 'md:col-span-2',
        },
    ],
};
