import { CheckCircle2, CircleX, PackageCheck } from 'lucide-react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import Card, { CardBody } from '../../../shared/components/Card';
import { ROUTES } from '../../../shared/constants/routes';
import { formatCurrency } from '../../../shared/utils/formatCurrency';

export default function CheckoutResultPage({ status = 'success' }) {
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const order = location.state?.order;
    const isSuccess = status === 'success';
    const orderCode = order?.order_code || searchParams.get('order_code');
    const message =
        searchParams.get('message') ||
        location.state?.message ||
        'Không thể hoàn tất đặt hàng.';

    return (
        <Card>
            <CardBody className="mx-auto max-w-2xl py-12 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-secondary)] text-[var(--color-primary)]">
                    {isSuccess ? (
                        <CheckCircle2 className="h-7 w-7" />
                    ) : (
                        <CircleX className="h-7 w-7 text-[var(--color-error)]" />
                    )}
                </div>

                <h1 className="mt-5 text-2xl font-semibold text-[var(--color-text-main)]">
                    {isSuccess ? 'Đặt hàng thành công' : 'Đặt hàng thất bại'}
                </h1>

                {isSuccess ? (
                    <div className="mt-3 space-y-2 text-sm text-[var(--color-text-muted)]">
                        <p>
                            Đơn hàng COD đã được tạo. Shop sẽ liên hệ xác nhận trước khi giao.
                        </p>
                        {orderCode && (
                            <p>
                                Mã đơn: <span className="font-semibold text-[var(--color-text-main)]">{orderCode}</span>
                            </p>
                        )}
                        {order?.pricing?.total_amount !== undefined && (
                            <p>
                                Tổng tiền: <span className="font-semibold text-[var(--color-primary-hover)]">{formatCurrency(order.pricing.total_amount)}</span>
                            </p>
                        )}
                    </div>
                ) : (
                    <p className="mt-3 text-sm text-[var(--color-text-muted)]">
                        {message}
                    </p>
                )}

                <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                    {isSuccess && (
                        <Link
                            to={ROUTES.ORDERS}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[var(--color-primary)] px-4 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)]"
                        >
                            <PackageCheck className="h-4 w-4" />
                            Xem đơn hàng
                        </Link>
                    )}
                    <Link
                        to={isSuccess ? ROUTES.PRODUCTS : ROUTES.CHECKOUT}
                        className={
                            isSuccess
                                ? 'inline-flex h-10 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-medium text-[var(--color-text-main)] transition-colors hover:bg-[var(--color-background)]'
                                : 'inline-flex h-10 items-center justify-center rounded-md bg-[var(--color-primary)] px-4 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)]'
                        }
                    >
                        {isSuccess ? 'Tiếp tục mua hàng' : 'Quay lại checkout'}
                    </Link>
                </div>
            </CardBody>
        </Card>
    );
}
