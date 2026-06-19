const {
    TIER_ORDER,
    TIER_THRESHOLDS,
    TIER_SHIPPING_BENEFITS,
    getNextTier,
} = require('../loyalty/loyalty.config');

class UserMapper {
    static toLoyaltyDTO(doc) {
        const loyalty = doc.loyalty || {};
        const tier = doc.tier || loyalty.current_tier || 'bronze';
        const lifetimePoints =
            loyalty.lifetime_points || loyalty.points || 0;
        const nextTier = getNextTier(tier);
        const nextTierPoints = nextTier
            ? TIER_THRESHOLDS[nextTier]
            : null;

        return {
            points: loyalty.points || 0,
            lifetime_points: lifetimePoints,
            coins_balance: loyalty.coins_balance || 0,
            current_tier: tier,
            earned_tier: loyalty.earned_tier || tier,
            next_tier: nextTier,
            next_tier_points: nextTierPoints,
            points_to_next_tier:
                nextTierPoints == null
                    ? 0
                    : Math.max(nextTierPoints - lifetimePoints, 0),
            tier_thresholds: TIER_THRESHOLDS,
            tier_order: TIER_ORDER,
            shipping_benefit:
                TIER_SHIPPING_BENEFITS[tier] ||
                TIER_SHIPPING_BENEFITS.bronze,
            last_qualified_order_at:
                loyalty.last_qualified_order_at || null,
            last_tier_review_at:
                loyalty.last_tier_review_at || null,
            last_tier_downgraded_at:
                loyalty.last_tier_downgraded_at || null,
            next_tier_review_at:
                loyalty.next_tier_review_at || null,
        };
    }

    static toUpdatePayload(data) {
        const update = {};

        if (data.name !== undefined) {
            update["profile.full_name"] = data.name;
        }

        if (data.avatar !== undefined) {
            update["profile.avatar_url"] = data.avatar;
        }

        if (data.email !== undefined) {
            update.email = data.email || null;
        }

        if (data.gender !== undefined) {
            update["profile.gender"] = data.gender;
        }

        return update;
    }

    static toResponseDTO(user) {
        if (!user) return null;

        const doc = user.toObject ? user.toObject() : user;

        return {
            id: doc._id?.toString(),
            email: doc.email || null,
            profile: {
                full_name: doc.profile?.full_name || null,
                avatar_url: doc.profile?.avatar_url || null,
                phone_number: doc.profile?.phone_number || null,
                gender: doc.profile?.gender || 'UNSPECIFIED',
            },
            roles: doc.roles || [],
            tier: doc.tier || null,
            loyalty: this.toLoyaltyDTO(doc),
            status: doc.status,
            is_email_verified: doc.is_email_verified,
            email_verified_at: doc.email_verified_at,
            is_phone_verified: doc.is_phone_verified,
            phone_verified_at: doc.phone_verified_at,
            last_login_at: doc.last_login_at,
            created_at: doc.created_at,
            updated_at: doc.updated_at,
        };
    }

    static toResponseDTOList(users) {
        return users.map((user) => this.toResponseDTO(user));
    }
}

module.exports = UserMapper;
