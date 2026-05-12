const express = require('express');
const router = express.Router({ mergeParams: true });
const validate = require('../../../middlewares/validate.middleware');
const variantUnitController = require('../variant_unit.controller');

const {
    createVariantUnitSchema,
    updateVariantUnitSchema,
    calculatePriceSchema,
    validatePriceTiersSchema,
    unitIdParamSchema,
    variantIdParamSchema
} = require('../variant_unit.validator');

const { authenticate } = require('../../../middlewares/auth.middleware');
const { authorize } = require('../../../middlewares/authorize.middleware');

// ===== PUBLIC =====

router.get(
    '/',
    validate({ params: variantIdParamSchema }),
    variantUnitController.getVariantUnitsByVariant
);

router.get(
    '/default',
    validate({ params: variantIdParamSchema }),
    variantUnitController.getDefaultVariantUnit
);

router.get(
    '/:unitId',
    validate({ params: unitIdParamSchema }),
    variantUnitController.getVariantUnitById
);

router.get(
    '/:unitId/price-tiers',
    validate({ params: unitIdParamSchema }),
    variantUnitController.getPriceTierSummary
);

router.get(
    '/:unitId/max-orderable-qty',
    validate({ params: unitIdParamSchema }),
    variantUnitController.getMaxOrderableQty
);

router.post(
    '/:unitId/calculate-price',
    validate({
        params: unitIdParamSchema,
        body: calculatePriceSchema
    }),
    variantUnitController.calculatePrice
);

// ===== ADMIN =====

router.post(
    '/validate-tiers',
    authenticate,
    authorize(['ADMIN', 'MANAGER']),
    validate({ body: validatePriceTiersSchema }),
    variantUnitController.validatePriceTiers
);

router.post(
    '/',
    authenticate,
    authorize(['ADMIN', 'MANAGER']),
    validate({
        params: variantIdParamSchema,
        body: createVariantUnitSchema
    }),
    variantUnitController.createVariantUnit
);

router.patch(
    '/:unitId',
    authenticate,
    authorize(['ADMIN', 'MANAGER']),
    validate({
        params: unitIdParamSchema,
        body: updateVariantUnitSchema
    }),
    variantUnitController.updateVariantUnit
);

router.delete(
    '/:unitId',
    authenticate,
    authorize(['ADMIN', 'MANAGER']),
    validate({ params: unitIdParamSchema }),
    variantUnitController.deleteVariantUnit
);

module.exports = router;