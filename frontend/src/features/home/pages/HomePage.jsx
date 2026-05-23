import { Link } from 'react-router-dom';
import Badge from '../../../shared/components/Badge';
import Card, { CardBody } from '../../../shared/components/Card';
import { ROUTES } from '../../../shared/constants/routes';

export default function HomePage() {
    return (
        <Card>
            <CardBody>
                <Badge>NguyenLienShop</Badge>
                <h1 className="mt-3 text-3xl font-semibold text-[var(--color-text-main)]">
                    Trang chủ
                </h1>
                <p className="mt-3 max-w-2xl text-[var(--color-text-muted)]">
                    Nền frontend đã sẵn sàng. Bước tiếp theo là dựng danh mục,
                    sản phẩm và giỏ hàng theo contract BE.
                </p>
                <div className="mt-5">
                    <Link
                        to={ROUTES.PRODUCTS}
                        className="inline-flex h-10 items-center justify-center rounded-md bg-[var(--color-primary)] px-4 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)]"
                    >
                        Xem sản phẩm
                    </Link>
                </div>
            </CardBody>
        </Card>
    );
}
