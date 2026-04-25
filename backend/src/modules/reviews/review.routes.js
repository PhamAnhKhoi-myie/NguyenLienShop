const router = require('express').Router();
const ReviewController = require('./review.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/authorize.middleware');
const validate = require('../../middlewares/validate.middleware');
const {
    createReviewSchema,
    updateReviewSchema,
    markHelpfulSchema,
    rejectReviewSchema,
    flagReviewSchema
} = require('./review.validator');

// ============================================
// PUBLIC ROUTES (no auth required)
// ============================================

// Get reviews for product (paginated, approved only)
router.get('/product/:productId', ReviewController.getProductReviews);

// Get reviews for variant (paginated, approved only)
router.get('/variant/:variantId', ReviewController.getVariantReviews);

// Get single review (public)
router.get('/:reviewId', ReviewController.getOne);

// ============================================
// USER ROUTES (require authentication)
// ============================================

// Create review (with validation)
router.post(
    '/',
    authenticate,
    validate(createReviewSchema),
    ReviewController.create
);

// Update own review (with validation)
router.put(
    '/:reviewId',
    authenticate,
    validate(updateReviewSchema),
    ReviewController.update
);

// Delete own review
router.delete(
    '/:reviewId',
    authenticate,
    ReviewController.delete
);

// Get own reviews (paginated)
router.get(
    '/user/my-reviews',
    authenticate,
    ReviewController.getUserReviews
);

// Mark review as helpful/unhelpful (with validation)
router.post(
    '/:reviewId/helpful',
    authenticate,
    validate(markHelpfulSchema),
    ReviewController.markHelpful
);

// Flag review for moderation (with validation)
router.post(
    '/:reviewId/flag',
    authenticate,
    validate(flagReviewSchema),
    ReviewController.flagReview
);

// ============================================
// ADMIN ROUTES (require authentication + admin role)
// ============================================

// Get pending reviews (admin moderation)
router.get(
    '/admin/pending',
    authenticate,
    authorize('admin'),
    ReviewController.getPendingReviews
);

// Get flagged reviews (admin review)
router.get(
    '/admin/flagged',
    authenticate,
    authorize('admin'),
    ReviewController.getFlaggedReviews
);

// Approve review (admin)
router.post(
    '/:reviewId/approve',
    authenticate,
    authorize('admin'),
    ReviewController.approveReview
);

// Reject review with reason (admin, with validation)
router.post(
    '/:reviewId/reject',
    authenticate,
    authorize('admin'),
    validate(rejectReviewSchema),
    ReviewController.rejectReview
);

module.exports = router;