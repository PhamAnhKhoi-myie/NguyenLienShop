import { translate } from '../../../shared/i18n/index';
import { cn } from '../../../shared/utils/cn';
import { formatCurrency } from '../../../shared/utils/formatCurrency';

function formatPriceRange(min, max, currency = 'VND') {
    const start = Number(min || 0);
    const end = Number(max || 0);

    if (!start && !end) {
        return translate('text.contact');
    }

    if (start === end || !end) {
        return formatCurrency(start, currency);
    }

    return `${formatCurrency(start, currency)} - ${formatCurrency(
        end,
        currency
    )}`;
}

export default function ProductPrice({
    min,
    max,
    originalMin,
    originalMax,
    currency = 'VND',
    isOnSale = false,
    className,
    priceClassName,
}) {
    const effectiveRange = formatPriceRange(min, max, currency);
    const originalRange = formatPriceRange(
        originalMin ?? min,
        originalMax ?? max,
        currency
    );
    const showOriginal =
        isOnSale &&
        (Number(originalMin ?? min) !== Number(min) ||
            Number(originalMax ?? max) !== Number(max));

    return (
        <div className={cn('flex flex-wrap items-baseline gap-x-3 gap-y-1', className)}>
            <span
                className={cn(
                    'font-semibold',
                    isOnSale
                        ? 'text-[var(--color-error)]'
                        : 'text-[var(--color-primary-hover)]',
                    priceClassName
                )}
            >
                {effectiveRange}
            </span>
            {showOriginal && (
                <span className="text-sm text-[var(--color-text-muted)] line-through">
                    {originalRange}
                </span>
            )}
        </div>
    );
}
