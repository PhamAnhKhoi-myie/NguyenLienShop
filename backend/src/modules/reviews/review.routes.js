const router = require('express').Router();
const ReviewController = require('./review.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/authorize.middleware');
const { REVIEW_MANAGER_ROLES } = require('../../constants/roles');
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





router.get(
    '/admin/pending',
    authenticate,
    authorize(REVIEW_MANAGER_ROLES),
    ReviewController.getPendingReviews
);

router.get(
    '/admin/flagged',
    authenticate,
    authorize(REVIEW_MANAGER_ROLES),
    ReviewController.getFlaggedReviews
);

router.post(
    '/:reviewId/approve',
    authenticate,
    authorize(REVIEW_MANAGER_ROLES),
    validate({ params: reviewIdParamSchema }),
    ReviewController.approveReview
);

router.post(
    '/:reviewId/reject',
    authenticate,
    authorize(REVIEW_MANAGER_ROLES),
    validate({ params: reviewIdParamSchema, body: rejectReviewSchema }),
    ReviewController.rejectReview
);

module.exports = router;
