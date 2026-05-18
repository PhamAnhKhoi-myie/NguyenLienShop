const router = require('express').Router();
const ReviewController = require('./review.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/authorize.middleware');
const validate = require('../../middlewares/validate.middleware');
const {
    reviewIdParamSchema,
    productIdParamSchema,
    variantIdParamSchema,
    createReviewSchema,
    updateReviewSchema,
    markHelpfulSchema,
    rejectReviewSchema,
    flagReviewSchema
} = require('./review.validator');

// ============================================
// PUBLIC ROUTES (no auth required)
// ============================================

router.get(
    '/product/:productId',
    validate({ params: productIdParamSchema }),
    ReviewController.getProductReviews
);

router.get(
    '/variant/:variantId',
    validate({ params: variantIdParamSchema }),
    ReviewController.getVariantReviews
);

router.get(
    '/:reviewId',
    validate({ params: reviewIdParamSchema }),
    ReviewController.getOne
);

// ============================================
// USER ROUTES (require authentication)
// ============================================

router.post(
    '/',
    authenticate,
    validate({ body: createReviewSchema }),
    ReviewController.create
);

router.put(
    '/:reviewId',
    authenticate,
    validate({ params: reviewIdParamSchema, body: updateReviewSchema }),
    ReviewController.update
);

router.delete(
    '/:reviewId',
    authenticate,
    validate({ params: reviewIdParamSchema }),
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
    validate({ params: reviewIdParamSchema, body: markHelpfulSchema }),
    ReviewController.markHelpful
);

router.post(
    '/:reviewId/flag',
    authenticate,
    validate({ params: reviewIdParamSchema, body: flagReviewSchema }),
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
    validate({ params: reviewIdParamSchema }),
    ReviewController.approveReview
);

router.post(
    '/:reviewId/reject',
    authenticate,
    authorize(['ADMIN']),
    validate({ params: reviewIdParamSchema, body: rejectReviewSchema }),
    ReviewController.rejectReview
);

module.exports = router;
