import { translate } from '../../../shared/i18n/index';
import { Minus, PackageOpen, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import Button from '../../../shared/components/Button';
import { formatCurrency } from '../../../shared/utils/formatCurrency';

function getQuantity(item) {
    return item.quantity_packs || item.quantity || 1;
}

export default function CartLineItem({
    item,
    isUpdating = false,
    isRemoving = false,
    onQuantityChange,
    onRemove,
}) {
    const [imageFailed, setImageFailed] = useState(false);
    const quantity = getQuantity(item);
    const packSize = item.pack_size || 0;
    const totalItems = item.total_items || quantity * packSize;
    const canDecrease = quantity > 1 && !isUpdating && !isRemoving;
    const canIncrease = quantity < 999 && !isUpdating && !isRemoving;

    return (
        <div className="grid gap-4 border-b border-[var(--color-border)] py-5 last:border-b-0 md:grid-cols-[96px_1fr_auto]">
            <div className="aspect-square overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-background)]">
                {item.product_image && !imageFailed ? (
                    <img
                        src={item.product_image}
                        alt={item.product_name}
                        className="h-full w-full object-contain p-3"
                        onError={() => setImageFailed(true)}
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-[var(--color-text-muted)]">
                        <PackageOpen className="h-8 w-8" />
                    </div>
                )}
            </div>

            <div className="min-w-0">
                <h3 className="text-base font-semibold text-[var(--color-text-main)]">
                    {item.product_name}
                </h3>
                <div className="mt-2 grid gap-1 text-sm text-[var(--color-text-muted)]">
                    <span>{item.variant_label}</span>
                    <span>{item.display_name}</span>
                    <span>
                        {packSize ? translate('text.value_piece_pack', { value0: packSize }) : translate('text.specifications_are_being_updated')}
                    </span>
                    <span> {translate('text.total_bag')} {totalItems || 0} {translate('text.the')} </span>
                </div>
            </div>

            <div className="flex flex-col items-start gap-3 md:items-end">
                <div className="text-left md:text-right">
                    <p className="text-sm text-[var(--color-text-muted)]"> {translate('text.price_package')} </p>
                    <p className="font-semibold text-[var(--color-primary-hover)]">
                        {formatCurrency(item.price_at_added || 0)}
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-text-muted)]"> {translate('text.amount_42d6fffe')} {formatCurrency(item.line_total || 0)}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={!canDecrease}
                        isLoading={isUpdating}
                        onClick={() => onQuantityChange(item.id, quantity - 1)}
                        aria-label={translate('text.reduce_quantity')}
                    >
                        <Minus className="h-4 w-4" />
                    </Button>
                    <span className="flex h-9 min-w-12 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-semibold">
                        {quantity}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={!canIncrease}
                        isLoading={isUpdating}
                        onClick={() => onQuantityChange(item.id, quantity + 1)}
                        aria-label={translate('text.increase_quantity')}
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        disabled={isRemoving || isUpdating}
                        isLoading={isRemoving}
                        onClick={() => onRemove(item.id)}
                        aria-label={translate('text.delete_product')}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
