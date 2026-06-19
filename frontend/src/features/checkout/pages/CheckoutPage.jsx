import { translate } from '../../../shared/i18n/index';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    ArrowLeft,
    CheckCircle2,
    CreditCard,
    MapPin,
    TicketPercent,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import Button from '../../../shared/components/Button';
import Card, { CardBody, CardHeader } from '../../../shared/components/Card';
import EmptyState from '../../../shared/components/EmptyState';
import Input from '../../../shared/components/Input';
import Loading from '../../../shared/components/Loading';
import Select from '../../../shared/components/Select';
import Textarea from '../../../shared/components/Textarea';
import codIcon from '../../../assets/images/cod-icon.png';
import momoIcon from '../../../assets/images/momo-icon.png';
import payosIcon from '../../../assets/images/payos-icon.png';
import paypalIcon from '../../../assets/images/paypal-icon.png';
import vnpayIcon from '../../../assets/images/vnpay-icon.png';
import { ENV } from '../../../shared/config/env';
import { ROUTES } from '../../../shared/constants/routes';
import { useProvinces, useWards } from '../../../shared/hooks/useLocations';
import { cn } from '../../../shared/utils/cn';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import {
    useApplyCartDiscount,
    useCart,
    useRemoveCartDiscount,
    useValidateCart,
} from '../../cart/hooks/useCart';
import { CLAIMED_DISCOUNT_CODE_KEY } from '../../discounts/constants';
import { useClaimedDiscounts } from '../../discounts/hooks/useHomepageDiscounts';
import { useCreatePayment } from '../../payments/hooks/usePayments';
import {
    useAddresses,
    useCheckoutSettings,
    useCreateAddress,
    useCreateOrder,
    useUpdateAddress,
} from '../hooks/useCheckout';

const addressFormSchema = z.object({
    receiver_name: z.string().trim().min(2, translate('text.please_enter_recipient_name')),
    phone: z
        .string()
        .trim()
        .regex(/^(0|\+84)[0-9]{9}$/, translate('text.invalid_phone_number')),
    province_code: z.string().trim().min(1, translate('text.please_select_province_city')),
    ward_code: z.string().trim().min(1, translate('text.please_select_ward_commune')),
    detail: z.string().trim().min(5, translate('text.specific_address_of_at_least_5_characters')),
    note: z.string().trim().max(500, translate('text.note_maximum_500_characters')).optional(),
    payment_method: z.enum(['COD', 'VNPAY', 'MOMO', 'PAYOS', 'PAYPAL']),
});

const emptyAddressValues = {
    receiver_name: '',
    phone: '',
    province_code: '',
    ward_code: '',
    detail: '',
    note: '',
    payment_method: 'COD',
};

const onlinePaymentProviders = {
    VNPAY: 'vnpay',
    PAYPAL: 'paypal',
    PAYOS: 'payos',
};

const paymentMethodOptions = [
    {
        value: 'COD',
        labelKey: 'text.cash_payment',
        imageSrc: codIcon,
        iconClassName: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        selectedClassName: 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500/40',
    },
    {
        value: 'VNPAY',
        labelKey: 'text.vnpay_app_payment',
        imageSrc: vnpayIcon,
        iconClassName: 'border-sky-200 bg-sky-50 text-sky-700',
        selectedClassName: 'border-sky-500 bg-sky-50 ring-1 ring-sky-500/40',
    },
    {
        value: 'MOMO',
        labelKey: 'text.momo_app_payment',
        imageSrc: momoIcon,
        iconClassName: 'border-[#a50064]/20 bg-[#a50064]/10 text-[#a50064]',
        selectedClassName: 'border-[#a50064] bg-[#a50064]/10 ring-1 ring-[#a50064]/40',
    },
    {
        value: 'PAYOS',
        labelKey: 'text.bank_app_payment',
        imageSrc: payosIcon,
        iconClassName: 'border-cyan-200 bg-cyan-50 text-cyan-700',
        selectedClassName: 'border-cyan-500 bg-cyan-50 ring-1 ring-cyan-500/40',
    },
    {
        value: 'PAYPAL',
        labelKey: 'text.international_card_payment',
        imageSrc: paypalIcon,
        iconClassName: 'border-blue-200 bg-blue-50 text-blue-800',
        selectedClassName: 'border-blue-600 bg-blue-50 ring-1 ring-blue-600/40',
    },
];

