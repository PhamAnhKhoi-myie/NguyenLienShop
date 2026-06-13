import { translate } from '../../../shared/i18n/index';
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
        translate('text.order_could_not_be_completed');

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
                    {isSuccess ? translate('text.order_successful') : translate('text.order_failed')}
                </h1>

                {isSuccess ? (
                    <div className="mt-3 space-y-2 text-sm text-[var(--color-text-muted)]">
                        <p> {translate('text.cod_order_has_been_created_shop_will_contact_to_confirm_before_delivery')} </p>
                        {orderCode && (
                            <p> {translate('text.item_code_f5a4efb2')} <span className="font-semibold text-[var(--color-text-main)]">{orderCode}</span>
                            </p>
                        )}
                        {order?.pricing?.total_amount !== undefined && (
                            <p> {translate('text.total_amount_91ee83af')} <span className="font-semibold text-[var(--color-primary-hover)]">{formatCurrency(order.pricing.total_amount)}</span>
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
                            <PackageCheck className="h-4 w-4" /> {translate('text.view_order')} </Link>
                    )}
                    <Link
                        to={isSuccess ? ROUTES.PRODUCTS : ROUTES.CHECKOUT}
                        className={
                            isSuccess
                                ? 'inline-flex h-10 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-medium text-[var(--color-text-main)] transition-colors hover:bg-[var(--color-background)]'
                                : 'inline-flex h-10 items-center justify-center rounded-md bg-[var(--color-primary)] px-4 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)]'
                        }
                    >
                        {isSuccess ? translate('text.continue_shopping') : translate('text.go_back_to_checkout')}
                    </Link>
                </div>
            </CardBody>
        </Card>
    );
}
