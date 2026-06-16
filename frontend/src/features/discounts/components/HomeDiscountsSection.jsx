import { translate } from '../../../shared/i18n/index';
import { Check, Copy, Loader2, ShoppingBag, TicketPercent } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { ROUTES } from '../../../shared/constants/routes';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { useAuthStore } from '../../auth/store/auth.store';
import {
    CLAIMED_DISCOUNT_CODE_KEY,
    PENDING_DISCOUNT_CLAIM_KEY,
} from '../constants';
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

function saveClaimedCode(code) {
    if (typeof window === 'undefined') {
        return;
    }

    window.localStorage.setItem(CLAIMED_DISCOUNT_CODE_KEY, code);
}

function getDiscountId(discount) {
    return discount?.id || discount?._id || discount?.discountId;
}

function savePendingDiscountClaim(discount) {
    if (typeof window === 'undefined') {
        return;
    }

    const discountId = getDiscountId(discount);

    if (!discountId) {
        return;
    }

    window.sessionStorage.setItem(
        PENDING_DISCOUNT_CLAIM_KEY,
        JSON.stringify({
            discountId,
            code: discount.code || '',
        })
    );
}

function getPendingDiscountClaim() {
    if (typeof window === 'undefined') {
        return null;
    }

    const rawValue = window.sessionStorage.getItem(PENDING_DISCOUNT_CLAIM_KEY);

    if (!rawValue) {
        return null;
    }

    try {
        return JSON.parse(rawValue);
    } catch {
        window.sessionStorage.removeItem(PENDING_DISCOUNT_CLAIM_KEY);
        return null;
    }
}

function clearPendingDiscountClaim() {
    if (typeof window === 'undefined') {
        return;
    }

    window.sessionStorage.removeItem(PENDING_DISCOUNT_CLAIM_KEY);
}

