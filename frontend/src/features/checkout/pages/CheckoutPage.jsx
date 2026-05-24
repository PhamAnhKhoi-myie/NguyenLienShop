import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, CreditCard, MapPin, TicketPercent } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import Button from '../../../shared/components/Button';
import Card, { CardBody, CardHeader } from '../../../shared/components/Card';
import EmptyState from '../../../shared/components/EmptyState';
import Input from '../../../shared/components/Input';
import Loading from '../../../shared/components/Loading';
import Select from '../../../shared/components/Select';
import Textarea from '../../../shared/components/Textarea';
import { ROUTES } from '../../../shared/constants/routes';
import { useProvinces, useWards } from '../../../shared/hooks/useLocations';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import {
    useApplyCartDiscount,
    useCart,
    useRemoveCartDiscount,
    useValidateCart,
} from '../../cart/hooks/useCart';
import { useCreatePayment } from '../../payments/hooks/usePayments';
import {
    useAddresses,
    useCreateAddress,
    useCreateOrder,
    useUpdateAddress,
} from '../hooks/useCheckout';

const addressFormSchema = z.object({
    receiver_name: z.string().trim().min(2, 'Vui lòng nhập tên người nhận'),
    phone: z
        .string()
        .trim()
        .regex(/^(0|\+84)[0-9]{9}$/, 'Số điện thoại không hợp lệ'),
    province_code: z.string().trim().min(1, 'Vui lòng chọn tỉnh/thành'),
    ward_code: z.string().trim().min(1, 'Vui lòng chọn phường/xã'),
    detail: z.string().trim().min(5, 'Địa chỉ cụ thể tối thiểu 5 ký tự'),
    note: z.string().trim().max(500, 'Ghi chú tối đa 500 ký tự').optional(),
    shipping_fee: z.coerce.number().min(0, 'Phí vận chuyển không hợp lệ'),
    payment_method: z.enum(['COD', 'VNPAY']),
});

const emptyAddressValues = {
    receiver_name: '',
    phone: '',
    province_code: '',
    ward_code: '',
    detail: '',
    note: '',
    shipping_fee: 0,
    payment_method: 'COD',
};

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