function toFormValues(address) {
    if (!address) {
        return emptyAddressValues;
    }

    return {
        ...emptyAddressValues,
        receiver_name: address.receiver_name || '',
        phone: address.phone || '',
        province_code: address.province_code || '',
        ward_code: address.ward_code || '',
        detail: address.detail || '',
        note: address.note || '',
    };
}

function toAddressPayload(values) {
    return {
        receiver_name: values.receiver_name.trim(),
        phone: values.phone.trim(),
        province_code: values.province_code,
        ward_code: values.ward_code,
        detail: values.detail.trim(),
        note: values.note?.trim() || null,
        is_default: false,
    };
}

function toAddressSnapshot(values) {
    return {
        receiver_name: values.receiver_name.trim(),
        phone: values.phone.trim(),
        province_code: values.province_code,
        ward_code: values.ward_code,
        detail: values.detail.trim(),
        note: values.note?.trim() || null,
    };
}

function formatAddress(address) {
    return (
        address.full_address ||
        [
            address.detail,
            address.ward_name,
            address.province_name,
            address.address_line_1,
            address.address_line_2,
            address.ward,
            address.district,
            address.city,
        ]
            .filter(Boolean)
            .join(', ')
    );
}

function formatClaimedDiscountValue(claim) {
    const discount = claim.discount || {};

    if (discount.type === 'percent') {
        return `${discount.value}%`;
    }

    if (discount.type === 'fixed') {
        return formatCurrency(discount.value || 0);
    }

    return claim.code;
}

