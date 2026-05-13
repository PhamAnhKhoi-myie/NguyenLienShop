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

router.get('/product/:productId', ReviewController.getProductReviews);

router.get('/variant/:variantId', ReviewController.getVariantReviews);

router.get('/:reviewId', ReviewController.getOne);

// ============================================
// USER ROUTES (require authentication)
// ============================================

router.post(
    '/',
    authenticate,
    validate(createReviewSchema),
    ReviewController.create
);

router.put(
    '/:reviewId',
    authenticate,
    validate(updateReviewSchema),
    ReviewController.update
);

router.delete(
    '/:reviewId',
    authenticate,
    ReviewController.delete
);

router.get(
    '/user/my-reviews',
    authenticate,
    ReviewController.getUserReviews
);

router.post(
    '/:reviewId/helpful',
    authenticate,
    validate(markHelpfulSchema),
    ReviewController.markHelpful
);

router.post(
    '/:reviewId/flag',
    authenticate,
    validate(flagReviewSchema),
    ReviewController.flagReview
);

// ============================================
// ADMIN ROUTES (require authentication + admin role)
// ============================================

router.get(
    '/admin/pending',
    authenticate,
    authorize(['ADMIN']),
    ReviewController.getPendingReviews
);

router.get(
    '/admin/flagged',
    authenticate,
    authorize(['ADMIN']),
    ReviewController.getFlaggedReviews
);

router.post(
    '/:reviewId/approve',
    authenticate,
    authorize(['ADMIN']),
    ReviewController.approveReview
);

router.post(
    '/:reviewId/reject',
    authenticate,
    authorize(['ADMIN']),
    validate(rejectReviewSchema),
    ReviewController.rejectReview
);

module.exports = router;