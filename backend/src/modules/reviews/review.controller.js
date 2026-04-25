const ReviewService = require('./review.service');
const ReviewMapper = require('./review.mapper');
const asyncHandler = require('../../utils/asyncHandler.util');

class ReviewController {
    // ✅ PUBLIC - Get reviews for product
    static getProductReviews = asyncHandler(async (req, res) => {
        const { productId } = req.params;
        const { page = 1, limit = 10 } = req.query;

        const result = await ReviewService.getProductReviews(
            productId,
            parseInt(page),
            parseInt(limit)
        );

        res.status(200).json({
            success: true,
            data: result.reviews,
            pagination: result.pagination
        });
    });

    // ✅ PUBLIC - Get single review
    static getOne = asyncHandler(async (req, res) => {
        const { reviewId } = req.params;
        const currentUserId = req.user?.id || null;

        const review = await ReviewService.getReviewById(reviewId, currentUserId);

        res.status(200).json({
            success: true,
            data: review
        });
    });

    // ✅ USER - Create review
    static create = asyncHandler(async (req, res) => {
        const { product_id, variant_id, order_id, rating, title, content } =
            req.body;

        const review = await ReviewService.createReview(
            req.user.id,
            product_id,
            variant_id,
            order_id,
            { rating, title, content }
        );

        res.status(201).json({
            success: true,
            data: review
        });
    });

    // ✅ USER - Update own review
    static update = asyncHandler(async (req, res) => {
        const { reviewId } = req.params;
        const { rating, title, content } = req.body;

        const review = await ReviewService.updateReview(
            reviewId,
            req.user.id,
            { rating, title, content }
        );

        res.status(200).json({
            success: true,
            data: review
        });
    });

    // ✅ USER - Delete own review
    static delete = asyncHandler(async (req, res) => {
        const { reviewId } = req.params;

        await ReviewService.deleteReview(reviewId, req.user.id);

        res.status(200).json({
            success: true,
            message: 'Review deleted successfully'
        });
    });

    // ✅ USER - Mark review as helpful/unhelpful
    static markHelpful = asyncHandler(async (req, res) => {
        const { reviewId } = req.params;
        const { helpful } = req.body;

        await ReviewService.markHelpful(reviewId, req.user.id, helpful);

        res.status(200).json({
            success: true,
            message: 'Vote recorded successfully'
        });
    });

    // ✅ USER - Get own reviews
    static getUserReviews = asyncHandler(async (req, res) => {
        const { page = 1, limit = 10 } = req.query;

        const result = await ReviewService.getUserReviews(
            req.user.id,
            parseInt(page),
            parseInt(limit)
        );

        res.status(200).json({
            success: true,
            data: result.reviews,
            pagination: result.pagination
        });
    });

    // ✅ PUBLIC - Get reviews for variant
    static getVariantReviews = asyncHandler(async (req, res) => {
        const { variantId } = req.params;
        const { page = 1, limit = 10 } = req.query;

        const result = await ReviewService.getVariantReviews(
            variantId,
            parseInt(page),
            parseInt(limit)
        );

        res.status(200).json({
            success: true,
            data: result.reviews,
            pagination: result.pagination
        });
    });

    // ✅ USER - Flag review
    static flagReview = asyncHandler(async (req, res) => {
        const { reviewId } = req.params;
        const { reason } = req.body;

        const review = await ReviewService.flagReview(
            reviewId,
            reason,
            req.user.id
        );

        res.status(200).json({
            success: true,
            data: review,
            message: 'Review flagged successfully'
        });
    });

    // ✅ ADMIN - Get pending reviews
    static getPendingReviews = asyncHandler(async (req, res) => {
        const { page = 1, limit = 20 } = req.query;

        const result = await ReviewService.getPendingReviews(
            parseInt(page),
            parseInt(limit)
        );

        res.status(200).json({
            success: true,
            data: result.reviews,
            pagination: result.pagination
        });
    });

    // ✅ ADMIN - Get flagged reviews
    static getFlaggedReviews = asyncHandler(async (req, res) => {
        const { page = 1, limit = 20 } = req.query;

        const result = await ReviewService.getFlaggedReviews(
            parseInt(page),
            parseInt(limit)
        );

        res.status(200).json({
            success: true,
            data: result.reviews,
            pagination: result.pagination
        });
    });

    // ✅ ADMIN - Approve review
    static approveReview = asyncHandler(async (req, res) => {
        const { reviewId } = req.params;

        const review = await ReviewService.approveReview(reviewId, req.user.id);

        res.status(200).json({
            success: true,
            data: review,
            message: 'Review approved successfully'
        });
    });

    // ✅ ADMIN - Reject review
    static rejectReview = asyncHandler(async (req, res) => {
        const { reviewId } = req.params;
        const { reason } = req.body;

        const review = await ReviewService.rejectReview(
            reviewId,
            reason,
            req.user.id
        );

        res.status(200).json({
            success: true,
            data: review,
            message: 'Review rejected successfully'
        });
    });
}

module.exports = ReviewController;