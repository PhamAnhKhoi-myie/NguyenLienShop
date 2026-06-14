import { translate } from '../../../shared/i18n/index';
import { ArrowRight, PackageOpen, ShoppingCart, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../../shared/components/Button';
import Card, { CardBody, CardHeader } from '../../../shared/components/Card';
import ConfirmDialog from '../../../shared/components/ConfirmDialog';
import EmptyState from '../../../shared/components/EmptyState';
import Loading from '../../../shared/components/Loading';
import { ROUTES } from '../../../shared/constants/routes';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { useAuthStore } from '../../auth/store/auth.store';
import CartLineItem from '../components/CartLineItem';
import {
    useCart,
    useClearCart,
    useRemoveCartItem,
    useUpdateCartItem,
} from '../hooks/useCart';

export default function CartPage() {
    const accessToken = useAuthStore((state) => state.accessToken);
    const cartQuery = useCart({
        include_items: true,
        format: 'detail',
    });
    const updateCartItemMutation = useUpdateCartItem();
    const removeCartItemMutation = useRemoveCartItem();
    const clearCartMutation = useClearCart();
    const [updatingItemId, setUpdatingItemId] = useState('');
    const [removingItemId, setRemovingItemId] = useState('');
    const [actionError, setActionError] = useState('');
    const [isClearOpen, setIsClearOpen] = useState(false);

    const cart = cartQuery.data?.data;
    const items = cart?.items || [];
    const totals = cart?.totals || {};
    const hasItems = items.length > 0;

    const handleQuantityChange = async (itemId, quantity) => {
        setActionError('');
        setUpdatingItemId(itemId);

        try {
            await updateCartItemMutation.mutateAsync({ itemId, quantity });
        } catch (error) {
            setActionError(error.message || translate('text.unable_to_update_quantity'));
        } finally {
            setUpdatingItemId('');
        }
    };

    const handleRemoveItem = async (itemId) => {
        setActionError('');
        setRemovingItemId(itemId);

        try {
            await removeCartItemMutation.mutateAsync(itemId);
        } catch (error) {
            setActionError(error.message || translate('text.unable_to_delete_product'));
        } finally {
            setRemovingItemId('');
        }
    };

    const handleClearCart = async () => {
        setActionError('');

        try {
            await clearCartMutation.mutateAsync();
            setIsClearOpen(false);
        } catch (error) {
            setActionError(error.message || translate('text.unable_to_delete_cart'));
        }
    };

    if (cartQuery.isLoading) {
        return (
            <Card>
                <CardBody>
                    <Loading label={translate('text.loading_cart')} />
                </CardBody>
            </Card>
        );
    }

    if (cartQuery.isError) {
        return (
            <EmptyState
                icon={ShoppingCart}
                title={translate('text.unable_to_load_shopping_cart')}
                description={cartQuery.error.message}
                actionLabel={translate('text.reload')}
                onAction={() => cartQuery.refetch()}
            />
        );
    }

    if (!hasItems) {
        return (
            <EmptyState
                icon={PackageOpen}
                title={translate('text.cart_is_empty')}
                description={translate('text.select_the_appropriate_fruit_bag_and_add_it_to_your_cart_to_start_orderi')}
                actionLabel={translate('text.view_product')}
                onAction={() => window.location.assign(ROUTES.PRODUCTS)}
            />
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-sm font-medium text-[var(--color-primary-hover)]"> {translate('text.cart')} </p>
                    <h1 className="mt-1 text-3xl font-semibold text-[var(--color-text-main)]"> {translate('text.selected_product')} </h1>
                    <p className="mt-2 text-sm text-[var(--color-text-muted)]"> {translate('text.customers_who_are_not_logged_in_can_still_add_edit_and_delete_products_i')} </p>
                </div>

                <Button
                    variant="outline"
                    onClick={() => setIsClearOpen(true)}
                    disabled={clearCartMutation.isPending}
                >
                    <Trash2 className="h-4 w-4" /> {translate('text.delete_cart')} </Button>
            </div>

            {actionError && (
                <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-[var(--color-error)]">
                    {actionError}
                </p>
            )}

            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
                <Card>
                    <CardHeader>
                        <h2 className="font-semibold text-[var(--color-text-main)]"> {translate('text.product_list')} </h2>
                    </CardHeader>
                    <CardBody className="py-0">
                        {items.map((item) => (
                            <CartLineItem
                                key={item.id}
                                item={item}
                                isUpdating={updatingItemId === item.id}
                                isRemoving={removingItemId === item.id}
                                onQuantityChange={handleQuantityChange}
                                onRemove={handleRemoveItem}
                            />
                        ))}
                    </CardBody>
                </Card>

                <Card className="h-fit">
                    <CardHeader>
                        <h2 className="font-semibold text-[var(--color-text-main)]"> {translate('text.order_summary')} </h2>
                    </CardHeader>
                    <CardBody className="space-y-4">
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between gap-4">
                                <span className="text-[var(--color-text-muted)]"> {translate('text.product_line_number')} </span>
                                <span className="font-medium text-[var(--color-text-main)]">
                                    {totals.item_count || items.length}
                                </span>
                            </div>
                            <div className="flex justify-between gap-4">
                                <span className="text-[var(--color-text-muted)]"> {translate('text.total_number_of_bags')} </span>
                                <span className="font-medium text-[var(--color-text-main)]">
                                    {totals.items_total_units || 0}
                                </span>
                            </div>
                            <div className="flex justify-between gap-4">
                                <span className="text-[var(--color-text-muted)]"> {translate('text.temporary')} </span>
                                <span className="font-medium text-[var(--color-text-main)]">
                                    {formatCurrency(totals.subtotal || 0)}
                                </span>
                            </div>
                            {totals.promotion_discount_amount > 0 && (
                                <div className="flex justify-between gap-4">
                                    <span className="text-[var(--color-text-muted)]">
                                        {translate('text.product_promotion')}
                                    </span>
                                    <span className="font-medium text-[var(--color-error)]">
                                        -{formatCurrency(
                                            totals.promotion_discount_amount
                                        )}
                                    </span>
                                </div>
                            )}
                            <div className="flex justify-between gap-4">
                                <span className="text-[var(--color-text-muted)]"> {translate('text.voucher_discount')} </span>
                                <span className="font-medium text-[var(--color-text-main)]">
                                    {formatCurrency(totals.discount_amount || 0)}
                                </span>
                            </div>
                        </div>

                        <div className="border-t border-[var(--color-border)] pt-4">
                            <div className="flex items-center justify-between gap-4">
                                <span className="font-semibold text-[var(--color-text-main)]"> {translate('text.total')} </span>
                                <span className="text-xl font-semibold text-[var(--color-primary-hover)]">
                                    {formatCurrency(totals.total || 0)}
                                </span>
                            </div>
                        </div>

                        {accessToken ? (
                            <Link
                                to={ROUTES.CHECKOUT}
                                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[var(--color-primary)] px-4 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)]"
                            > {translate('text.continue_payment')} <ArrowRight className="h-4 w-4" />
                            </Link>
                        ) : (
                            <Link
                                to={ROUTES.LOGIN}
                                state={{
                                    from: { pathname: ROUTES.CHECKOUT },
                                    message:
                                        translate('text.login_to_merge_cart_and_continue_to_checkout'),
                                }}
                                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[var(--color-primary)] px-4 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)]"
                            > {translate('text.login_to_pay')} <ArrowRight className="h-4 w-4" />
                            </Link>
                        )}
                    </CardBody>
                </Card>
            </div>

            <ConfirmDialog
                open={isClearOpen}
                title={translate('text.delete_entire_cart')}
                description={translate('text.all_products_currently_in_the_cart_will_be_deleted')}
                confirmLabel={translate('text.delete_cart')}
                isLoading={clearCartMutation.isPending}
                onClose={() => setIsClearOpen(false)}
                onConfirm={handleClearCart}
            />
        </div>
    );
}
