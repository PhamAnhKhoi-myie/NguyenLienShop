const {
    TIER_ORDER,
    TIER_THRESHOLDS,
    TIER_SHIPPING_BENEFITS,
    getNextTier,
    normalizeTier,
} = require('./loyalty.config');

class LoyaltyMapper {
    static normalizeLoyalty(user) {
        const doc = user?.toObject ? user.toObject() : user;
        const loyalty = doc?.loyalty || {};
        const tier = normalizeTier(
            doc?.tier || loyalty.current_tier || loyalty.earned_tier
        );
        const points = loyalty.points || 0;
        const lifetimePoints = loyalty.lifetime_points || points;
        const nextTier = getNextTier(tier);
        const nextThreshold = nextTier ? TIER_THRESHOLDS[nextTier] : null;

        return {
            points,
            lifetime_points: lifetimePoints,
            coins_balance: loyalty.coins_balance || 0,
            current_tier: tier,
            earned_tier: normalizeTier(loyalty.earned_tier || tier),
            next_tier: nextTier,
            next_tier_points: nextThreshold,
            points_to_next_tier:
                nextThreshold == null
                    ? 0
                    : Math.max(nextThreshold - lifetimePoints, 0),
            tier_thresholds: TIER_THRESHOLDS,
            tier_order: TIER_ORDER,
            shipping_benefit:
                TIER_SHIPPING_BENEFITS[tier] ||
                TIER_SHIPPING_BENEFITS.bronze,
            last_qualified_order_at:
                loyalty.last_qualified_order_at || null,
            last_tier_review_at: loyalty.last_tier_review_at || null,
            last_tier_downgraded_at:
                loyalty.last_tier_downgraded_at || null,
            next_tier_review_at: loyalty.next_tier_review_at || null,
        };
    }

    static toSummaryDTO(user) {
        return this.normalizeLoyalty(user);
    }

    static toTransactionDTO(transaction) {
        if (!transaction) {
            return null;
        }

        const doc = transaction.toObject ? transaction.toObject() : transaction;

        return {
            id: doc._id?.toString(),
            user_id: doc.user_id?.toString?.() || doc.user_id || null,
            order_id: doc.order_id?.toString?.() || doc.order_id || null,
            type: doc.type,
            source: doc.source,
            points_amount: doc.points_amount || 0,
            coins_amount: doc.coins_amount || 0,
            balance_after: doc.balance_after || null,
            tier_change: doc.tier_change || null,
            metadata: doc.metadata || {},
            created_at: doc.created_at,
        };
    }

    static toTransactionDTOList(transactions) {
        if (!Array.isArray(transactions)) {
            return [];
        }

        return transactions.map((transaction) =>
            this.toTransactionDTO(transaction)
        );
    }
}

module.exports = LoyaltyMapper;