function AddressForm({
    selectedAddress,
    onSaveAddress,
    onSubmitOrder,
    isSaving,
    isOrdering,
}) {
    const {
        register,
        handleSubmit,
        getValues,
        trigger,
        watch,
        setValue,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(addressFormSchema),
        defaultValues: toFormValues(selectedAddress),
    });

    const [paymentMethod, setPaymentMethod] = useState('COD');
    const selectedProvinceCode = watch('province_code');
    const provincesQuery = useProvinces();
    const wardsQuery = useWards(selectedProvinceCode);
    const provinces = provincesQuery.data?.data || [];
    const wards = wardsQuery.data?.data || [];
    const provinceField = register('province_code');
    const wardField = register('ward_code');
    const paymentMethodField = register('payment_method');

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
                    label="Người nhận"
                    placeholder="Nguyễn Văn A"
                    error={errors.receiver_name?.message}
                    {...register('receiver_name')}
                />
                <Input
                    label="Số điện thoại"
                    placeholder="0901234567"
                    error={errors.phone?.message}
                    {...register('phone')}
                />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Select
                    label="Tỉnh / Thành phố"
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
                    <option value="">Chọn tỉnh/thành</option>
                    {provinces.map((province) => (
                        <option key={province.code} value={province.code}>
                            {province.name}
                        </option>
                    ))}
                </Select>

                <Select
                    label="Phường / Xã"
                    error={errors.ward_code?.message}
                    disabled={!selectedProvinceCode || wardsQuery.isLoading}
                    {...wardField}
                >
                    <option value="">Chọn phường/xã</option>
                    {wards.map((ward) => (
                        <option key={ward.code} value={ward.code}>
                            {ward.name}
                        </option>
                    ))}
                </Select>
            </div>

            <Input
                label="Địa chỉ cụ thể"
                placeholder="Số nhà, tên đường, hẻm, thôn/ấp"
                error={errors.detail?.message}
                {...register('detail')}
            />

            <div className="grid gap-4 md:grid-cols-2">
                <Input
                    label="Phí vận chuyển"
                    type="number"
                    min="0"
                    error={errors.shipping_fee?.message}
                    {...register('shipping_fee')}
                />
                <Select
                    label="Thanh toán"
                    error={errors.payment_method?.message}
                    {...paymentMethodField}
                    onChange={(event) => {
                        paymentMethodField.onChange(event);
                        setPaymentMethod(event.target.value);
                    }}
                >
                    <option value="COD">COD</option>
                    <option value="VNPAY">VNPAY</option>
                </Select>
            </div>

            <Textarea
                label="Ghi chú giao hàng"
                rows={4}
                error={errors.note?.message}
                {...register('note')}
            />

            <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="submit" isLoading={isOrdering}>
                    {paymentMethod === 'VNPAY'
                        ? 'Thanh toán VNPAY'
                        : 'Đặt hàng COD'}
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    isLoading={isSaving}
                    onClick={handleSave}
                >
                    {selectedAddress ? 'Cập nhật địa chỉ' : 'Lưu địa chỉ'}
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
    const validateCartMutation = useValidateCart();
    const applyDiscountMutation = useApplyCartDiscount();
    const removeDiscountMutation = useRemoveCartDiscount();
    const createAddressMutation = useCreateAddress();
    const updateAddressMutation = useUpdateAddress();
    const createOrderMutation = useCreateOrder();
    const createPaymentMutation = useCreatePayment();
    const [selectedAddressId, setSelectedAddressId] = useState('');
    const [discountCode, setDiscountCode] = useState('');
    const [notice, setNotice] = useState(null);

    const cart = cartQuery.data?.data;
    const items = cart?.items || [];
    const totals = cart?.totals || {};
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

    const handleApplyDiscount = async () => {
        const code = discountCode.trim().toUpperCase();
        setNotice(null);

        if (!code) {
            setNotice({
                type: 'error',
                message: 'Vui lòng nhập mã giảm giá.',
            });
            return;
        }

        try {
            await applyDiscountMutation.mutateAsync({ code });
            setDiscountCode('');
            setNotice({
                type: 'success',
                message: 'Đã áp dụng mã giảm giá.',
            });
        } catch (error) {
            setNotice({
                type: 'error',
                message: error.message || 'Không áp dụng được mã giảm giá.',
            });
        }
    };

    const handleRemoveDiscount = async () => {
        setNotice(null);

        try {
            await removeDiscountMutation.mutateAsync();
            setNotice({
                type: 'success',
                message: 'Đã gỡ mã giảm giá.',
            });
        } catch (error) {
            setNotice({
                type: 'error',
                message: error.message || 'Không gỡ được mã giảm giá.',
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
                message: 'Đã lưu địa chỉ giao hàng.',
            });
        } catch (error) {
            setNotice({
                type: 'error',
                message: error.message || 'Không lưu được địa chỉ.',
            });
        }
    };

    const handleSubmitOrder = async (values) => {
        setNotice(null);
        let createdOrder = null;
        const isVNPay = values.payment_method === 'VNPAY';

        if (!cart?.id || items.length === 0) {
            setNotice({
                type: 'error',
                message: 'Giỏ hàng đang trống.',
            });
            return;
        }

        try {
            const validation = await validateCartMutation.mutateAsync();
            if (validation.data?.isValid === false) {
                throw new Error(
                    validation.data.errors?.[0] || 'Giỏ hàng chưa hợp lệ.'
                );
            }

            const shippingFee = Number(values.shipping_fee || 0);
            const note = values.note?.trim() || undefined;
            const response = await createOrderMutation.mutateAsync({
                cart_id: cart.id,
                address_snapshot: toAddressSnapshot(values),
                shipping_fee: shippingFee,
                payment_method: values.payment_method,
                customer_notes: note,
                currency: 'VND',
            });

            const order = response.data;
            createdOrder = order;

            if (isVNPay) {
                const paymentResponse = await createPaymentMutation.mutateAsync({
                    order_id: order.id,
                    provider: 'vnpay',
                });
                const paymentData = paymentResponse.data;
                const paymentUrl =
                    paymentData?.paymentUrl ||
                    paymentData?.payment_url ||
                    paymentData?.redirectUrl ||
                    paymentData?.redirect_url;

                if (!paymentUrl) {
                    throw new Error('BE chưa trả payment URL VNPAY.');
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
            if (isVNPay) {
                const params = new URLSearchParams({
                    status: 'failed',
                    code: error.raw?.code || error.status?.toString() || 'CREATE_PAYMENT_FAILED',
                });

                if (createdOrder?.id) {
                    params.set('order_id', createdOrder.id);
                }

                navigate(`${ROUTES.PAYMENT_RETURN}?${params.toString()}`, {
                    replace: true,
                    state: {
                        message:
                            error.message ||
                            'Không khởi tạo được thanh toán VNPAY.',
                    },
                });
                return;
            }

            navigate(ROUTES.CHECKOUT_FAIL, {
                replace: true,
                state: {
                    message: error.message || 'Không tạo được đơn hàng.',
                },
            });
        }
    };

    if (cartQuery.isLoading || addressesQuery.isLoading) {
        return (
            <Card>
                <CardBody>
                    <Loading label="Đang tải checkout..." />
                </CardBody>
            </Card>
        );
    }

    if (cartQuery.isError) {
        return (
            <EmptyState
                title="Không tải được giỏ hàng"
                description={cartQuery.error.message}
                actionLabel="Quay lại giỏ hàng"
                onAction={() => navigate(ROUTES.CART)}
            />
        );
    }

    if (items.length === 0) {
        return (
            <EmptyState
                title="Giỏ hàng đang trống"
                description="Thêm sản phẩm vào giỏ trước khi checkout."
                actionLabel="Xem sản phẩm"
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
                <ArrowLeft className="h-4 w-4" />
                Quay lại giỏ hàng
            </Link>

            <div>
                <p className="text-sm font-medium text-[var(--color-primary-hover)]">
                    Checkout
                </p>
                <h1 className="mt-1 text-3xl font-semibold text-[var(--color-text-main)]">
                    Tạo đơn hàng
                </h1>
                <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                    Kiểm tra giỏ hàng, địa chỉ giao hàng, mã giảm giá và phương thức thanh toán trước khi tạo đơn.
                </p>
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
                                    <h2 className="font-semibold text-[var(--color-text-main)]">
                                        Địa chỉ giao hàng
                                    </h2>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedAddressId('new')}
                                >
                                    Nhập địa chỉ mới
                                </Button>
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
                                                    <span className="text-xs font-medium text-[var(--color-primary-hover)]">
                                                        Mặc định
                                                    </span>
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
                            />
                        </CardBody>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <h2 className="font-semibold text-[var(--color-text-main)]">
                                Tóm tắt giỏ hàng
                            </h2>
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
                                                {item.quantity_packs || item.quantity || 1} gói x {formatCurrency(item.price_at_added || 0)}
                                            </p>
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
                                        <span className="text-[var(--color-text-muted)]">
                                            Tạm tính
                                        </span>
                                        <span>{formatCurrency(totals.subtotal || 0)}</span>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                        <span className="text-[var(--color-text-muted)]">
                                            Giảm giá
                                        </span>
                                        <span>{formatCurrency(totals.discount_amount || 0)}</span>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                        <span className="text-[var(--color-text-muted)]">
                                            Tổng hiện tại
                                        </span>
                                        <span className="font-semibold text-[var(--color-primary-hover)]">
                                            {formatCurrency(totals.total || 0)}
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
                                <h2 className="font-semibold text-[var(--color-text-main)]">
                                    Mã giảm giá
                                </h2>
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
                                            <p className="text-sm text-[var(--color-text-muted)]">
                                                Đã giảm {formatCurrency(cart.discount.discount_amount || 0)}
                                            </p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            isLoading={removeDiscountMutation.isPending}
                                            onClick={handleRemoveDiscount}
                                        >
                                            Gỡ
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Nhập mã giảm giá"
                                        value={discountCode}
                                        onChange={(event) =>
                                            setDiscountCode(event.target.value)
                                        }
                                    />
                                    <Button
                                        type="button"
                                        isLoading={applyDiscountMutation.isPending}
                                        onClick={handleApplyDiscount}
                                    >
                                        Áp dụng
                                    </Button>
                                </div>
                            )}
                            <p className="text-xs text-[var(--color-text-muted)]">
                                Giảm giá sẽ được kiểm tra lại khi tạo đơn.
                            </p>
                        </CardBody>
                    </Card>

                    <Card>
                        <CardBody>
                            <div className="flex items-start gap-3">
                                <CreditCard className="mt-0.5 h-5 w-5 text-[var(--color-primary)]" />
                                <div>
                                    <p className="font-semibold text-[var(--color-text-main)]">
                                        COD và VNPAY
                                    </p>
                                    <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                                        COD tạo đơn trực tiếp. VNPAY sẽ tạo đơn trước rồi chuyển sang cổng thanh toán do BE trả về.
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