function AddressForm({
    selectedAddress,
    onSaveAddress,
    onSubmitOrder,
    isSaving,
    isOrdering,
    isVNPayEnabled,
    isPayPalEnabled,
    isPayOSEnabled,
}) {
    const {
        register,
        handleSubmit,
        getValues,
        trigger,
        control,
        setValue,
        clearErrors,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(addressFormSchema),
        defaultValues: toFormValues(selectedAddress),
    });

    const selectedProvinceCode = useWatch({
        control,
        name: 'province_code',
    });
    const paymentMethod = useWatch({
        control,
        name: 'payment_method',
    }) || 'COD';
    const provincesQuery = useProvinces();
    const wardsQuery = useWards(selectedProvinceCode);
    const provinces = provincesQuery.data?.data || [];
    const wards = wardsQuery.data?.data || [];
    const provinceField = register('province_code');
    const wardField = register('ward_code');
    const paymentMethodField = register('payment_method');
    const isMomoSelected = paymentMethod === 'MOMO';
    const isSelectedPaymentDisabled =
        isMomoSelected ||
        (paymentMethod === 'VNPAY' && !isVNPayEnabled) ||
        (paymentMethod === 'PAYPAL' && !isPayPalEnabled) ||
        (paymentMethod === 'PAYOS' && !isPayOSEnabled);

    const handleSave = async () => {
        const isValid = await trigger([
            'receiver_name',
            'phone',
            'province_code',
            'ward_code',
            'detail',
        ]);

        if (!isValid) {
            return;
        }

        onSaveAddress(getValues());
    };

    return (
        <form className="space-y-4" onSubmit={handleSubmit(onSubmitOrder)}>
            <div className="grid gap-4 md:grid-cols-2">
                <Input
                    label={translate('text.recipient')}
                    placeholder={translate('text.nguyen_van_a')}
                    error={errors.receiver_name?.message}
                    {...register('receiver_name')}
                />
                <Input
                    label={translate('text.phone_number')}
                    placeholder="0901234567"
                    error={errors.phone?.message}
                    {...register('phone')}
                />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Select
                    label={translate('text.province_city')}
                    error={errors.province_code?.message}
                    disabled={provincesQuery.isLoading}
                    {...provinceField}
                    onChange={(event) => {
                        provinceField.onChange(event);
                        setValue('ward_code', '', {
                            shouldDirty: true,
                            shouldValidate: true,
                        });
                    }}
                >
                    <option value="">{translate('text.select_province_city')}</option>
                    {provinces.map((province) => (
                        <option key={province.code} value={province.code}>
                            {province.name}
                        </option>
                    ))}
                </Select>

                <Select
                    label={translate('text.ward_commune')}
                    error={errors.ward_code?.message}
                    disabled={!selectedProvinceCode || wardsQuery.isLoading}
                    {...wardField}
                    onChange={(event) => {
                        wardField.onChange(event);
                        clearErrors('ward_code');
                    }}
                >
                    <option value="">{translate('text.select_ward_commune')}</option>
                    {wards.map((ward) => (
                        <option key={ward.code} value={ward.code}>
                            {ward.name}
                        </option>
                    ))}
                </Select>
            </div>

            <Input
                label={translate('text.specific_address')}
                placeholder={translate('text.house_number_name_of_street_alley_village_hamlet')}
                error={errors.detail?.message}
                {...register('detail')}
            />

            <div className="space-y-2">
                <p className="text-sm font-medium text-[var(--color-text-main)]">
                    {translate('text.payment_method')}
                </p>
                <input type="hidden" {...paymentMethodField} />
                <div
                    role="radiogroup"
                    aria-label={translate('text.payment_method')}
                    className="grid gap-2 sm:grid-cols-2"
                >
                    {paymentMethodOptions.map((option) => {
                        const isSelected = paymentMethod === option.value;
                        const label = translate(option.labelKey);

                        return (
                            <button
                                key={option.value}
                                type="button"
                                role="radio"
                                aria-checked={isSelected}
                                aria-label={label}
                                className={cn(
                                    'flex min-h-[52px] items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]',
                                    isSelected
                                        ? option.selectedClassName
                                        : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)] hover:bg-[var(--color-background)]'
                                )}
                                onClick={() =>
                                    setValue('payment_method', option.value, {
                                        shouldDirty: true,
                                        shouldValidate: true,
                                    })
                                }
                            >
                                <span
                                    className={cn(
                                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-md border',
                                        option.iconClassName
                                    )}
                                >
                                    <img
                                        src={option.imageSrc}
                                        alt=""
                                        aria-hidden="true"
                                        className="h-7 w-7 object-contain"
                                    />
                                </span>
                                <span className="min-w-0 flex-1 text-sm font-medium leading-5 text-[var(--color-text-main)]">
                                    {label}
                                </span>
                                {isSelected && (
                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
                                )}
                            </button>
                        );
                    })}
                </div>
                {isMomoSelected && (
                    <p className="rounded-md border border-[#a50064]/20 bg-[#a50064]/10 px-3 py-2 text-sm font-medium text-[#a50064]">
                        {translate('text.momo_payment_under_maintenance')}
                    </p>
                )}
                {!isMomoSelected && isSelectedPaymentDisabled && (
                    <p className="text-sm text-[var(--color-text-muted)]">
                        {translate('text.selected_payment_method_is_temporarily_unavailable')}
                    </p>
                )}
                {errors.payment_method?.message && (
                    <p className="text-sm text-[var(--color-error)]">
                        {errors.payment_method.message}
                    </p>
                )}
            </div>

            <Textarea
                label={translate('text.delivery_notes')}
                rows={4}
                error={errors.note?.message}
                {...register('note')}
            />

            <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                    type="submit"
                    isLoading={isOrdering}
                    disabled={isSelectedPaymentDisabled}
                >
                    {translate('text.payment_b41a92be')}
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    isLoading={isSaving}
                    onClick={handleSave}
                >
                    {selectedAddress ? translate('text.update_address') : translate('text.store_address')}
                </Button>
            </div>
        </form>
    );
}

