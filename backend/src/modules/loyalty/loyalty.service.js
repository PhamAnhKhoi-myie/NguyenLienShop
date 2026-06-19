const mongoose = require('mongoose');
const User = require('../users/user.model');
const Discount = require('../discounts/discount.model');
const UserClaimedDiscount = require('../discounts/user_claimed_discount.model');
const NotificationService = require('../notifications/notification.service');
const AppError = require('../../utils/appError.util');
const LoyaltyTransaction = require('./loyalty_transaction.model');
const LoyaltyMapper = require('./loyalty.mapper');
const {
    TIER_ORDER,
    TIER_REWARD_DISCOUNT_CODES,
    ORDER_RECEIVED_COINS,
    ORDER_REVIEW_COINS,
    INACTIVITY_MONTHS,
    TRANSACTION_TYPES,
    TRANSACTION_SOURCES,
    normalizeTier,
    getTierRank,
    getTierForPoints,
    getPreviousTier,
    getTiersBetween,
    addMonths,
    calculatePointsForOrder,
    calculateRewardableAmount,
    calculateShippingDiscount,
} = require('./loyalty.config');

function getId(value) {
    if (!value) {
        return null;
    }

    if (value._id) {
        return value._id;
    }

    return value;
}

function maxDate(current, next) {
    if (!current) {
        return next || null;
    }

    if (!next) {
        return current;
    }

    return new Date(current).getTime() > new Date(next).getTime()
        ? current
        : next;
}

class LoyaltyService {
    static getDefaultLoyalty(tier = 'bronze') {
        const normalizedTier = normalizeTier(tier);

        return {
            points: 0,
            lifetime_points: 0,
            coins_balance: 0,
            earned_tier: normalizedTier,
            current_tier: normalizedTier,
            last_qualified_order_at: null,
            last_tier_review_at: null,
            last_tier_downgraded_at: null,
            next_tier_review_at: null,
        };
    }

    static ensureUserLoyalty(user) {
        const baseTier = normalizeTier(
            user?.tier || user?.loyalty?.current_tier || 'bronze'
        );

        if (!user.loyalty) {
            user.loyalty = this.getDefaultLoyalty(baseTier);
        }

        user.loyalty.points = Math.max(user.loyalty.points || 0, 0);
        user.loyalty.lifetime_points = Math.max(
            user.loyalty.lifetime_points || user.loyalty.points || 0,
            0
        );
        user.loyalty.coins_balance = Math.max(
            user.loyalty.coins_balance || 0,
            0
        );
        user.loyalty.current_tier = normalizeTier(
            user.loyalty.current_tier || user.tier || baseTier
        );
        user.loyalty.earned_tier = normalizeTier(
            user.loyalty.earned_tier ||
            getTierForPoints(user.loyalty.lifetime_points)
        );
        user.tier = normalizeTier(user.tier || user.loyalty.current_tier);

        return user.loyalty;
    }

    static isRewardableOrder(order) {
        return Boolean(
            order &&
            order.status === 'DELIVERED' &&
            order.customer_receipt?.confirmed_at &&
            !order.is_deleted &&
            order.payment?.status !== 'REFUNDED'
        );
    }

    static async getSummary(userId, options = {}) {
        const user = await User.findById(userId).session(options.session || null);

        if (!user) {
            throw new AppError('User not found', 404, 'USER_NOT_FOUND');
        }

        return LoyaltyMapper.toSummaryDTO(user);
    }

