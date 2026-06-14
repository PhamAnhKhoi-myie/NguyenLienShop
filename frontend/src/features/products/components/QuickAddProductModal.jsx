import { translate } from '../../../shared/i18n/index';
import {
    CheckCircle2,
    Minus,
    PackageOpen,
    Plus,
    ShoppingCart,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../../shared/components/Button';
import Loading from '../../../shared/components/Loading';
import Modal from '../../../shared/components/Modal';
import { ROUTES } from '../../../shared/constants/routes';
import { cn } from '../../../shared/utils/cn';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { useAddCartItem } from '../../cart/hooks/useCart';
import { useProductDetail } from '../hooks/useProducts';
import {
    calculateOrderTotal,
    calculateOriginalOrderTotal,
    findTierForQuantity,
    getTierOriginalUnitPrice,
    getTierUnitPrice,
} from '../utils/pricing';

export default function QuickAddProductModal({
    open,
    product,
    mode = 'cart',
    onClose,
}) {
    const navigate = useNavigate();
    const isBuyNow = mode === 'buy-now';
    const productQuery = useProductDetail(
        open ? product?.id : null,
        { include_units: true }
    );
    const addCartItemMutation = useAddCartItem();
    const detail = productQuery.data?.data;
    const variants = useMemo(
        () =>
            (detail?.variants || []).filter(
                (variant) => variant.status === 'ACTIVE'
            ),
        [detail?.variants]
    );
    const [selectedVariantId, setSelectedVariantId] = useState('');
    const [selectedUnitId, setSelectedUnitId] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [notice, setNotice] = useState(null);

    const selectedVariant = useMemo(
        () =>
            variants.find((variant) => variant.id === selectedVariantId) ||
            variants.find((variant) => variant.in_stock) ||
            variants[0],
        [selectedVariantId, variants]
    );
    const units = useMemo(
        () => selectedVariant?.units || [],
        [selectedVariant?.units]
    );
    const selectedUnit = useMemo(
        () =>
            units.find((unit) => unit.id === selectedUnitId) ||
            units.find((unit) => unit.is_default) ||
            units[0],
        [selectedUnitId, units]
    );
    const minQuantity = Number(selectedUnit?.min_order_qty || 1);
    const quantityStep = Number(selectedUnit?.qty_step || 1);
    const availableItems = Math.max(
        0,
        Number(selectedVariant?.stock?.available || 0)
    );
    const availableQuantity =
        selectedUnit?.pack_size > 0
            ? Math.floor(
                  availableItems / Number(selectedUnit.pack_size)
              )
            : 0;
    const maxQuantity = Math.min(
        Number(selectedUnit?.max_order_qty || 999),
        availableQuantity
    );
    const cartQuantity = Math.min(
        maxQuantity,
        Math.max(minQuantity, quantity)
    );
    const selectedTier = findTierForQuantity(selectedUnit, cartQuantity);
    const selectedUnitPrice = getTierUnitPrice(selectedTier);
    const selectedOriginalUnitPrice = getTierOriginalUnitPrice(selectedTier);
    const orderTotal = calculateOrderTotal(selectedTier, cartQuantity);
    const originalOrderTotal = calculateOriginalOrderTotal(
        selectedTier,
        cartQuantity
    );
    const canSubmit = Boolean(
        detail?.id &&
            selectedVariant?.id &&
            selectedUnit?.id &&
            detail.in_stock &&
            selectedVariant.in_stock &&
            maxQuantity >= minQuantity &&
            !addCartItemMutation.isPending
    );

    const handleClose = () => {
        setSelectedVariantId('');
        setSelectedUnitId('');
        setQuantity(1);
        setNotice(null);
        addCartItemMutation.reset();
        onClose();
    };

    const handleSelectVariant = (variantId) => {
        setSelectedVariantId(variantId);
        setSelectedUnitId('');
        setQuantity(1);
        setNotice(null);
    };

    const handleSelectUnit = (unit) => {
        setSelectedUnitId(unit.id);
        setQuantity(Number(unit.min_order_qty || 1));
        setNotice(null);
    };

    const handleSubmit = async () => {
        setNotice(null);

        try {
            await addCartItemMutation.mutateAsync({
                product_id: detail.id,
                variant_id: selectedVariant.id,
                unit_id: selectedUnit.id,
                quantity: cartQuantity,
            });

            if (isBuyNow) {
                navigate(ROUTES.CHECKOUT);
                return;
            }

            setNotice({
                type: 'success',
                message: translate('text.product_added_to_cart'),
            });
        } catch (error) {
            setNotice({
                type: 'error',
                message:
                    error.message ||
                    translate('text.unable_to_add_product_to_cart'),
            });
        }
    };

    const footer = notice?.type === 'success' ? (
        <>
            <Button variant="outline" onClick={handleClose}>
                {translate('text.continue_shopping')}
            </Button>
            <Button onClick={() => navigate(ROUTES.CART)}>
                <ShoppingCart className="h-4 w-4" />
                {translate('text.view_cart')}
            </Button>
        </>
    ) : (
        <>
            <Button variant="outline" onClick={handleClose}>
                {translate('text.close')}
            </Button>
            <Button
                disabled={!canSubmit}
                isLoading={addCartItemMutation.isPending}
                onClick={handleSubmit}
            >
                {!isBuyNow && <ShoppingCart className="h-4 w-4" />}
                {isBuyNow
                    ? translate('text.buy_now')
                    : translate('text.add_to_cart')}
            </Button>
        </>
    );

    return (
        <Modal
            open={open}
            title={
                isBuyNow
                    ? translate('text.buy_now')
                    : translate('text.quick_add_to_cart')
            }
            onClose={handleClose}
            panelClassName="max-w-2xl"
            footer={footer}
        >
            {productQuery.isLoading && (
                <Loading label={translate('text.loading_product_details')} />
            )}

            {productQuery.isError && (
                <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-[var(--color-error)]">
                    {productQuery.error.message}
                </p>
            )}

            {!productQuery.isLoading && !productQuery.isError && detail && (
                <div className="space-y-4">
                    <div>
                        <h3 className="font-semibold text-[var(--color-text-main)]">
                            {detail.name}
                        </h3>
                        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                            {translate('text.select_product_options')}
                        </p>
                    </div>

                    {variants.length === 0 ? (
                        <div className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] p-4 text-sm text-[var(--color-text-muted)]">
                            <PackageOpen className="h-5 w-5" />
                            {translate('text.product_has_no_variations_yet')}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-[var(--color-text-main)]">
                                {translate('text.fabric_type')}
                            </p>
                            <div className="grid gap-2 sm:grid-cols-2">
                                {variants.map((variant) => (
                                    <button
                                        key={variant.id}
                                        type="button"
                                        disabled={!variant.in_stock}
                                        className={cn(
                                            'rounded-md border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                                            selectedVariant?.id === variant.id
                                                ? 'border-[var(--color-primary)] bg-[var(--color-secondary)]'
                                                : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'
                                        )}
                                        onClick={() =>
                                            handleSelectVariant(variant.id)
                                        }
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="font-medium text-[var(--color-text-main)]">
                                                    {variant.size ||
                                                        translate(
                                                            'text.updating_dimension'
                                                        )}
                                                </p>
                                                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                                                    {variant.fabric_type ||
                                                        translate(
                                                            'text.material_is_updating'
                                                        )}
                                                </p>
                                            </div>
                                            {selectedVariant?.id ===
                                                variant.id && (
                                                <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {selectedVariant && (
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-[var(--color-text-main)]">
                                {translate('text.unit')}
                            </p>
                            <div className="grid gap-2 sm:grid-cols-2">
                                {units.map((unit) => (
                                    <button
                                        key={unit.id}
                                        type="button"
                                        className={cn(
                                            'rounded-md border px-3 py-2.5 text-left transition-colors',
                                            selectedUnit?.id === unit.id
                                                ? 'border-[var(--color-primary)] bg-[var(--color-secondary)]'
                                                : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'
                                        )}
                                        onClick={() =>
                                            handleSelectUnit(unit)
                                        }
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="font-medium text-[var(--color-text-main)]">
                                                    {unit.display_name}
                                                </p>
                                                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                                                    {translate(
                                                        'text.value_items',
                                                        {
                                                            value0:
                                                                unit.pack_size,
                                                        }
                                                    )}
                                                    {' '}
                                                    {translate('text.package')}
                                                </p>
                                            </div>
                                            {selectedUnit?.id === unit.id && (
                                                <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {selectedUnit && (
                        <div className="grid gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                            <div>
                                <p className="text-sm font-medium text-[var(--color-text-main)]">
                                    {translate('text.number_of_packages')}
                                </p>
                                <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                                    {translate('text.minimum')} {minQuantity}{' '}
                                    {translate('text.package_08ffada9')}
                                    {selectedUnit.max_order_qty
                                        ? translate('text.maximum_value_package', {
                                            value0: selectedUnit.max_order_qty,
                                        })
                                        : ''}
                                </p>
                                <p
                                    className={cn(
                                        'mt-1 text-xs font-medium',
                                        availableQuantity > 0
                                            ? 'text-[var(--color-primary-hover)]'
                                            : 'text-[var(--color-error)]'
                                    )}
                                >
                                    {translate('text.remaining')} {availableQuantity}{' '}
                                    {translate('text.package_08ffada9')}
                                    {selectedUnit.pack_size > 1 && (
                                        <span className="font-normal text-[var(--color-text-muted)]">
                                            {' '}
                                            ({translate('text.value_items', {
                                                value0: availableItems,
                                            })})
                                        </span>
                                    )}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={
                                        cartQuantity <= minQuantity ||
                                        addCartItemMutation.isPending
                                    }
                                    onClick={() =>
                                        setQuantity(
                                            Math.max(
                                                minQuantity,
                                                cartQuantity - quantityStep
                                            )
                                        )
                                    }
                                    aria-label={translate(
                                        'text.reduce_quantity'
                                    )}
                                >
                                    <Minus className="h-4 w-4" />
                                </Button>
                                <span className="flex h-9 min-w-14 items-center justify-center rounded-md border border-[var(--color-border)] px-3 text-sm font-semibold">
                                    {cartQuantity}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={
                                        cartQuantity >= maxQuantity ||
                                        addCartItemMutation.isPending
                                    }
                                    onClick={() =>
                                        setQuantity(
                                            Math.min(
                                                maxQuantity,
                                                cartQuantity + quantityStep
                                            )
                                        )
                                    }
                                    aria-label={translate(
                                        'text.increase_quantity'
                                    )}
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {selectedUnit && (
                        <div className="rounded-md border border-green-200 bg-green-50 p-3">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-[var(--color-text-main)]">
                                        {translate('text.temporary')}
                                    </p>
                                    {selectedTier && (
                                        <p className="mt-0.5 text-xs text-green-700">
                                            {cartQuantity}{' '}
                                            {translate('text.package_08ffada9')} x{' '}
                                            {selectedOriginalUnitPrice >
                                                selectedUnitPrice && (
                                                <span className="mr-1 text-[var(--color-text-muted)] line-through">
                                                    {formatCurrency(
                                                        selectedOriginalUnitPrice,
                                                        selectedUnit.currency ||
                                                            'VND'
                                                    )}
                                                </span>
                                            )}
                                            {formatCurrency(
                                                selectedUnitPrice,
                                                selectedUnit.currency || 'VND'
                                            )}
                                            /{translate('text.package_08ffada9')}
                                        </p>
                                    )}
                                </div>
                                <div className="sm:text-right">
                                    {originalOrderTotal > orderTotal && (
                                        <p className="text-xs text-[var(--color-text-muted)] line-through">
                                            {formatCurrency(
                                                originalOrderTotal,
                                                selectedUnit.currency || 'VND'
                                            )}
                                        </p>
                                    )}
                                    <p className="text-xl font-semibold text-[var(--color-primary-hover)]">
                                        {selectedTier
                                            ? formatCurrency(
                                                orderTotal,
                                                selectedUnit.currency || 'VND'
                                            )
                                            : translate('text.updating')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

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
                </div>
            )}
        </Modal>
    );
}
