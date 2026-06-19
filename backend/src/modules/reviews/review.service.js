const Review = require('./review.model');
const Order = require('../orders/order.model');
const mongoose = require('mongoose');
const ReviewMapper = require('./review.mapper');
const AppError = require('../../utils/appError.util');
const logger = require('../../utils/logger.util');
const ReviewAuditLogService = require('../audit_logs/review_audit_log/review_log.service');
const { AUDIT_ACTIONS } = require('../../constants/audit');
const { isReviewWindowOpen } = require('../orders/order_review_window.util');
const LoyaltyService = require('../loyalty/loyalty.service');

class ReviewService {
    static async createReview(userId, productId, variantId, orderId, data, metadata = {}) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const order = await Order.findOne({
                _id: orderId,
                user_id: userId,
                status: 'DELIVERED'
            }).session(session);

            if (!order) {
                throw new AppError(
                    'Cannot review unverified purchase',
                    403,
                    'INVALID_REVIEW_PURCHASE'
                );
            }

            if (!order.customer_receipt?.confirmed_at) {
                throw new AppError(
                    'Please confirm that you received the order before reviewing',
                    409,
                    'ORDER_RECEIPT_NOT_CONFIRMED'
                );
            }

            if (!isReviewWindowOpen(order)) {
                throw new AppError(
                    'Review period has expired',
                    409,
                    'ORDER_REVIEW_EXPIRED'
                );
            }

            const purchasedItem = order.items.find(item => {
                return (
                    item.product_id?.toString() === productId &&
                    item.variant_id?.toString() === variantId
                );
            });

            if (!purchasedItem) {
                throw new AppError(
                    'Cannot review item not purchased in this order',
                    403,
                    'INVALID_REVIEW_ITEM'
                );
            }

            const existing = await Review.findOne({
                user_id: userId,
                product_id: productId,
                variant_id: variantId,
                is_deleted: false
            })
                .setOptions({ includeUnapproved: true })
                .session(session);

            if (existing) {
                throw new AppError(
                    'You already reviewed this product',
                    409,
                    'DUPLICATE_REVIEW'
                );
            }

            const [review] = await Review.create(
                [{
                    user_id: userId,
                    product_id: productId,
                    variant_id: variantId,
                    order_id: orderId,
                    is_verified_purchase: true,

                    rating: {
                        overall: data.rating
                    },
                    title: data.title || null,
                    content: data.content,

                    is_approved: false,
                    created_at: new Date(),
                    updated_at: new Date()
                }],
                { session }
            );

            order.items.forEach(item => {
                if (
                    item.product_id?.toString() === productId &&
                    item.variant_id?.toString() === variantId
                ) {
                    item.review_status = 'reviewed';
                }
            });

            await order.save({ session });

            await this._createReviewAuditLog({
                action: AUDIT_ACTIONS.CREATE_REVIEW,
                review,
                actorId: userId,
                actorType: 'USER',
                metadata,
                changes: this._buildCreatedChanges(review, [
                    'rating',
                    'title',
                    'content',
                    'is_verified_purchase',
                    'is_approved',
                    'is_flagged',
                    'order_id',
                ]),
                auditOptions: {
                    session,
                    throwOnError: true,
                },
            });

            await LoyaltyService.awardOrderReviewRewards(order, { session });

            await session.commitTransaction();

            logger.info({
                event: 'review_created',
                review_id: review._id.toString(),
                user_id: userId,
                product_id: productId,
                variant_id: variantId,
                status: 'pending_approval'
            });