    static async getTransactions(userId, filters = {}) {
        const page = Math.max(parseInt(filters.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(filters.limit, 10) || 20, 1), 100);
        const query = { user_id: userId };

        if (filters.type) {
            query.type = filters.type;
        }

        if (filters.source) {
            query.source = filters.source;
        }

        const [transactions, total] = await Promise.all([
            LoyaltyTransaction.find(query)
                .sort({ created_at: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            LoyaltyTransaction.countDocuments(query),
        ]);

        return {
            data: LoyaltyMapper.toTransactionDTOList(transactions),
            pagination: {
                page,
                limit,
                total,
                total_pages: Math.ceil(total / limit),
            },
        };
    }

    static async getCheckoutShippingQuote(userId, baseShippingFee, options = {}) {
        const user = await User.findById(userId)
            .select('tier loyalty')
            .session(options.session || null)
            .lean();
        const tier = normalizeTier(
            user?.tier || user?.loyalty?.current_tier || 'bronze'
        );

        return {
            tier,
            ...calculateShippingDiscount(baseShippingFee, tier),
        };
    }

    static async awardOrderReceivedRewards(order, options = {}) {
        if (!this.isRewardableOrder(order)) {
            return {
                points: null,
                coins: null,
            };
        }

        const pointsAmount = calculatePointsForOrder(order);
        const rewardableAmount = calculateRewardableAmount(order);
        const qualifiedAt =
            order.customer_receipt?.confirmed_at ||
            order.shipment?.delivered_at ||
            new Date();

        return this._withOptionalTransaction(options.session, async (session) => {
            const points = pointsAmount > 0
                ? await this._createLedgerEntry({
                    userId: order.user_id,
                    orderId: order._id,
                    type: TRANSACTION_TYPES.EARN_POINTS,
                    source: TRANSACTION_SOURCES.ORDER_POINTS,
                    pointsAmount,
                    coinsAmount: 0,
                    qualifiedAt,
                    metadata: {
                        order_code: order.order_code,
                        rewardable_amount: rewardableAmount,
                        formula: 'floor((subtotal - discount_amount) / 1000)',
                    },
                    session,
                })
                : null;

            const coins = await this._createLedgerEntry({
                userId: order.user_id,
                orderId: order._id,
                type: TRANSACTION_TYPES.EARN_COINS,
                source: TRANSACTION_SOURCES.ORDER_RECEIVED_COINS,
                pointsAmount: 0,
                coinsAmount: ORDER_RECEIVED_COINS,
                qualifiedAt,
                metadata: {
                    order_code: order.order_code,
                },
                session,
            });

            return {
                points,
                coins,
            };
        });
    }

    static async awardOrderReviewRewards(order, options = {}) {
        if (!this.isRewardableOrder(order)) {
            return null;
        }

        return this._withOptionalTransaction(options.session, async (session) =>
            this._createLedgerEntry({
                userId: order.user_id,
                orderId: order._id,
                type: TRANSACTION_TYPES.EARN_COINS,
                source: TRANSACTION_SOURCES.ORDER_REVIEW_COINS,
                pointsAmount: 0,
                coinsAmount: ORDER_REVIEW_COINS,
                qualifiedAt: new Date(),
                metadata: {
                    order_code: order.order_code,
                },
                session,
            })
        );
    }

    static async applyTierDecayForUser(userId, options = {}) {
        const now = options.now || new Date();

        return this._withOptionalTransaction(options.session, async (session) => {
            const user = await User.findById(userId).session(session);

            if (!user) {
                throw new AppError('User not found', 404, 'USER_NOT_FOUND');
            }

            this.ensureUserLoyalty(user);

            const currentTier = normalizeTier(
                user.tier || user.loyalty.current_tier
            );

            if (currentTier === 'bronze') {
                return {
                    changed: false,
                    tier: currentTier,
                    reason: 'BRONZE_TIER',
                };
            }

            const lastQualifiedOrderAt = user.loyalty.last_qualified_order_at;

            if (!lastQualifiedOrderAt) {
                return {
                    changed: false,
                    tier: currentTier,
                    reason: 'NO_QUALIFIED_ORDER',
                };
            }

            const nextReviewAt =
                user.loyalty.next_tier_review_at ||
                addMonths(lastQualifiedOrderAt, INACTIVITY_MONTHS);

            if (new Date(nextReviewAt).getTime() > now.getTime()) {
                if (!user.loyalty.next_tier_review_at) {
                    user.loyalty.next_tier_review_at = nextReviewAt;
                    await user.save({ session });
                }
                return {
                    changed: false,
                    tier: currentTier,
                    next_tier_review_at: nextReviewAt,
                    reason: 'NOT_DUE',
                };
            }

            const newTier = getPreviousTier(currentTier);

            if (newTier === currentTier) {
                return {
                    changed: false,
                    tier: currentTier,
                    reason: 'NO_LOWER_TIER',
                };
            }

            user.tier = newTier;
            user.loyalty.current_tier = newTier;
            user.loyalty.last_tier_review_at = now;
            user.loyalty.last_tier_downgraded_at = now;
            user.loyalty.next_tier_review_at = addMonths(now, INACTIVITY_MONTHS);

            await user.save({ session });

            const [transaction] = await LoyaltyTransaction.create(
                [
                    {
                        user_id: user._id,
                        type: TRANSACTION_TYPES.TIER_CHANGE,
                        source: TRANSACTION_SOURCES.TIER_DOWNGRADE_INACTIVITY,
                        points_amount: 0,
                        coins_amount: 0,
                        balance_after: this._buildBalanceAfter(user),
                        tier_change: {
                            from: currentTier,
                            to: newTier,
                            reason: `${INACTIVITY_MONTHS}_MONTHS_INACTIVE`,
                        },
                        metadata: {
                            reviewed_at: now,
                            last_qualified_order_at: lastQualifiedOrderAt,
                        },
                    },
                ],
                { session }
            );

            await this._notifyTierChanged(user, currentTier, newTier, {
                direction: 'downgrade',
            });

            return {
                changed: true,
                tier: newTier,
                previous_tier: currentTier,
                transaction: LoyaltyMapper.toTransactionDTO(transaction),
            };
        });
    }

    static async processTierDecayBatch(options = {}) {
        const now = options.now || new Date();
        const limit = Math.min(Math.max(parseInt(options.limit, 10) || 100, 1), 500);
        const users = await User.find({
            tier: { $in: TIER_ORDER.filter((tier) => tier !== 'bronze') },
            'loyalty.last_qualified_order_at': { $ne: null },
            $or: [
                { 'loyalty.next_tier_review_at': { $lte: now } },
                { 'loyalty.next_tier_review_at': null },
            ],
        })
            .select('_id')
            .limit(limit)
            .lean();

        const results = [];

        for (const user of users) {
            try {
                results.push(
                    await this.applyTierDecayForUser(user._id, { now })
                );
            } catch (error) {
                results.push({
                    changed: false,
                    user_id: user._id.toString(),
                    error: error.message,
                });
            }
        }

        return {
            processed: users.length,
            downgraded: results.filter((result) => result.changed).length,
            results,
        };
    }

    static async _withOptionalTransaction(existingSession, fn) {
        if (existingSession) {
            return fn(existingSession);
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const result = await fn(session);
            await session.commitTransaction();
            return result;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    static async _createLedgerEntry({
        userId,
        orderId = null,
        type,
        source,
        pointsAmount = 0,
        coinsAmount = 0,
        qualifiedAt = null,
        metadata = {},
        session,
    }) {
        const normalizedUserId = getId(userId);
        const normalizedOrderId = getId(orderId);

        const existing = normalizedOrderId
            ? await LoyaltyTransaction.findOne({
                user_id: normalizedUserId,
                order_id: normalizedOrderId,
                source,
            }).session(session)
            : null;

        if (existing) {
            return {
                awarded: false,
                transaction: LoyaltyMapper.toTransactionDTO(existing),
            };
        }

        const user = await User.findById(normalizedUserId).session(session);

        if (!user) {
            throw new AppError('User not found', 404, 'USER_NOT_FOUND');
        }

        this.ensureUserLoyalty(user);

        const previousTier = normalizeTier(
            user.tier || user.loyalty.current_tier
        );
        const previousEarnedTier = normalizeTier(user.loyalty.earned_tier);

        let transaction;

        try {
            [transaction] = await LoyaltyTransaction.create(
                [
                    {
                        user_id: normalizedUserId,
                        order_id: normalizedOrderId,
                        type,
                        source,
                        points_amount: pointsAmount,
                        coins_amount: coinsAmount,
                        balance_after: this._buildBalanceAfter(user),
                        metadata,
                    },
                ],
                { session }
            );
        } catch (error) {
            if (error?.code !== 11000 || !normalizedOrderId) {
                throw error;
            }

            const duplicate = await LoyaltyTransaction.findOne({
                user_id: normalizedUserId,
                order_id: normalizedOrderId,
                source,
            }).session(session);

            return {
                awarded: false,
                transaction: LoyaltyMapper.toTransactionDTO(duplicate),
            };
        }

        user.loyalty.points += pointsAmount;
        user.loyalty.lifetime_points += pointsAmount;
        user.loyalty.coins_balance += coinsAmount;

        if (qualifiedAt) {
            const nextQualifiedAt = maxDate(
                user.loyalty.last_qualified_order_at,
                qualifiedAt
            );
            user.loyalty.last_qualified_order_at = nextQualifiedAt;
            user.loyalty.next_tier_review_at = addMonths(
                nextQualifiedAt,
                INACTIVITY_MONTHS
            );
        }

        const earnedTier = getTierForPoints(user.loyalty.lifetime_points);
        const targetTier =
            getTierRank(earnedTier) > getTierRank(previousTier)
                ? earnedTier
                : previousTier;
        const newlyEarnedTiers = getTiersBetween(previousEarnedTier, earnedTier);

        user.loyalty.earned_tier =
            getTierRank(earnedTier) > getTierRank(previousEarnedTier)
                ? earnedTier
                : previousEarnedTier;
        user.loyalty.current_tier = targetTier;
        user.tier = targetTier;

        await user.save({ session });
        transaction.balance_after = this._buildBalanceAfter(user);
        await transaction.save({ session });

        let tierFrom = previousTier;

        for (const tier of newlyEarnedTiers) {
            await this._recordTierUpgrade({
                user,
                fromTier: tierFrom,
                toTier: tier,
                session,
            });
            tierFrom = tier;
        }

        if (targetTier !== previousTier) {
            await this._notifyTierChanged(user, previousTier, targetTier, {
                direction: 'upgrade',
            });
        }

        return {
            awarded: true,
            transaction: LoyaltyMapper.toTransactionDTO(transaction),
            tier_changed: targetTier !== previousTier,
            previous_tier: previousTier,
            current_tier: targetTier,
            newly_earned_tiers: newlyEarnedTiers,
        };
    }

    static async _recordTierUpgrade({ user, fromTier, toTier, session }) {
        await LoyaltyTransaction.create(
            [
                {
                    user_id: user._id,
                    type: TRANSACTION_TYPES.TIER_CHANGE,
                    source: TRANSACTION_SOURCES.TIER_UPGRADE,
                    points_amount: 0,
                    coins_amount: 0,
                    balance_after: this._buildBalanceAfter(user),
                    tier_change: {
                        from: fromTier,
                        to: toTier,
                        reason: 'POINTS_THRESHOLD',
                    },
                    metadata: {
                        threshold: toTier,
                    },
                },
            ],
            { session }
        );

        await this._grantTierVoucher(user, toTier, session);
    }

    static async _grantTierVoucher(user, tier, session) {
        const code = TIER_REWARD_DISCOUNT_CODES[tier];

        if (!code) {
            return null;
        }

        const now = new Date();
        const discount = await Discount.findOne({
            code,
            status: 'active',
            is_deleted: false,
            started_at: { $lte: now },
            expiry_date: { $gt: now },
            $expr: {
                $lt: [
                    { $ifNull: ['$usage_count', 0] },
                    '$usage_limit',
                ],
            },
        }).session(session);

        if (!discount) {
            return null;
        }

        const existingClaim = await UserClaimedDiscount.findOne({
            user_id: user._id,
            discount_id: discount._id,
        }).session(session);

        if (existingClaim) {
            return existingClaim;
        }

        if (discount.claim_limit) {
            const reserveResult = await Discount.updateOne(
                {
                    _id: discount._id,
                    $expr: {
                        $lt: [
                            { $ifNull: ['$claim_count', 0] },
                            '$claim_limit',
                        ],
                    },
                },
                { $inc: { claim_count: 1 } },
                { session }
            );

            if (reserveResult.modifiedCount === 0) {
                return null;
            }
        } else {
            await Discount.updateOne(
                { _id: discount._id },
                { $inc: { claim_count: 1 } },
                { session }
            );
        }

        try {
            const [claim] = await UserClaimedDiscount.create(
                [
                    {
                        user_id: user._id,
                        discount_id: discount._id,
                        discount_code: discount.code,
                        status: 'claimed',
                        claimed_at: now,
                    },
                ],
                { session }
            );

            return claim;
        } catch (error) {
            if (error?.code === 11000) {
                return UserClaimedDiscount.findOne({
                    user_id: user._id,
                    discount_id: discount._id,
                }).session(session);
            }

            throw error;
        }
    }

    static _buildBalanceAfter(user) {
        this.ensureUserLoyalty(user);

        return {
            points: user.loyalty.points || 0,
            lifetime_points: user.loyalty.lifetime_points || 0,
            coins_balance: user.loyalty.coins_balance || 0,
            tier: normalizeTier(user.tier || user.loyalty.current_tier),
        };
    }

    static async _notifyTierChanged(user, fromTier, toTier, options = {}) {
        try {
            const isUpgrade = options.direction === 'upgrade';
            await NotificationService.createNotification({
                user_id: user._id,
                type: 'promotion',
                title: isUpgrade
                    ? 'Chuc mung ban da len hang'
                    : 'Hang thanh vien da duoc dieu chinh',
                message: isUpgrade
                    ? `Hang thanh vien cua ban da duoc nang tu ${fromTier} len ${toTier}.`
                    : `Do 6 thang chua co don hang hoan tat, hang thanh vien cua ban da giam tu ${fromTier} xuong ${toTier}.`,
                priority: isUpgrade ? 'medium' : 'low',
                data: {
                    ref_type: null,
                    ref_id: null,
                    extra: {
                        event: isUpgrade
                            ? 'LOYALTY_TIER_UPGRADE'
                            : 'LOYALTY_TIER_DOWNGRADE',
                        from_tier: fromTier,
                        to_tier: toTier,
                    },
                },
            });
        } catch {
            return null;
        }

        return null;
    }
}

module.exports = LoyaltyService;
