const express = require('express');
const validate = require('../../middlewares/validate.middleware');
const {
    authenticate,
    optionalAuthenticate,
} = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/authorize.middleware');
const DiscountController = require('./discount.controller');
const { DISCOUNT_MANAGER_ROLES, ADMIN_ONLY_ROLES } = require('../../constants/roles');

const {

    IdParamSchema,
    UserIdParamSchema,


    createDiscountBodySchema,
    updateDiscountBodySchema,
    validateDiscountBodySchema,
    applicableDiscountsBodySchema,
    bulkCreateBodySchema,
    duplicateDiscountBodySchema,


    listDiscountsQuerySchema,
    nearExpiryQuerySchema,
    publicHomepageDiscountsQuerySchema,
    claimedDiscountsQuerySchema,
} = require('./discount.validator');

const router = express.Router();



router.post(
    '/validate',
    optionalAuthenticate,
    validate({ body: validateDiscountBodySchema }),
    DiscountController.validateDiscount
);

router.post(
    '/applicable',
    optionalAuthenticate,
    validate({ body: applicableDiscountsBodySchema }),
    DiscountController.getApplicableDiscounts
);

router.get(
    '/public/homepage',
    optionalAuthenticate,
    validate({ query: publicHomepageDiscountsQuerySchema }),
    DiscountController.getHomepageDiscounts
);

router.get(
    '/me/claimed',
    authenticate,
    validate({ query: claimedDiscountsQuerySchema }),
    DiscountController.getMyClaimedDiscounts
);

router.post(
    '/:discountId/claim',
    authenticate,
    validate({ params: IdParamSchema }),
    DiscountController.claimDiscount
);



router.post(
    '/',
    authenticate,
    authorize(DISCOUNT_MANAGER_ROLES),
    validate({ body: createDiscountBodySchema }),
    DiscountController.createDiscount
);

router.get(
    '/',
    authenticate,
    authorize(DISCOUNT_MANAGER_ROLES),
    validate({ query: listDiscountsQuerySchema }),
    DiscountController.listDiscounts
);

router.post(
    '/bulk/import',
    authenticate,
    authorize(DISCOUNT_MANAGER_ROLES),
    validate({ body: bulkCreateBodySchema }),
    DiscountController.bulkImport
);

router.get(
    '/near-expiry',
    authenticate,
    authorize(DISCOUNT_MANAGER_ROLES),
    validate({ query: nearExpiryQuerySchema }),
    DiscountController.getNearExpiryDiscounts
);

router.get(
    '/user/:userId',
    authenticate,
    authorize(DISCOUNT_MANAGER_ROLES),
    validate({
        params: UserIdParamSchema,
        query: listDiscountsQuerySchema.pick({ page: true, limit: true }),
    }),
    DiscountController.getDiscountsForUser
);



router.post(
    '/:discountId/revoke',
    authenticate,
    authorize(DISCOUNT_MANAGER_ROLES),
    validate({ params: IdParamSchema }),
    DiscountController.revokeDiscount
);

router.post(
    '/:discountId/duplicate',
    authenticate,
    authorize(DISCOUNT_MANAGER_ROLES),
    validate({
        params: IdParamSchema,
        body: duplicateDiscountBodySchema,
    }),
    DiscountController.duplicateDiscount
);

router.get(
    '/:discountId/stats',
    authenticate,
    authorize(DISCOUNT_MANAGER_ROLES),
    validate({ params: IdParamSchema }),
    DiscountController.getStatistics
);

router.patch(
    '/:discountId',
    authenticate,
    authorize(DISCOUNT_MANAGER_ROLES),
    validate({
        params: IdParamSchema,
        body: updateDiscountBodySchema,
    }),
    DiscountController.updateDiscount
);

router.delete(
    '/:discountId',
    authenticate,
    authorize(ADMIN_ONLY_ROLES),
    validate({ params: IdParamSchema }),
    DiscountController.deleteDiscount
);

router.get(
    '/:discountId',
    authenticate,
    authorize(DISCOUNT_MANAGER_ROLES),
    validate({ params: IdParamSchema }),
    DiscountController.getDiscount
);

module.exports = router;
