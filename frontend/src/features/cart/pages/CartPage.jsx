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
            setActionError(error.message || 'Không cập nhật được số lượng.');
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
            setActionError(error.message || 'Không xóa được sản phẩm.');
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
            setActionError(error.message || 'Không xóa được giỏ hàng.');
        }
    };

    if (cartQuery.isLoading) {
        return (
            <Card>
                <CardBody>
                    <Loading label="Đang tải giỏ hàng..." />
                </CardBody>
            </Card>
        );
    }

    if (cartQuery.isError) {
        return (
            <EmptyState
                icon={ShoppingCart}
                title="Không tải được giỏ hàng"
                description={cartQuery.error.message}
                actionLabel="Tải lại"
                onAction={() => cartQuery.refetch()}
            />
        );
    }

    if (!hasItems) {
        return (
            <EmptyState
                icon={PackageOpen}
                title="Giỏ hàng đang trống"
                description="Chọn túi bao trái cây phù hợp rồi thêm vào giỏ để bắt đầu đặt hàng."
                actionLabel="Xem sản phẩm"
                onAction={() => window.location.assign(ROUTES.PRODUCTS)}
            />
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-sm font-medium text-[var(--color-primary-hover)]">
                        Giỏ hàng
                    </p>
                    <h1 className="mt-1 text-3xl font-semibold text-[var(--color-text-main)]">
                        Sản phẩm đã chọn
                    </h1>
                    <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                        Khách chưa đăng nhập vẫn có thể thêm, sửa, xóa sản phẩm trong giỏ.
                    </p>
                </div>

                <Button
                    variant="outline"
                    onClick={() => setIsClearOpen(true)}
                    disabled={clearCartMutation.isPending}
                >
                    <Trash2 className="h-4 w-4" />
                    Xóa giỏ
                </Button>
            </div>

            {actionError && (
                <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-[var(--color-error)]">
                    {actionError}
                </p>
            )}

            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
                <Card>
                    <CardHeader>
                        <h2 className="font-semibold text-[var(--color-text-main)]">
                            Danh sách sản phẩm
                        </h2>
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
                        <h2 className="font-semibold text-[var(--color-text-main)]">
                            Tóm tắt đơn hàng
                        </h2>
                    </CardHeader>
                    <CardBody className="space-y-4">
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between gap-4">
                                <span className="text-[var(--color-text-muted)]">
                                    Số dòng sản phẩm
                                </span>
                                <span className="font-medium text-[var(--color-text-main)]">
                                    {totals.item_count || items.length}
                                </span>
                            </div>
                            <div className="flex justify-between gap-4">
                                <span className="text-[var(--color-text-muted)]">
                                    Tổng số túi
                                </span>
                                <span className="font-medium text-[var(--color-text-main)]">
                                    {totals.items_total_units || 0}
                                </span>
                            </div>
                            <div className="flex justify-between gap-4">
                                <span className="text-[var(--color-text-muted)]">
                                    Tạm tính
                                </span>
                                <span className="font-medium text-[var(--color-text-main)]">
                                    {formatCurrency(totals.subtotal || 0)}
                                </span>
                            </div>
                            <div className="flex justify-between gap-4">
                                <span className="text-[var(--color-text-muted)]">
                                    Giảm giá
                                </span>
                                <span className="font-medium text-[var(--color-text-main)]">
                                    {formatCurrency(totals.discount_amount || 0)}
                                </span>
                            </div>
                        </div>

                        <div className="border-t border-[var(--color-border)] pt-4">
                            <div className="flex items-center justify-between gap-4">
                                <span className="font-semibold text-[var(--color-text-main)]">
                                    Tổng cộng
                                </span>
                                <span className="text-xl font-semibold text-[var(--color-primary-hover)]">
                                    {formatCurrency(totals.total || 0)}
                                </span>
                            </div>
                        </div>

                        {accessToken ? (
                            <Link
                                to={ROUTES.CHECKOUT}
                                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[var(--color-primary)] px-4 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)]"
                            >
                                Tiếp tục thanh toán
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        ) : (
                            <Link
                                to={ROUTES.LOGIN}
                                state={{
                                    from: { pathname: ROUTES.CHECKOUT },
                                    message:
                                        'Đăng nhập để merge giỏ hàng và tiếp tục thanh toán.',
                                }}
                                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[var(--color-primary)] px-4 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)]"
                            >
                                Đăng nhập để thanh toán
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        )}
                    </CardBody>
                </Card>
            </div>

            <ConfirmDialog
                open={isClearOpen}
                title="Xóa toàn bộ giỏ hàng?"
                description="Toàn bộ sản phẩm hiện có trong giỏ sẽ được xóa."
                confirmLabel="Xóa giỏ"
                isLoading={clearCartMutation.isPending}
                onClose={() => setIsClearOpen(false)}
                onConfirm={handleClearCart}
            />
        </div>
    );
}
