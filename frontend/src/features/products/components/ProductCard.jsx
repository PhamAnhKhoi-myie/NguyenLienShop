import { Package, Star } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Badge from '../../../shared/components/Badge';
import Card, { CardBody } from '../../../shared/components/Card';
import { ROUTES } from '../../../shared/constants/routes';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { getPrimaryImage } from '../../../shared/utils/getPrimaryImage';

function formatPriceRange(product) {
    const min = product.min_price || 0;
    const max = product.max_price || 0;

    if (!min && !max) {
        return 'Liên hệ';
    }

    if (min === max || !max) {
        return formatCurrency(min);
    }

    return `${formatCurrency(min)} - ${formatCurrency(max)}`;
}

export default function ProductCard({ product }) {
    const image = getPrimaryImage(product.image || product.images);
    const [imageFailed, setImageFailed] = useState(false);
    const productPath = `${ROUTES.PRODUCTS}/${product.id}`;

    return (
        <Card className="overflow-hidden transition-shadow hover:shadow-md">
            <Link to={productPath} className="block">
                <div className="aspect-square bg-[var(--color-background)]">
                    {image?.url && !imageFailed ? (
                        <img
                            src={image.url}
                            alt={image.alt || product.name}
                            className="h-full w-full object-contain p-4"
                            loading="lazy"
                            onError={() => setImageFailed(true)}
                        />
                    ) : (
                        <div className="flex h-full items-center justify-center text-[var(--color-text-muted)]">
                            <Package className="h-14 w-14" />
                        </div>
                    )}
                </div>
            </Link>

            <CardBody className="space-y-3">
                <div className="flex flex-wrap gap-2">
                    <Badge>Đang bán</Badge>
                    {product.sold_count > 0 && (
                        <Badge variant="accent">Bán chạy</Badge>
                    )}
                </div>

                <Link to={productPath} className="block">
                    <h3 className="line-clamp-2 min-h-12 text-base font-semibold text-[var(--color-text-main)] hover:text-[var(--color-primary-hover)]">
                        {product.name}
                    </h3>
                </Link>

                <div>
                    <p className="text-lg font-semibold text-[var(--color-primary-hover)]">
                        {formatPriceRange(product)}
                    </p>
                    {product.min_price_per_unit > 0 && (
                        <p className="text-sm text-[var(--color-text-muted)]">
                            Từ {formatCurrency(product.min_price_per_unit)} / cái
                        </p>
                    )}
                </div>

                <div className="flex items-center justify-between text-sm text-[var(--color-text-muted)]">
                    <span>Đã bán {product.sold_count || 0}</span>
                    <span className="inline-flex items-center gap-1">
                        <Star className="h-4 w-4 fill-[var(--color-accent)] text-[var(--color-accent)]" />
                        {Number(product.rating_avg || 0).toFixed(1)}
                    </span>
                </div>
            </CardBody>
        </Card>
    );
}