            return ReviewMapper.toDTO(review, userId);
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    static async getProductReviews(productId, page = 1, limit = 10) {
        const skip = (page - 1) * limit;

        const reviews = await Review.find({
            product_id: productId
        })
            .sort({ helpful_count: -1, created_at: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Review.countDocuments({
            product_id: productId
        });

        return {
            reviews: ReviewMapper.toPublicDTOList(reviews),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    static async getReviewById(reviewId, currentUserId = null) {
        const review = await Review.findById(reviewId);

        if (!review) {
            throw new AppError('Review not found', 404, 'REVIEW_NOT_FOUND');
        }

        return ReviewMapper.toPublicDTO(review, currentUserId);
    }

    static async updateReview(reviewId, userId, data, metadata = {}) {
        const review = await Review.findOne(
            {
                _id: reviewId,
                user_id: userId,
                is_deleted: false
            },
            null,
            { includeUnapproved: true }
        );

        if (!review) {
            throw new AppError('Review not found', 404, 'REVIEW_NOT_FOUND');
        }

        const before = review.toObject();

        if (!review.original_content) {
            review.original_content = review.content;
        }

        if (data.content) {
            review.content = data.content;
        }
        if (data.title !== undefined) {
            review.title = data.title;
        }
        if (data.rating) {
            review.rating.overall = data.rating;
        }

        review.edited_at = new Date();
        review.edit_count = (review.edit_count || 0) + 1;

        review.is_approved = false;
        review.approved_at = null;

        await review.save();

        await this._createReviewAuditLog({
            action: AUDIT_ACTIONS.UPDATE_REVIEW,
            review,
            actorId: userId,
            actorType: 'USER',
            metadata,
            changes: this._buildUpdatedChanges(
                before,
                review,
                [
                    ...Object.keys(data),
                    'edit_count',
                    'edited_at',
                    'is_approved',
                    'approved_at',
                ]
            ),
        });

        logger.info({
            event: 'review_edited',
            review_id: reviewId,
            user_id: userId,
            edit_count: review.edit_count,
            previously_approved: review.approved_at ? true : false
        });

        return ReviewMapper.toDTO(review, userId);
    }

    static async deleteReview(reviewId, userId, metadata = {}) {
        const review = await Review.findOne(
            {
                _id: reviewId,
                user_id: userId,
                is_deleted: false
            },
            null,
            { includeUnapproved: true }
        );

        if (!review) {
            throw new AppError('Review not found', 404, 'REVIEW_NOT_FOUND');
        }

        const before = review.toObject();

        review.is_deleted = true;
        review.deleted_at = new Date();
        await review.save();

        await this._createReviewAuditLog({
            action: AUDIT_ACTIONS.DELETE_REVIEW_SOFT,
            review,
            actorId: userId,
            actorType: 'USER',
            metadata,
            changes: this._buildUpdatedChanges(
                before,
                review,
                ['is_deleted', 'deleted_at']
            ),
        });

        logger.info({
            event: 'review_deleted',
            review_id: reviewId,
            user_id: userId
        });

        return { success: true };
    }

    static async markHelpful(reviewId, userId, isHelpful) {
        const voteUserId = new mongoose.Types.ObjectId(userId);
        const helpfulUpdate = isHelpful
            ? {
                $setUnion: [
                    { $ifNull: ['$helpful_by', []] },
                    [voteUserId]
                ]
            }
            : {
                $setDifference: [
                    { $ifNull: ['$helpful_by', []] },
                    [voteUserId]
                ]
            };
        const unhelpfulUpdate = isHelpful
            ? {
                $setDifference: [
                    { $ifNull: ['$unhelpful_by', []] },
                    [voteUserId]
                ]
            }
            : {
                $setUnion: [
                    { $ifNull: ['$unhelpful_by', []] },
                    [voteUserId]
                ]
            };

        const review = await Review.findOneAndUpdate(
            { _id: reviewId },
            [
                {
                    $set: {
                        helpful_by: helpfulUpdate,
                        unhelpful_by: unhelpfulUpdate
                    }
                },
                {
                    $set: {
                        helpful_count: { $size: { $ifNull: ['$helpful_by', []] } },
                        unhelpful_count: { $size: { $ifNull: ['$unhelpful_by', []] } },
                        updated_at: '$$NOW'
                    }
                }
            ],
            { new: true }
        );

        if (!review) {
            throw new AppError('Review not found', 404, 'REVIEW_NOT_FOUND');
        }

        logger.info({
            event: 'review_voted',
            review_id: reviewId,
            user_id: userId,
            type: isHelpful ? 'helpful' : 'unhelpful'
        });

        return { success: true };
    }

    static async approveReview(reviewId, adminId, metadata = {}) {
        const review = await Review.findById(reviewId, null, {
            includeUnapproved: true
        });

        if (!review) {
            throw new AppError('Review not found', 404, 'REVIEW_NOT_FOUND');
        }

        const before = review.toObject();

        review.is_approved = true;
        review.approved_at = new Date();
        review.approved_by = adminId;
        review.is_flagged = false;

        await review.save();

        await this._createReviewAuditLog({
            action: AUDIT_ACTIONS.APPROVE_REVIEW,
            review,
            actorId: adminId,
            actorType: metadata.actorType || 'ADMIN',
            metadata,
            changes: this._buildUpdatedChanges(
                before,
                review,
                ['is_approved', 'approved_at', 'approved_by', 'is_flagged']
            ),
        });

        logger.info({
            event: 'review_approved',
            review_id: reviewId,
            approved_by: adminId
        });

        return ReviewMapper.toAdminDTO(review);
    }

    static async rejectReview(reviewId, reason, adminId, metadata = {}) {
        const review = await Review.findById(reviewId, null, {
            includeUnapproved: true
        });

        if (!review) {
            throw new AppError('Review not found', 404, 'REVIEW_NOT_FOUND');
        }

        const before = review.toObject();

        review.is_approved = false;
        review.rejected_at = new Date();
        review.rejection_reason = reason;

        await review.save();

        await this._createReviewAuditLog({
            action: AUDIT_ACTIONS.REJECT_REVIEW,
            review,
            actorId: adminId,
            actorType: metadata.actorType || 'ADMIN',
            metadata,
            changes: this._buildUpdatedChanges(
                before,
                review,
                ['is_approved', 'rejected_at', 'rejection_reason']
            ),
        });

        logger.info({
            event: 'review_rejected',
            review_id: reviewId,
            reason,
            rejected_by: adminId
        });

        return ReviewMapper.toAdminDTO(review);
    }

    static async flagReview(reviewId, flagReason, userId, metadata = {}) {
        const review = await Review.findById(reviewId);

        if (!review) {
            throw new AppError('Review not found', 404, 'REVIEW_NOT_FOUND');
        }

        const before = review.toObject();

        review.is_flagged = true;
        review.flag_reason = flagReason;
        review.flagged_by = userId;

        await review.save();

        await this._createReviewAuditLog({
            action: AUDIT_ACTIONS.FLAG_REVIEW,
            review,
            actorId: userId,
            actorType: 'USER',
            metadata,
            changes: this._buildUpdatedChanges(
                before,
                review,
                ['is_flagged', 'flag_reason', 'flagged_by']
            ),
        });

        logger.warn({
            event: 'review_flagged',
            review_id: reviewId,
            flag_reason: flagReason,
            flagged_by: userId
        });

        return ReviewMapper.toDTO(review, userId);
    }

    static async getPendingReviews(page = 1, limit = 20) {
        const skip = (page - 1) * limit;

        const reviews = await Review.find(
            { is_approved: false, is_deleted: false },
            null,
            { includeUnapproved: true }
        )
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Review.countDocuments(
            { is_approved: false, is_deleted: false },
            { includeUnapproved: true }
        );

        return {
            reviews: ReviewMapper.toAdminDTOList(reviews),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    static async getFlaggedReviews(page = 1, limit = 20) {
        const skip = (page - 1) * limit;

        const reviews = await Review.find(
            { is_flagged: true, is_deleted: false },
            null,
            { includeUnapproved: true }
        )
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Review.countDocuments(
            { is_flagged: true, is_deleted: false },
            { includeUnapproved: true }
        );

        return {
            reviews: ReviewMapper.toAdminDTOList(reviews),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    static async getUserReviews(userId, page = 1, limit = 10) {
        const skip = (page - 1) * limit;

        const reviews = await Review.find(
            {
                user_id: userId,
                is_deleted: false
            },
            null,
            { includeUnapproved: true }
        )
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Review.countDocuments(
            {
                user_id: userId,
                is_deleted: false
            },
            { includeUnapproved: true }
        );

        return {
            reviews: ReviewMapper.toDTOList(reviews, userId),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    static async getVariantReviews(variantId, page = 1, limit = 10) {
        const skip = (page - 1) * limit;

        const reviews = await Review.find({
            variant_id: variantId
        })
            .sort({ helpful_count: -1, created_at: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Review.countDocuments({
            variant_id: variantId
        });

        return {
            reviews: ReviewMapper.toPublicDTOList(reviews),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    static _getModerationStatus(review) {
        if (review?.is_deleted) {
            return 'DELETED';
        }
        if (review?.rejected_at) {
            return 'REJECTED';
        }
        if (review?.is_flagged) {
            return 'FLAGGED';
        }
        if (review?.is_approved) {
            return 'APPROVED';
        }

        return 'PENDING';
    }

    static _buildCreatedChanges(review, fields = []) {
        const doc = review?.toObject ? review.toObject() : review;

        return fields.reduce((changes, field) => {
            changes[field] = {
                from: null,
                to: this._toAuditValue(doc?.[field]),
            };

            return changes;
        }, {});
    }

    static _buildUpdatedChanges(beforeReview, afterReview, fields = []) {
        const before = beforeReview?.toObject ? beforeReview.toObject() : beforeReview;
        const after = afterReview?.toObject ? afterReview.toObject() : afterReview;

        return [...new Set(fields)].reduce((changes, field) => {
            const from = this._toAuditValue(before?.[field]);
            const to = this._toAuditValue(after?.[field]);

            if (!this._auditValuesEqual(from, to)) {
                changes[field] = { from, to };
            }

            return changes;
        }, {});
    }

    static _toAuditValue(value) {
        if (value === undefined || value === null) {
            return null;
        }
        if (value instanceof Date) {
            return value.toISOString();
        }
        if (value instanceof mongoose.Types.ObjectId) {
            return value.toString();
        }
        if (Array.isArray(value)) {
            return value.map((item) => this._toAuditValue(item));
        }
        if (value?.toObject) {
            return this._toAuditValue(value.toObject());
        }
        if (typeof value === 'object') {
            return Object.fromEntries(
                Object.entries(value).map(([key, item]) => [
                    key,
                    this._toAuditValue(item),
                ])
            );
        }

        return value;
    }

    static _auditValuesEqual(left, right) {
        return JSON.stringify(left) === JSON.stringify(right);
    }

    static async _createReviewAuditLog({
        action,
        review,
        actorId = null,
        actorType = 'USER',
        metadata = {},
        changes = {},
        auditOptions = {},
    }) {
        await ReviewAuditLogService.createLog({
            actor_id: actorId,
            actor_type: actorType,
            action,
            review_id: review._id,
            user_id: review.user_id || null,
            product_id: review.product_id || null,
            variant_id: review.variant_id || null,
            order_id: review.order_id || null,
            moderation_status: this._getModerationStatus(review),
            changes: this._toAuditValue(changes),
            ip_address: metadata.ip || null,
            user_agent: metadata.userAgent || null,
        }, auditOptions);
    }
}

module.exports = ReviewService;
