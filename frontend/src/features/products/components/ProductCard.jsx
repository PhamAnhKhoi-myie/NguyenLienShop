import { translate } from '../../../shared/i18n/index';
import { Package, ShoppingCart, Star } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Badge from '../../../shared/components/Badge';
import Button from '../../../shared/components/Button';
import Card, { CardBody } from '../../../shared/components/Card';
import { ROUTES } from '../../../shared/constants/routes';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { getPrimaryImage } from '../../../shared/utils/getPrimaryImage';
import ProductPrice from './ProductPrice';
import QuickAddProductModal from './QuickAddProductModal';

export default function ProductCard({ product }) {
    const navigate = useNavigate();
    const image = getPrimaryImage(product.image || product.images);
    const [imageFailed, setImageFailed] = useState(false);
    const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
    const [quickAddMode, setQuickAddMode] = useState('cart');
    const productPath = `${ROUTES.PRODUCTS}/${product.id}`;
    const merchandisingBadges = [
        product.is_on_sale && {
            label:
                product.max_discount_percent > 0
                    ? `-${product.max_discount_percent}%`
                    : translate('text.discounted'),
            variant: 'error',
        },
        product.is_new && {
            label: translate('text.new_arrival'),
            variant: 'primary',
        },
        product.is_best_seller && {
            label: translate('text.best_seller'),
            variant: 'accent',
        },
    ].filter(Boolean);
    const openQuickAdd = (mode) => {
        setQuickAddMode(mode);
        setIsQuickAddOpen(true);
    };

    return (
        <>
            <Card className="flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md">
                <Link to={productPath} className="group relative block">
                    <div className="h-44 bg-[var(--color-background)] sm:h-48">
                        {image?.url && !imageFailed ? (
                            <img
                                src={image.url}
                                alt={image.alt || product.name}
                                className="h-full w-full object-contain p-3 transition-transform duration-200 group-hover:scale-[1.02]"
                                loading="lazy"
                                onError={() => setImageFailed(true)}
                            />
                        ) : (
                            <div className="flex h-full items-center justify-center text-[var(--color-text-muted)]">
                                <Package className="h-10 w-10" />
                            </div>
                        )}
                    </div>
                    <div className="absolute left-3 top-3 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-1.5">
                        {merchandisingBadges.map((badge) => (
                            <Badge
                                key={badge.label}
                                variant={badge.variant}
                                className="bg-opacity-95 shadow-sm"
                            >
                                {badge.label}
                            </Badge>
                        ))}
                    </div>
                </Link>

                <CardBody className="flex flex-1 flex-col p-4">
                    <Link to={productPath} className="block">
                        <h3 className="line-clamp-2 min-h-12 text-base font-semibold text-[var(--color-text-main)] hover:text-[var(--color-primary-hover)]">
                            {product.name}
                        </h3>
                    </Link>

                    <ProductPrice
                        className="mt-3"
                        min={product.min_price}
                        max={product.max_price}
                        originalMin={product.original_min_price}
                        originalMax={product.original_max_price}
                        isOnSale={product.is_on_sale}
                        priceClassName="text-lg"
                    />
                    <div className="mt-1 min-h-5 text-sm text-[var(--color-text-muted)]">
                        {product.min_price_per_unit > 0 && (
                            <>
                                {translate('text.from')}{' '}
                                {formatCurrency(product.min_price_per_unit)}{' '}
                                {translate('text.item')}
                            </>
                        )}
                    </div>

                    <div className="mt-auto pt-3">
                        <div className="flex items-center justify-between gap-3 border-t border-[var(--color-border)] pt-3 text-xs text-[var(--color-text-muted)] sm:text-sm">
                            <div className="flex min-w-0 items-center gap-2">
                                <span className="inline-flex shrink-0 items-center gap-1.5">
                                    <span
                                        className={`h-2 w-2 rounded-full ${product.in_stock
                                            ? 'bg-[var(--color-primary)]'
                                            : 'bg-gray-400'
                                            }`}
                                    />
                                    {product.in_stock
                                        ? translate('text.in_stock')
                                        : translate('text.out_of_stock')}
                                </span>
                                <span className="truncate">
                                    ({translate('text.sold')}{' '}
                                    {product.sold_count || 0})
                                </span>
                            </div>
                            <span className="inline-flex items-center gap-1">
                                <Star className="h-4 w-4 fill-[var(--color-accent)] text-[var(--color-accent)]" />
                                {Number(product.rating_avg || 0).toFixed(1)}
                            </span>
                        </div>

                        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.25rem] gap-2">
                            <Button
                                size="sm"
                                className="min-w-0 px-2 text-xs"
                                disabled={!product.in_stock}
                                onClick={() => openQuickAdd('buy-now')}
                            >
                                <span className="whitespace-nowrap">
                                    {translate('text.buy_now')}
                                </span>
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="min-w-0 gap-1.5 border-[var(--color-primary)] bg-[var(--color-secondary)] px-2 text-xs text-[var(--color-primary-hover)] hover:bg-green-100"
                                onClick={() => navigate(productPath)}
                            >
                                <span className="whitespace-nowrap">
                                    {translate('text.details')}
                                </span>
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-9 w-9 border-[var(--color-primary)] bg-[var(--color-secondary)] p-0 text-[var(--color-primary-hover)] hover:bg-green-100"
                                disabled={!product.in_stock}
                                aria-label={translate('text.add_to_cart')}
                                title={translate('text.add_to_cart')}
                                onClick={() => openQuickAdd('cart')}
                            >
                                <ShoppingCart className="shrink-0" size={20} />
                            </Button>
                        </div>
                    </div>
                </CardBody>
            </Card>

            <QuickAddProductModal
                open={isQuickAddOpen}
                product={product}
                mode={quickAddMode}
                onClose={() => setIsQuickAddOpen(false)}
            />
        </>
    );
}