export default function CheckoutPage() {
    const navigate = useNavigate();
    const cartQuery = useCart({
        include_items: true,
        format: 'detail',
    });
    const addressesQuery = useAddresses();
    const checkoutSettingsQuery = useCheckoutSettings();
    const validateCartMutation = useValidateCart();
    const applyDiscountMutation = useApplyCartDiscount();
    const removeDiscountMutation = useRemoveCartDiscount();
    const claimedDiscountsQuery = useClaimedDiscounts({
        status: 'available',
        limit: 20,
    });
    const createAddressMutation = useCreateAddress();
    const updateAddressMutation = useUpdateAddress();
    const createOrderMutation = useCreateOrder();
    const createPaymentMutation = useCreatePayment();
    const [selectedAddressId, setSelectedAddressId] = useState('');
    const [discountCode, setDiscountCode] = useState(() => {
        if (typeof window === 'undefined') {
            return '';
        }

        return window.localStorage.getItem(CLAIMED_DISCOUNT_CODE_KEY) || '';
    });
    const [notice, setNotice] = useState(null);
    const [discountNotice, setDiscountNotice] = useState(null);

    const cart = cartQuery.data?.data;
    const items = cart?.items || [];
    const totals = cart?.totals || {};
    const checkoutSettings = checkoutSettingsQuery.data?.data || {};
    const shippingFee = checkoutSettings.shipping_fee || 0;
    const baseShippingFee =
        checkoutSettings.base_shipping_fee ?? shippingFee;
    const shippingDiscountAmount =
        checkoutSettings.shipping_discount_amount || 0;
    const shippingDiscountPercent =
        checkoutSettings.shipping_discount_percent || 0;
    const shippingTier = checkoutSettings.tier || null;
    const claimedDiscounts = claimedDiscountsQuery.data?.data || [];
    const addresses = useMemo(
        () => addressesQuery.data?.data || [],
        [addressesQuery.data?.data]
    );
    const selectedAddress = useMemo(() => {
        if (selectedAddressId === 'new') {
            return null;
        }

        return (
            addresses.find((address) => address.id === selectedAddressId) ||
            addresses.find((address) => address.is_default) ||
            addresses[0] ||
            null
        );
    }, [addresses, selectedAddressId]);
    const isBusy =
        validateCartMutation.isPending ||
        createOrderMutation.isPending ||
        createPaymentMutation.isPending;

    const applyDiscountCode = async (rawCode) => {
        const code = String(rawCode || '').trim().toUpperCase();
        setNotice(null);
        setDiscountNotice(null);

        if (!code) {
            setDiscountNotice({
                type: 'error',
                message: translate('text.please_enter_discount_code'),
            });
            return;
        }

        try {
            await applyDiscountMutation.mutateAsync({ code });
            setDiscountCode('');
            window.localStorage.removeItem(CLAIMED_DISCOUNT_CODE_KEY);
            setDiscountNotice(null);
            setNotice({
                type: 'success',
                message: translate('text.discount_code_applied'),
            });
        } catch (error) {
            setDiscountNotice({
                type: 'error',
                message: error.message || translate('text.discount_code_cannot_be_applied'),
            });
        }
    };

    const handleApplyDiscount = async () => {
        await applyDiscountCode(discountCode);
    };

    const handleRemoveDiscount = async () => {
        setNotice(null);
        setDiscountNotice(null);

        try {
            await removeDiscountMutation.mutateAsync();
            setNotice({
                type: 'success',
                message: translate('text.discount_code_removed'),
            });
        } catch (error) {
            setNotice({
                type: 'error',
                message: error.message || translate('text.unable_to_remove_discount_code'),
            });
        }
    };

    const handleSaveAddress = async (values) => {
        setNotice(null);
        const payload = toAddressPayload(values);

        try {
            const response = selectedAddress
                ? await updateAddressMutation.mutateAsync({
                    addressId: selectedAddress.id,
                    payload,
                })
                : await createAddressMutation.mutateAsync(payload);

            setSelectedAddressId(response.data.id);
            setNotice({
                type: 'success',
                message: translate('text.shipping_address_saved'),
            });
        } catch (error) {
            setNotice({
                type: 'error',
                message: error.message || translate('text.unable_to_save_address'),
            });
        }
    };

    const handleSubmitOrder = async (values) => {
        setNotice(null);
        let createdOrder = null;
        const selectedProvider = onlinePaymentProviders[values.payment_method];
        const isOnlinePayment = Boolean(selectedProvider);

        if (values.payment_method === 'MOMO') {
            setNotice({
                type: 'error',
                message: translate('text.momo_payment_under_maintenance'),
            });
            return;
        }

        if (!cart?.id || items.length === 0) {
            setNotice({
                type: 'error',
                message: translate('text.shopping_cart_is_empty'),
            });
            return;
        }

        if (values.payment_method === 'VNPAY' && !ENV.VNPAY_CHECKOUT_ENABLED) {
            setNotice({
                type: 'error',
                message:
                    translate('text.vnpay_is_temporarily_disabled_because_the_website_has_not_been_approved_'),
            });
            return;
        }

        if (values.payment_method === 'PAYOS' && !ENV.PAYOS_CHECKOUT_ENABLED) {
            setNotice({
                type: 'error',
                message: translate('text.payos_is_temporarily_disabled'),
            });
            return;
        }

        if (values.payment_method === 'PAYPAL' && !ENV.PAYPAL_CHECKOUT_ENABLED) {
            setNotice({
                type: 'error',
                message: translate('text.paypal_is_temporarily_disabled'),
            });
            return;
        }

        try {
            const validation = await validateCartMutation.mutateAsync();
            if (validation.data?.isValid === false) {
                throw new Error(
                    validation.data.errors?.[0] || translate('text.shopping_cart_is_not_valid')
                );
            }

            const note = values.note?.trim() || undefined;
            const response = await createOrderMutation.mutateAsync({
                cart_id: cart.id,
                address_snapshot: toAddressSnapshot(values),
                payment_method: values.payment_method,
                customer_notes: note,
            });

            const order = response.data;
            createdOrder = order;

            if (isOnlinePayment) {
                const paymentResponse = await createPaymentMutation.mutateAsync({
                    order_id: order.id,
                    provider: selectedProvider,
                });
                const paymentData = paymentResponse.data;
                const paymentUrl =
                    paymentData?.paymentUrl ||
                    paymentData?.payment_url ||
                    paymentData?.redirectUrl ||
                    paymentData?.redirect_url;

                if (!paymentUrl) {
                    throw new Error(translate('text.payment_url_was_not_returned'));
                }

                window.location.assign(paymentUrl);
                return;
            }

            navigate(
                `${ROUTES.CHECKOUT_SUCCESS}?order_id=${order.id}&order_code=${order.order_code}`,
                {
                    replace: true,
                    state: { order },
                }
            );
        } catch (error) {
            if (error.raw?.code === 'VNPAY_CHECKOUT_DISABLED') {
                setNotice({
                    type: 'error',
                    message:
                        translate('text.vnpay_is_temporarily_disabled_because_the_website_has_not_been_approved_'),
                });
                return;
            }

            if (error.raw?.code === 'PAYOS_CHECKOUT_DISABLED') {
                setNotice({
                    type: 'error',
                    message: translate('text.payos_is_temporarily_disabled'),
                });
                return;
            }

            if (error.raw?.code === 'PAYPAL_CHECKOUT_DISABLED') {
                setNotice({
                    type: 'error',
                    message: translate('text.paypal_is_temporarily_disabled'),
                });
                return;
            }

            if (isOnlinePayment) {
                const params = new URLSearchParams({
                    status: 'failed',
                    code: error.raw?.code || error.status?.toString() || 'CREATE_PAYMENT_FAILED',
                    provider: selectedProvider,
                });

                if (createdOrder?.id) {
                    params.set('order_id', createdOrder.id);
                }

                navigate(`${ROUTES.PAYMENT_RETURN}?${params.toString()}`, {
                    replace: true,
                    state: {
                        message:
                            error.message ||
                            translate('text.unable_to_initiate_online_payment'),
                    },
                });
                return;
            }

            navigate(ROUTES.CHECKOUT_FAIL, {
                replace: true,
                state: {
                    message: error.message || translate('text.unable_to_create_order'),
                },
            });
        }
    };

    if (
        cartQuery.isLoading ||
        addressesQuery.isLoading ||
        checkoutSettingsQuery.isLoading
    ) {
        return (
            <Card>
                <CardBody>
                    <Loading label={translate('text.loading_checkout')} />
                </CardBody>
            </Card>
        );
    }

    if (cartQuery.isError || checkoutSettingsQuery.isError) {
        return (
            <EmptyState
                title={translate('text.unable_to_load_shopping_cart')}
                description={
                    cartQuery.error?.message ||
                    checkoutSettingsQuery.error?.message
                }
                actionLabel={translate('text.return_to_cart')}
                onAction={() => navigate(ROUTES.CART)}
            />
        );
    }

    if (items.length === 0) {
        return (
            <EmptyState
                title={translate('text.cart_is_empty')}
                description={translate('text.add_product_to_cart_before_checkout')}
                actionLabel={translate('text.view_product')}
                onAction={() => navigate(ROUTES.PRODUCTS)}
            />
        );
    }

    return (
        <div className="space-y-6">
            <Link
                to={ROUTES.CART}
                className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-primary-hover)] hover:text-[var(--color-primary)]"
            >
                <ArrowLeft className="h-4 w-4" /> {translate('text.return_to_cart')} </Link>

            <div>
                <p className="text-sm font-medium text-[var(--color-primary-hover)]"> {translate('text.checkout')} </p>
                <h1 className="mt-1 text-3xl font-semibold text-[var(--color-text-main)]"> {translate('text.create_order')} </h1>
                <p className="mt-2 text-sm text-[var(--color-text-muted)]"> {translate('text.check_your_shopping_cart_shipping_address_discount_code_and_payment_meth')} </p>
            </div>

            {notice && (
                <p
                    className={
                        notice.type === 'success'
                            ? 'rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700'
                            : 'rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-[var(--color-error)]'
                    }
                >
                    {notice.message}
                </p>
            )}

            <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-[var(--color-primary)]" />
                                    <h2 className="font-semibold text-[var(--color-text-main)]"> {translate('text.delivery_address')} </h2>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedAddressId('new')}
                                > {translate('text.enter_new_address')} </Button>
                            </div>
                        </CardHeader>
                        <CardBody className="space-y-5">
                            {addresses.length > 0 && (
                                <div className="grid gap-3 md:grid-cols-2">
                                    {addresses.map((address) => (
                                        <button
                                            type="button"
                                            key={address.id}
                                            className={
                                                selectedAddress?.id === address.id
                                                    ? 'rounded-lg border border-[var(--color-primary)] bg-[var(--color-secondary)] p-4 text-left'
                                                    : 'rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-left transition-colors hover:border-[var(--color-primary)]'
                                            }
                                            onClick={() => setSelectedAddressId(address.id)}
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <p className="font-semibold text-[var(--color-text-main)]">
                                                    {address.receiver_name}
                                                </p>
                                                {address.is_default && (
                                                    <span className="text-xs font-medium text-[var(--color-primary-hover)]"> {translate('text.default')} </span>
                                                )}
                                            </div>
                                            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                                                {address.phone}
                                            </p>
                                            <p className="mt-2 text-sm text-[var(--color-text-main)]">
                                                {formatAddress(address)}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            )}

                            <AddressForm
                                key={selectedAddress?.id || 'new-address'}
                                selectedAddress={selectedAddress}
                                onSaveAddress={handleSaveAddress}
                                onSubmitOrder={handleSubmitOrder}
                                isSaving={
                                    createAddressMutation.isPending ||
                                    updateAddressMutation.isPending
                                }
                                isOrdering={isBusy}
                                isVNPayEnabled={ENV.VNPAY_CHECKOUT_ENABLED}
                                isPayPalEnabled={ENV.PAYPAL_CHECKOUT_ENABLED}
                                isPayOSEnabled={ENV.PAYOS_CHECKOUT_ENABLED}
                            />
                        </CardBody>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <h2 className="font-semibold text-[var(--color-text-main)]"> {translate('text.cart_summary')} </h2>
                        </CardHeader>
                        <CardBody className="space-y-4">
                            <div className="space-y-3">
                                {items.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex justify-between gap-4 text-sm"
                                    >
                                        <div>
                                            <p className="font-medium text-[var(--color-text-main)]">
                                                {item.product_name}
                                            </p>
                                            <p className="text-[var(--color-text-muted)]">
                                                {item.quantity_packs || item.quantity || 1} {translate('text.package_x')} {formatCurrency(item.price_at_added || 0)}
                                            </p>
                                            {item.is_on_sale && (
                                                <p className="text-xs text-[var(--color-text-muted)] line-through">
                                                    {formatCurrency(
                                                        item.original_price_at_added ||
                                                        item.price_at_added ||
                                                        0
                                                    )}
                                                </p>
                                            )}
                                        </div>
                                        <span className="font-medium text-[var(--color-text-main)]">
                                            {formatCurrency(item.line_total || 0)}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t border-[var(--color-border)] pt-4">
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between gap-4">
                                        <span className="text-[var(--color-text-muted)]"> {translate('text.temporary')} </span>
                                        <span>{formatCurrency(totals.subtotal || 0)}</span>
                                    </div>
                                    {totals.promotion_discount_amount > 0 && (
                                        <div className="flex justify-between gap-4">
                                            <span className="text-[var(--color-text-muted)]">
                                                {translate('text.product_promotion')}
                                            </span>
                                            <span className="text-[var(--color-error)]">
                                                -{formatCurrency(
                                                    totals.promotion_discount_amount
                                                )}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex justify-between gap-4">
                                        <span className="text-[var(--color-text-muted)]"> {translate('text.voucher_discount')} </span>
                                        <span>{formatCurrency(totals.discount_amount || 0)}</span>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                        <span className="text-[var(--color-text-muted)]"> {translate('text.shipping_fee')} </span>
                                        <span>{formatCurrency(baseShippingFee)}</span>
                                    </div>
                                    {shippingDiscountAmount > 0 && (
                                        <div className="flex justify-between gap-4">
                                            <span className="text-[var(--color-text-muted)]">
                                                Giảm ship hạng {shippingTier}
                                                {shippingDiscountPercent
                                                    ? ` (${shippingDiscountPercent}%)`
                                                    : ''}
                                            </span>
                                            <span className="text-[var(--color-error)]">
                                                -{formatCurrency(shippingDiscountAmount)}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex justify-between gap-4">
                                        <span className="text-[var(--color-text-muted)]"> {translate('text.current_total')} </span>
                                        <span className="font-semibold text-[var(--color-primary-hover)]">
                                            {formatCurrency((totals.total || 0) + shippingFee)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <TicketPercent className="h-4 w-4 text-[var(--color-primary)]" />
                                <h2 className="font-semibold text-[var(--color-text-main)]"> {translate('text.discount_code')} </h2>
                            </div>
                        </CardHeader>
                        <CardBody className="space-y-4">
                            {cart.discount ? (
                                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-[var(--color-text-main)]">
                                                {cart.discount.code}
                                            </p>
                                            <p className="text-sm text-[var(--color-text-muted)]"> {translate('text.discounted')} {formatCurrency(cart.discount.discount_amount || 0)}
                                            </p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            isLoading={removeDiscountMutation.isPending}
                                            onClick={handleRemoveDiscount}
                                        > {translate('text.remove')} </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {claimedDiscountsQuery.isLoading ? (
                                        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text-muted)]"> {translate('text.loading_your_voucher')} </div>
                                    ) : claimedDiscounts.length > 0 ? (
                                        <div className="space-y-2">
                                            <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]"> {translate('text.your_voucher')} </p>
                                            <div className="space-y-2">
                                                {claimedDiscounts.slice(0, 4).map((claim) => (
                                                    <button
                                                        key={claim.claim_id || claim.id}
                                                        type="button"
                                                        disabled={applyDiscountMutation.isPending}
                                                        onClick={() => applyDiscountCode(claim.code)}
                                                        className="flex w-full items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-3 text-left transition-colors hover:border-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                                                    >
                                                        <span className="min-w-0">
                                                            <span className="block truncate font-semibold text-[var(--color-text-main)]">
                                                                {claim.code}
                                                            </span>
                                                            <span className="mt-1 block text-xs text-[var(--color-text-muted)]"> {translate('text.reduce')} {formatClaimedDiscountValue(claim)}
                                                                {claim.discount?.min_order_value
                                                                    ? translate('text.single_word_value', { value0: formatCurrency(claim.discount.min_order_value) })
                                                                    : ''}
                                                            </span>
                                                        </span>
                                                        <span className="shrink-0 text-xs font-semibold text-[var(--color-primary-hover)]"> {translate('text.use')} </span>
                                                    </button>
                                                ))}
                                            </div>
                                            <Link
                                                to={ROUTES.PROFILE_VOUCHERS}
                                                className="inline-flex text-xs font-semibold text-[var(--color-primary-hover)] hover:text-[var(--color-primary)]"
                                            > {translate('text.view_all_vouchers')} </Link>
                                        </div>
                                    ) : null}

                                    <div className="flex gap-2">
                                        <Input
                                            placeholder={translate('text.enter_discount_code')}
                                            value={discountCode}
                                            onChange={(event) =>
                                                setDiscountCode(event.target.value)
                                            }
                                        />
                                        <Button
                                            type="button"
                                            isLoading={applyDiscountMutation.isPending}
                                            onClick={handleApplyDiscount}
                                        > {translate('text.apply')} </Button>
                                    </div>
                                </div>
                            )}
                            {discountNotice && (
                                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--color-error)]">
                                    {discountNotice.message}
                                </p>
                            )}
                        </CardBody>
                    </Card>

                    <Card>
                        <CardBody>
                            <div className="flex items-start gap-3">
                                <CreditCard className="mt-0.5 h-5 w-5 text-[var(--color-primary)]" />
                                <div>
                                    <p className="font-semibold text-[var(--color-text-main)]"> {translate('text.cod_and_online_payment')} </p>
                                    <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                                        {ENV.VNPAY_CHECKOUT_ENABLED || ENV.PAYPAL_CHECKOUT_ENABLED || ENV.PAYOS_CHECKOUT_ENABLED
                                            ? translate('text.cod_creates_orders_directly_online_payment_will_redirect_to_the_selected_provider')
                                            : translate('text.online_payment_is_temporarily_disabled')}
                                    </p>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                </div>
            </div>
        </div>
    );
}
