const express = require('express');
const validate = require('../../middlewares/validate.middleware');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/authorize.middleware');
const DiscountController = require('./discount.controller');

const {
    // params
    IdParamSchema,
    UserIdParamSchema,

    // body
    createDiscountBodySchema,
    updateDiscountBodySchema,
    validateDiscountBodySchema,
    bulkCreateBodySchema,
    duplicateDiscountBodySchema,

    // query
    listDiscountsQuerySchema,
    nearExpiryQuerySchema,
} = require('./discount.validator');

const router = express.Router();

// ===== PUBLIC =====

router.post(
    '/validate',
    validate({ body: validateDiscountBodySchema }),
    DiscountController.validateDiscount
);

router.post(
    '/applicable',
    validate({ body: validateDiscountBodySchema }),
    DiscountController.getApplicableDiscounts
);

// ===== ADMIN =====

router.post(
    '/',
    authenticate,
    authorize(['ADMIN']),
    validate({ body: createDiscountBodySchema }),
    DiscountController.createDiscount
);

router.get(
    '/',
    authenticate,
    authorize(['ADMIN']),
    validate({ query: listDiscountsQuerySchema }),
    DiscountController.listDiscounts
);

router.post(
    '/bulk/import',
    authenticate,
    authorize(['ADMIN']),
    validate({ body: bulkCreateBodySchema }),
    DiscountController.bulkImport
);

router.get(
    '/near-expiry',
    authenticate,
    authorize(['ADMIN']),
    validate({ query: nearExpiryQuerySchema }),
    DiscountController.getNearExpiryDiscounts
);

router.get(
    '/user/:userId',
    authenticate,
    authorize(['ADMIN']),
    validate({
        params: UserIdParamSchema,
        query: listDiscountsQuerySchema.pick({ page: true, limit: true }),
    }),
    DiscountController.getDiscountsForUser
);

// ===== PARAM ROUTES (specific first) =====

router.post(
    '/:discountId/revoke',
    authenticate,
    authorize(['ADMIN']),
    validate({ params: IdParamSchema }),
    DiscountController.revokeDiscount
);

router.post(
    '/:discountId/duplicate',
    authenticate,
    authorize(['ADMIN']),
    validate({
        params: IdParamSchema,
        body: duplicateDiscountBodySchema,
    }),
    DiscountController.duplicateDiscount
);

router.get(
    '/:discountId/stats',
    authenticate,
    authorize(['ADMIN']),
    validate({ params: IdParamSchema }),
    DiscountController.getStatistics
);

router.patch(
    '/:discountId',
    authenticate,
    authorize(['ADMIN']),
    validate({
        params: IdParamSchema,
        body: updateDiscountBodySchema,
    }),
    DiscountController.updateDiscount
);

router.delete(
    '/:discountId',
    authenticate,
    authorize(['ADMIN']),
    validate({ params: IdParamSchema }),
    DiscountController.deleteDiscount
);

router.get(
    '/:discountId',
    authenticate,
    authorize(['ADMIN']),
    validate({ params: IdParamSchema }),
    DiscountController.getDiscount
);

module.exports = router;