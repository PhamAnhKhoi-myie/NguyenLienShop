import { Check, Copy, Loader2, ShoppingBag, TicketPercent } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { ROUTES } from '../../../shared/constants/routes';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { useAuthStore } from '../../auth/store/auth.store';
import { CLAIMED_DISCOUNT_CODE_KEY } from '../constants';
import {
    useClaimDiscount,
    useHomepageDiscounts,
} from '../hooks/useHomepageDiscounts';

function formatDiscountValue(discount) {
    if (discount.type === 'percent') {
        return `${discount.value}%`;
    }

    return formatCurrency(discount.value);
}

function formatDate(value) {
    if (!value) {
        return '';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(date);
}

function saveClaimedCode(code) {
    if (typeof window === 'undefined') {
        return;
    }

    window.localStorage.setItem(CLAIMED_DISCOUNT_CODE_KEY, code);
}

export default function HomeDiscountsSection() {
    const navigate = useNavigate();
    const location = useLocation();
    const accessToken = useAuthStore((state) => state.accessToken);
    const discountsQuery = useHomepageDiscounts(
        4,
        accessToken ? 'user' : 'guest'
    );
    const claimMutation = useClaimDiscount();
    const discounts = discountsQuery.data?.data || [];
    const [claimedCode, setClaimedCode] = useState('');
    const [claimMessage, setClaimMessage] = useState('');
    const [claimMessageType, setClaimMessageType] = useState('success');
    const [localClaimedIds, setLocalClaimedIds] = useState([]);

    const handleClaim = async (discount) => {
        const discountId = discount.id || discount._id;
        const code = discount.code;

        setClaimMessage('');
        setClaimMessageType('success');

        if (!accessToken) {
            navigate(ROUTES.LOGIN, {
                state: {
                    from: location,
                },
            });
            return;
        }

        if (!discountId) {
            setClaimMessageType('error');
            setClaimMessage('Không thể nhận mã này vì thiếu thông tin voucher.');
            return;
        }

        try {
            await claimMutation.mutateAsync(discountId);
            saveClaimedCode(code);
            setClaimedCode(code);
            setLocalClaimedIds((current) =>
                current.includes(discountId) ? current : [...current, discountId]
            );

            try {
                await navigator.clipboard?.writeText(code);
                setClaimMessage(`Đã nhận mã ${code}. Mã đã được copy để dùng ở checkout.`);
            } catch {
                setClaimMessage(`Đã nhận mã ${code}. Mã đã được lưu để dùng ở checkout.`);
            }
        } catch (error) {
            setClaimMessageType('error');
            setClaimMessage(error.message || 'Không nhận được voucher này.');
        }
    };

    if (discountsQuery.isError || (!discountsQuery.isLoading && discounts.length === 0)) {
        return null;
    }

    return (
        <section className="border-y border-[var(--color-border)] py-10">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-sm font-semibold text-[var(--color-primary-hover)]">
                        Mã giảm giá
                    </p>
                    <h2 className="mt-1 text-2xl font-bold text-[var(--color-text-main)]">
                        Ưu đãi đang mở cho khách hàng
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
                        Nhận mã trước khi mua để tiết kiệm hơn cho đơn hàng phù hợp.
                    </p>
                </div>

                <Link
                    to={ROUTES.PRODUCTS}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-semibold text-[var(--color-text-main)] transition-colors hover:bg-[var(--color-background)]"
                >
                    <ShoppingBag className="h-4 w-4" />
                    Mua hàng
                </Link>
            </div>

            {discountsQuery.isLoading ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {[0, 1, 2, 3].map((item) => (
                        <div
                            key={item}
                            className="h-48 animate-pulse rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
                        />
                    ))}
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {discounts.map((discount) => {
                        const discountId = discount.id || discount._id;
                        const isClaimed =
                            discount.is_claimed ||
                            claimedCode === discount.code ||
                            localClaimedIds.includes(discountId);
                        const isClaiming =
                            claimMutation.isPending &&
                            claimMutation.variables === discountId;

                        return (
                            <article
                                key={discountId || discount.code}
                                className="relative overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-50 text-[var(--color-primary)]">
                                        <TicketPercent className="h-5 w-5" />
                                    </div>

                                    <span className="rounded-full bg-[var(--color-secondary)] px-3 py-1 text-xs font-semibold text-[var(--color-primary-hover)]">
                                        {discount.code}
                                    </span>
                                </div>

                                <h3 className="mt-5 text-xl font-bold text-[var(--color-text-main)]">
                                    Giảm {formatDiscountValue(discount)}
                                </h3>

                                <div className="mt-3 space-y-1 text-sm text-[var(--color-text-muted)]">
                                    <p>
                                        Đơn tối thiểu{' '}
                                        <span className="font-medium text-[var(--color-text-main)]">
                                            {formatCurrency(discount.min_order_value || 0)}
                                        </span>
                                    </p>
                                    {discount.max_discount_amount ? (
                                        <p>
                                            Tối đa{' '}
                                            <span className="font-medium text-[var(--color-text-main)]">
                                                {formatCurrency(discount.max_discount_amount)}
                                            </span>
                                        </p>
                                    ) : null}
                                    {discount.expiry_date ? (
                                        <p>Hạn dùng đến {formatDate(discount.expiry_date)}</p>
                                    ) : null}
                                </div>

                                <button
                                    type="button"
                                    disabled={isClaimed || isClaiming}
                                    onClick={() => handleClaim(discount)}
                                    className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[var(--color-primary)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                    {isClaiming ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : isClaimed ? (
                                        <Check className="h-4 w-4" />
                                    ) : (
                                        <Copy className="h-4 w-4" />
                                    )}
                                    {isClaiming
                                        ? 'Đang nhận'
                                        : isClaimed
                                          ? 'Đã nhận mã'
                                          : 'Nhận mã'}
                                </button>
                            </article>
                        );
                    })}
                </div>
            )}

            {claimMessage && (
                <p
                    className={
                        claimMessageType === 'error'
                            ? 'mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-[var(--color-error)]'
                            : 'mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700'
                    }
                    aria-live="polite"
                >
                    {claimMessage}
                </p>
            )}
        </section>
    );
}