export default function HomeDiscountsSection() {
    const navigate = useNavigate();
    const location = useLocation();
    const accessToken = useAuthStore((state) => state.accessToken);
    const discountsQuery = useHomepageDiscounts(
        12,
        accessToken ? 'user' : 'guest'
    );
    const claimMutation = useClaimDiscount();
    const discounts = discountsQuery.data?.data || [];
    const [claimedCode, setClaimedCode] = useState('');
    const [claimMessage, setClaimMessage] = useState('');
    const [claimMessageType, setClaimMessageType] = useState('success');
    const [localClaimedIds, setLocalClaimedIds] = useState([]);
    const visibleDiscounts = useMemo(
        () =>
            discounts.filter((discount) => {
                const discountId = getDiscountId(discount);

                return !(
                    discount.is_claimed ||
                    claimedCode === discount.code ||
                    localClaimedIds.includes(discountId)
                );
            }),
        [discounts, claimedCode, localClaimedIds]
    );
    const pendingClaimProcessedRef = useRef(false);
    const claimDiscountForUserRef = useRef(null);

    const claimDiscountForUser = useCallback(async (discount, options = {}) => {
        const discountId = getDiscountId(discount);
        const code = discount.code;

        setClaimMessage('');
        setClaimMessageType('success');

        if (!discountId) {
            setClaimMessageType('error');
            setClaimMessage(translate('text.cannot_receive_this_code_because_voucher_information_is_missing'));
            return;
        }

        try {
            await claimMutation.mutateAsync(discountId);
            saveClaimedCode(code);
            setClaimedCode(code);
            setLocalClaimedIds((current) =>
                current.includes(discountId) ? current : [...current, discountId]
            );

            if (options.auto) {
                setClaimMessage(translate('text.received_code_value_the_code_has_been_saved_for_use_at_checkout', { value0: code }));
                return;
            }

            try {
                await navigator.clipboard?.writeText(code);
                setClaimMessage(translate('text.received_code_value_the_code_has_been_copied_for_use_at_checkout', { value0: code }));
            } catch {
                setClaimMessage(translate('text.received_code_value_the_code_has_been_saved_for_use_at_checkout', { value0: code }));
            }
        } catch (error) {
            setClaimMessageType('error');
            setClaimMessage(error.message || translate('text.did_not_receive_this_voucher'));
        }
    }, [claimMutation]);

    useEffect(() => {
        claimDiscountForUserRef.current = claimDiscountForUser;
    }, [claimDiscountForUser]);

    useEffect(() => {
        if (!accessToken || pendingClaimProcessedRef.current) {
            return;
        }

        const pendingClaim = getPendingDiscountClaim();

        if (!pendingClaim?.discountId) {
            return;
        }

        pendingClaimProcessedRef.current = true;

        const timerId = window.setTimeout(() => {
            const claimPromise = claimDiscountForUserRef.current?.(
                pendingClaim,
                { auto: true }
            );

            if (!claimPromise) {
                clearPendingDiscountClaim();
                return;
            }

            claimPromise.finally(() => {
                clearPendingDiscountClaim();
            });
        }, 0);

        return () => window.clearTimeout(timerId);
    }, [accessToken]);

    const handleClaim = async (discount) => {
        if (!accessToken) {
            savePendingDiscountClaim(discount);
            navigate(ROUTES.LOGIN, {
                state: {
                    from: location,
                    pendingDiscountId: getDiscountId(discount),
                    pendingDiscountCode: discount.code,
                },
            });
            return;
        }

        await claimDiscountForUser(discount);
    };

    if (
        discountsQuery.isError ||
        (!discountsQuery.isLoading && visibleDiscounts.length === 0 && !claimMessage)
    ) {
        return null;
    }

    return (
        <section className="border-y border-[var(--color-border)] py-7">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase text-[var(--color-primary-hover)]"> {translate('text.discount_code')} </p>
                    <h2 className="mt-1 text-xl font-bold text-[var(--color-text-main)]"> {translate('text.offer_is_open_for_customers')} </h2>
                    <p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--color-text-muted)]"> {translate('text.get_code_before_buying_to_save_more_on_the_right_order')} </p>
                </div>

                <Link
                    to={ROUTES.PRODUCTS}
                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-xs font-semibold text-[var(--color-text-main)] transition-colors hover:bg-[var(--color-background)]"
                >
                    <ShoppingBag className="h-3.5 w-3.5" /> {translate('text.purchase')} </Link>
            </div>

            {discountsQuery.isLoading ? (
                <div className="flex gap-3 overflow-x-auto pb-3">
                    {[0, 1, 2, 3, 4].map((item) => (
                        <div
                            key={item}
                            className="h-32 w-[270px] shrink-0 animate-pulse rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] sm:w-[300px]"
                        />
                    ))}
                </div>
            ) : (
                <div className="flex snap-x gap-3 overflow-x-auto pb-3">
                    {visibleDiscounts.map((discount) => {
                        const discountId = getDiscountId(discount);
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
                                className="relative flex h-32 w-[270px] shrink-0 snap-start overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm sm:w-[300px]"
                            >
                                <span className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border border-[var(--color-border)] bg-[var(--color-background)]" />
                                <span className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border border-[var(--color-border)] bg-[var(--color-background)]" />

                                <div className="flex w-[90px] shrink-0 flex-col items-center justify-center border-r border-dashed border-[var(--color-border)] bg-green-50 px-2 text-center text-[var(--color-primary)]">
                                    <TicketPercent className="h-6 w-6" />
                                    <span className="mt-2 break-all text-[11px] font-bold leading-4 text-[var(--color-primary-hover)]">
                                        {discount.code}
                                    </span>
                                </div>

                                <div className="flex min-w-0 flex-1 flex-col p-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-[11px] font-semibold uppercase text-[var(--color-text-muted)]">
                                            {translate('text.discount_code')}
                                        </p>
                                        <h3 className="mt-1 truncate text-lg font-bold leading-6 text-[var(--color-text-main)]">
                                            {translate('text.reduce')} {formatDiscountValue(discount)}
                                        </h3>
                                    </div>

                                    <div className="mt-2 space-y-0.5 text-[11px] leading-4 text-[var(--color-text-muted)]">
                                        <p className="truncate"> {translate('text.minimum_order')}{' '}
                                            <span className="font-medium text-[var(--color-text-main)]">
                                                {formatCurrency(discount.min_order_value || 0)}
                                            </span>
                                        </p>
                                        {discount.max_discount_amount ? (
                                            <p className="truncate"> {translate('text.maximum')}{' '}
                                                <span className="font-medium text-[var(--color-text-main)]">
                                                    {formatCurrency(discount.max_discount_amount)}
                                                </span>
                                            </p>
                                        ) : null}
                                    </div>

                                    <button
                                        type="button"
                                        disabled={isClaimed || isClaiming}
                                        onClick={() => handleClaim(discount)}
                                        className="mt-auto inline-flex h-6 w-full items-center justify-center gap-1 rounded-md bg-[var(--color-primary)] px-2 text-[11px] font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-70"
                                    >
                                        {isClaiming ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : isClaimed ? (
                                            <Check className="h-3 w-3" />
                                        ) : (
                                            <Copy className="h-3 w-3" />
                                        )}
                                        {isClaiming
                                            ? translate('text.receiving')
                                            : isClaimed
                                                ? translate('text.received_code')
                                                : translate('text.get_code')}
                                    </button>
                                </div>
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
