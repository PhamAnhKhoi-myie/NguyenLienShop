const Review = require('./review.model');
const Order = require('../orders/order.model');
const ReviewMapper = require('./review.mapper');
const AppError = require('../../utils/appError.util');
const logger = require('../../utils/logger.util');

class ReviewService {
    static async createReview(userId, productId, variantId, orderId, data) {
        const order = await Order.findOne({
            _id: orderId,
            user_id: userId,
            status: 'completed'
        });

        if (!order) {
            throw new AppError(
                'Cannot review unverified purchase',
                403,
                'INVALID_REVIEW_PURCHASE'
            );
        }

        const existing = await Review.findOne(
            {
                user_id: userId,
                product_id: productId,
                variant_id: variantId,
                is_deleted: false
            },
            null,
            { includeUnapproved: true }
        );

        if (existing) {
            throw new AppError(
                'You already reviewed this product',
                409,
                'DUPLICATE_REVIEW'
            );
        }

        const review = await Review.create({
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
        });

        logger.info({
            event: 'review_created',
            review_id: review._id.toString(),
            user_id: userId,
            product_id: productId,
            variant_id: variantId,
            status: 'pending_approval'
        });

        return ReviewMapper.toDTO(review, userId);
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

    static async updateReview(reviewId, userId, data) {
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

        logger.info({
            event: 'review_edited',
            review_id: reviewId,
            user_id: userId,
            edit_count: review.edit_count,
            previously_approved: review.approved_at ? true : false
        });

        return ReviewMapper.toDTO(review, userId);
    }

    static async deleteReview(reviewId, userId) {
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

        review.is_deleted = true;
        review.deleted_at = new Date();
        await review.save();

        logger.info({
            event: 'review_deleted',
            review_id: reviewId,
            user_id: userId
        });

        return { success: true };
    }

    static async markHelpful(reviewId, userId, isHelpful) {
        const review = await Review.findById(reviewId);

        if (!review) {
            throw new AppError('Review not found', 404, 'REVIEW_NOT_FOUND');
        }

        const alreadyHelpful = review.helpful_by?.some(id => id.equals(userId));
        const alreadyUnhelpful = review.unhelpful_by?.some(id => id.equals(userId));

        if (isHelpful) {
            if (alreadyUnhelpful) {
                await Review.updateOne(
                    { _id: reviewId },
                    {
                        $pull: { unhelpful_by: userId },
                        $inc: { unhelpful_count: -1 }
                    }
                );
            }

            if (!alreadyHelpful) {
                await Review.updateOne(
                    { _id: reviewId },
                    {
                        $addToSet: { helpful_by: userId },
                        $inc: { helpful_count: 1 }
                    }
                );
            }
        } else {
            if (alreadyHelpful) {
                await Review.updateOne(
                    { _id: reviewId },
                    {
                        $pull: { helpful_by: userId },
                        $inc: { helpful_count: -1 }
                    }
                );
            }

            if (!alreadyUnhelpful) {
                await Review.updateOne(
                    { _id: reviewId },
                    {
                        $addToSet: { unhelpful_by: userId },
                        $inc: { unhelpful_count: 1 }
                    }
                );
            }
        }

        logger.info({
            event: 'review_voted',
            review_id: reviewId,
            user_id: userId,
            type: isHelpful ? 'helpful' : 'unhelpful'
        });

        return { success: true };
    }

    static async approveReview(reviewId, adminId) {
        const review = await Review.findById(reviewId, null, {
            includeUnapproved: true
        });

        if (!review) {
            throw new AppError('Review not found', 404, 'REVIEW_NOT_FOUND');
        }

        review.is_approved = true;
        review.approved_at = new Date();
        review.approved_by = adminId;
        review.is_flagged = false;

        await review.save();

        logger.info({
            event: 'review_approved',
            review_id: reviewId,
            approved_by: adminId
        });

        return ReviewMapper.toAdminDTO(review);
    }

    static async rejectReview(reviewId, reason, adminId) {
        const review = await Review.findById(reviewId, null, {
            includeUnapproved: true
        });

        if (!review) {
            throw new AppError('Review not found', 404, 'REVIEW_NOT_FOUND');
        }

        review.is_approved = false;
        review.rejected_at = new Date();
        review.rejection_reason = reason;

        await review.save();

        logger.info({
            event: 'review_rejected',
            review_id: reviewId,
            reason,
            rejected_by: adminId
        });

        return ReviewMapper.toAdminDTO(review);
    }

    static async flagReview(reviewId, flagReason, userId) {
        const review = await Review.findById(reviewId);

        if (!review) {
            throw new AppError('Review not found', 404, 'REVIEW_NOT_FOUND');
        }

        review.is_flagged = true;
        review.flag_reason = flagReason;
        review.flagged_by = userId;

        await review.save();

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
}

module.exports = ReviewService;