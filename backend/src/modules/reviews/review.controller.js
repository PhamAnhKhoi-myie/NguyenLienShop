const ReviewService = require('./review.service');
const ReviewMapper = require('./review.mapper');
const asyncHandler = require('../../utils/asyncHandler.util');
const { assertAuthenticated } = require('../../utils/auth.util');
const { buildAuditMetadata } = require('../../utils/audit.util');

class ReviewController {
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

    static getOne = asyncHandler(async (req, res) => {
        const { reviewId } = req.params;
        const currentUserId = req.user?.id || null;

        const review = await ReviewService.getReviewById(reviewId, currentUserId);

        res.status(200).json({
            success: true,
            data: review
        });
    });

    static create = asyncHandler(async (req, res) => {
        const user = assertAuthenticated(req.user);
        const { product_id, variant_id, order_id, rating, title, content } =
            req.body;

        const review = await ReviewService.createReview(
            user.userId,
            product_id,
            variant_id,
            order_id,
            { rating, title, content },
            buildAuditMetadata(req)
        );

        res.status(201).json({
            success: true,
            data: review
        });
    });

    static update = asyncHandler(async (req, res) => {
        const user = assertAuthenticated(req.user);
        const { reviewId } = req.params;
        const { rating, title, content } = req.body;

        const review = await ReviewService.updateReview(
            reviewId,
            user.userId,
            { rating, title, content },
            buildAuditMetadata(req)
        );

        res.status(200).json({
            success: true,
            data: review
        });
    });

    static delete = asyncHandler(async (req, res) => {
        const user = assertAuthenticated(req.user);
        const { reviewId } = req.params;

        await ReviewService.deleteReview(
            reviewId,
            user.userId,
            buildAuditMetadata(req)
        );

        res.status(200).json({
            success: true,
            message: 'Review deleted successfully'
        });
    });

    static markHelpful = asyncHandler(async (req, res) => {
        const { reviewId } = req.params;
        const { helpful } = req.body;

        await ReviewService.markHelpful(reviewId, req.user.id, helpful);

        res.status(200).json({
            success: true,
            message: 'Vote recorded successfully'
        });
    });

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

    static flagReview = asyncHandler(async (req, res) => {
        const user = assertAuthenticated(req.user);
        const { reviewId } = req.params;
        const { reason } = req.body;

        const review = await ReviewService.flagReview(
            reviewId,
            reason,
            user.userId,
            buildAuditMetadata(req)
        );

        res.status(200).json({
            success: true,
            data: review,
            message: 'Review flagged successfully'
        });
    });

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

    static approveReview = asyncHandler(async (req, res) => {
        const user = assertAuthenticated(req.user);
        const { reviewId } = req.params;

        const review = await ReviewService.approveReview(
            reviewId,
            user.userId,
            buildAuditMetadata(req)
        );

        res.status(200).json({
            success: true,
            data: review,
            message: 'Review approved successfully'
        });
    });

    static rejectReview = asyncHandler(async (req, res) => {
        const user = assertAuthenticated(req.user);
        const { reviewId } = req.params;
        const { reason } = req.body;

        const review = await ReviewService.rejectReview(
            reviewId,
            reason,
            user.userId,
            buildAuditMetadata(req)
        );

        res.status(200).json({
            success: true,
            data: review,
            message: 'Review rejected successfully'
        });
    });
}

module.exports = ReviewController;
