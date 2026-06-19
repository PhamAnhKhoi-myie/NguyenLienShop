const TIER_ORDER = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];

const TIER_THRESHOLDS = {
    bronze: 0,
    silver: 2000,
    gold: 5000,
    platinum: 10000,
    diamond: 20000,
};

const TIER_SHIPPING_BENEFITS = {
    bronze: { discount_percent: 0 },
    silver: { discount_percent: 10 },
    gold: { discount_percent: 20 },
    platinum: { discount_percent: 50 },
    diamond: { discount_percent: 100 },
};

const TIER_REWARD_DISCOUNT_CODES = {
    silver: 'TIER_SILVER_REWARD',
    gold: 'TIER_GOLD_REWARD',
    platinum: 'TIER_PLATINUM_REWARD',
    diamond: 'TIER_DIAMOND_REWARD',
};

const POINTS_DIVISOR = 1000;
const ORDER_RECEIVED_COINS = 250;
const ORDER_REVIEW_COINS = 250;
const INACTIVITY_MONTHS = 6;

const TRANSACTION_TYPES = {
    EARN_POINTS: 'EARN_POINTS',
    EARN_COINS: 'EARN_COINS',
    SPEND_COINS: 'SPEND_COINS',
    ADJUSTMENT: 'ADJUSTMENT',
    TIER_CHANGE: 'TIER_CHANGE',
    REVERSAL: 'REVERSAL',
};

const TRANSACTION_SOURCES = {
    ORDER_POINTS: 'ORDER_POINTS',
    ORDER_RECEIVED_COINS: 'ORDER_RECEIVED_COINS',
    ORDER_REVIEW_COINS: 'ORDER_REVIEW_COINS',
    TIER_UPGRADE: 'TIER_UPGRADE',
    TIER_DOWNGRADE_INACTIVITY: 'TIER_DOWNGRADE_INACTIVITY',
    ADMIN_ADJUSTMENT: 'ADMIN_ADJUSTMENT',
    COINS_SPEND: 'COINS_SPEND',
    ORDER_REVERSAL: 'ORDER_REVERSAL',
};

function normalizeTier(tier) {
    const normalized = String(tier || '').toLowerCase();
    return TIER_ORDER.includes(normalized) ? normalized : 'bronze';
}

function getTierRank(tier) {
    const index = TIER_ORDER.indexOf(normalizeTier(tier));
    return index === -1 ? 0 : index;
}

function getTierForPoints(points = 0) {
    const safePoints = Math.max(Number(points) || 0, 0);

    return TIER_ORDER.reduce((currentTier, tier) => {
        if (safePoints >= TIER_THRESHOLDS[tier]) {
            return tier;
        }

        return currentTier;
    }, 'bronze');
}

function getNextTier(tier) {
    const rank = getTierRank(tier);
    return TIER_ORDER[rank + 1] || null;
}

function getPreviousTier(tier) {
    const rank = getTierRank(tier);
    return TIER_ORDER[Math.max(rank - 1, 0)] || 'bronze';
}

function getTiersBetween(fromTier, toTier) {
    const fromRank = getTierRank(fromTier);
    const toRank = getTierRank(toTier);

    if (toRank <= fromRank) {
        return [];
    }

    return TIER_ORDER.slice(fromRank + 1, toRank + 1);
}

function addMonths(date, months) {
    const base = date ? new Date(date) : new Date();
    const target = new Date(base.getTime());
    const day = target.getDate();

    target.setMonth(target.getMonth() + months);

    if (target.getDate() !== day) {
        target.setDate(0);
    }

    return target;
}

function calculateRewardableAmount(order) {
    const subtotal = Math.max(Number(order?.pricing?.subtotal) || 0, 0);
    const discountAmount = Math.max(
        Number(order?.pricing?.discount_amount) || 0,
        0
    );

    return Math.max(subtotal - discountAmount, 0);
}

function calculatePointsForOrder(order) {
    return Math.floor(calculateRewardableAmount(order) / POINTS_DIVISOR);
}

function calculateShippingDiscount(baseShippingFee, tier) {
    const baseFee = Math.max(Number(baseShippingFee) || 0, 0);
    const benefit = TIER_SHIPPING_BENEFITS[normalizeTier(tier)] || {};
    const discountPercent = Math.max(
        Math.min(Number(benefit.discount_percent) || 0, 100),
        0
    );
    const discountAmount = Math.min(
        baseFee,
        Math.floor((baseFee * discountPercent) / 100)
    );

    return {
        base_shipping_fee: baseFee,
        shipping_discount_percent: discountPercent,
        shipping_discount_amount: discountAmount,
        shipping_fee: baseFee - discountAmount,
    };
}

module.exports = {
    TIER_ORDER,
    TIER_THRESHOLDS,
    TIER_SHIPPING_BENEFITS,
    TIER_REWARD_DISCOUNT_CODES,
    POINTS_DIVISOR,
    ORDER_RECEIVED_COINS,
    ORDER_REVIEW_COINS,
    INACTIVITY_MONTHS,
    TRANSACTION_TYPES,
    TRANSACTION_SOURCES,
    normalizeTier,
    getTierRank,
    getTierForPoints,
    getNextTier,
    getPreviousTier,
    getTiersBetween,
    addMonths,
    calculateRewardableAmount,
    calculatePointsForOrder,
    calculateShippingDiscount,
};
