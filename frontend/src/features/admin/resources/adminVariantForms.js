import { z } from 'zod';

const positiveInt = (label) =>
    z.coerce
        .number()
        .int(`${label} phải là số nguyên`)
        .positive(`${label} phải lớn hơn 0`);

const nonNegativeInt = (label) =>
    z.coerce
        .number()
        .int(`${label} phải là số nguyên`)
        .min(0, `${label} không được âm`);

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
                tier.unit_price,
            ].join('|')
        )
        .join('\n');
}

function validatePriceTierText(value, ctx) {
    const lines = String(value || '')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    if (lines.length === 0) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Vui lòng nhập ít nhất một bậc giá',
        });
        return;
    }

    const tiers = parsePriceTiers(value);

    tiers.forEach((tier, index) => {
        if (!Number.isInteger(tier.min_qty) || tier.min_qty <= 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Dòng ${index + 1}: min_qty phải là số nguyên dương`,
            });
        }

        if (
            tier.max_qty !== null &&
            (!Number.isInteger(tier.max_qty) || tier.max_qty <= 0)
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Dòng ${index + 1}: max_qty phải là số nguyên dương hoặc để trống`,
            });
        }

        if (!Number.isFinite(tier.unit_price) || tier.unit_price <= 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Dòng ${index + 1}: unit_price phải lớn hơn 0`,
            });
        }
    });

    const lastTier = tiers[tiers.length - 1];
    if (lastTier?.max_qty !== null) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Bậc giá cuối phải để trống max_qty để không giới hạn',
        });
    }

    for (let index = 1; index < tiers.length; index += 1) {
        const previous = tiers[index - 1];
        const current = tiers[index];

        if (current.min_qty <= previous.min_qty) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'price_tiers phải tăng dần theo min_qty',
            });
        }

        if (previous.max_qty !== null && previous.max_qty >= current.min_qty) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'price_tiers không được chồng khoảng số lượng',
            });
        }
    }
}

const variantFormSchema = z.object({
    size: z.string().trim().min(1, 'Vui lòng nhập kích thước').max(50),
    fabric_type: z.string().trim().min(1, 'Vui lòng nhập chất liệu').max(100),
    available_stock: nonNegativeInt('Tồn kho'),
    status: z.enum(['ACTIVE', 'INACTIVE']),
});

const variantUnitFormSchema = z
    .object({
        unit_type: z.enum(['UNIT', 'PACK', 'BOX', 'CARTON']),
        display_name: z
            .string()
            .trim()
            .min(1, 'Vui lòng nhập tên đơn vị')
            .max(100),
        pack_size: positiveInt('Quy cách'),
        price_tiers_text: z.string().superRefine(validatePriceTierText),
        min_order_qty: positiveInt('Số gói tối thiểu'),
        max_order_qty: z.string().trim(),
        qty_step: positiveInt('Bước nhảy số lượng'),
        is_default: z.enum(['true', 'false']),
        currency: z.enum(['VND', 'USD', 'EUR']),
    })
    .superRefine((values, ctx) => {
        if (!values.max_order_qty) {
            return;
        }

        const maxOrderQty = Number(values.max_order_qty);
        if (!Number.isInteger(maxOrderQty) || maxOrderQty <= 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['max_order_qty'],
                message: 'Số gói tối đa phải là số nguyên dương hoặc để trống',
            });
            return;
        }

        if (maxOrderQty < values.min_order_qty) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['max_order_qty'],
                message: 'Số gói tối đa phải lớn hơn hoặc bằng tối thiểu',
            });
        }
    });

export const variantFormConfig = {
    title: 'biến thể',
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
            label: 'Kích thước',
            placeholder: '16x16 cm',
            readOnly: ({ mode }) => mode === 'edit',
            helperText: ({ mode }) =>
                mode === 'edit' ? 'BE hiện không cho sửa kích thước variant.' : '',
        },
        {
            name: 'fabric_type',
            label: 'Chất liệu',
            placeholder: 'Vải không dệt trắng',
            readOnly: ({ mode }) => mode === 'edit',
            helperText: ({ mode }) =>
                mode === 'edit' ? 'BE hiện không cho sửa chất liệu variant.' : '',
        },
        {
            name: 'available_stock',
            label: 'Tồn kho ban đầu',
            type: 'number',
            readOnly: ({ mode }) => mode === 'edit',
            helperText: ({ mode }) =>
                mode === 'edit' ? 'BE hiện không cho sửa tồn kho qua endpoint variant update.' : '',
        },
        {
            name: 'status',
            label: 'Trạng thái',
            type: 'select',
            options: [
                { value: 'ACTIVE', label: 'ACTIVE' },
                { value: 'INACTIVE', label: 'INACTIVE' },
            ],
        },
    ],
};

export const variantUnitFormConfig = {
    title: 'đơn vị bán',
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
        };

        if (mode === 'create') {
            payload.pack_size = Number(values.pack_size);
        }

        return payload;
    },
    fields: [
        {
            name: 'unit_type',
            label: 'Loại đơn vị',
            type: 'select',
            options: [
                { value: 'UNIT', label: 'UNIT' },
                { value: 'PACK', label: 'PACK' },
                { value: 'BOX', label: 'BOX' },
                { value: 'CARTON', label: 'CARTON' },
            ],
        },
        {
            name: 'display_name',
            label: 'Tên hiển thị',
            placeholder: 'Gói 100 túi',
        },
        {
            name: 'pack_size',
            label: 'Số túi/gói',
            type: 'number',
            readOnly: ({ mode }) => mode === 'edit',
            helperText: ({ mode }) =>
                mode === 'edit' ? 'BE hiện không cho sửa pack_size của unit.' : '',
        },
        {
            name: 'currency',
            label: 'Tiền tệ',
            type: 'select',
            options: [
                { value: 'VND', label: 'VND' },
                { value: 'USD', label: 'USD' },
                { value: 'EUR', label: 'EUR' },
            ],
        },
        {
            name: 'price_tiers_text',
            label: 'Price tiers',
            type: 'textarea',
            rows: 5,
            placeholder: '1|9|25000\n10||23000',
            helperText: 'Mỗi dòng: min_qty|max_qty|unit_price. Dòng cuối để trống max_qty.',
            className: 'md:col-span-2',
        },
        {
            name: 'min_order_qty',
            label: 'Số gói tối thiểu',
            type: 'number',
        },
        {
            name: 'max_order_qty',
            label: 'Số gói tối đa',
            placeholder: 'Để trống nếu không giới hạn',
        },
        {
            name: 'qty_step',
            label: 'Bước nhảy số lượng',
            type: 'number',
        },
        {
            name: 'is_default',
            label: 'Mặc định',
            type: 'select',
            options: [
                { value: 'false', label: 'Không' },
                { value: 'true', label: 'Có' },
            ],
        },
    ],
};
