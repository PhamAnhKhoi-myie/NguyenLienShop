const express = require('express');
const router = express.Router({ mergeParams: true });
const validate = require('../../../middlewares/validate.middleware');
const variantController = require('../variant.controller');
const {
    createVariantSchema,
    updateVariantSchema,
    reserveStockSchema,
    completeSaleSchema,
    releaseReservedStockSchema,
    getMaxOrderQtySchema,
    variantIdParamSchema,
    productIdParamSchema
} = require('../variant.validator');

const { authenticate } = require('../../../middlewares/auth.middleware');
const { authorize } = require('../../../middlewares/authorize.middleware');
const { requireInternal } = require('../../../middlewares/internal.middleware');



router.get(
    '/',
    validate({ params: productIdParamSchema }),
    variantController.getVariantsByProduct
);



router.post(
    '/',
    authenticate,
    authorize(['ADMIN', 'MANAGER']),
    validate({
        params: productIdParamSchema,
        body: createVariantSchema
    }),
    variantController.createVariant
);



router.get(
    '/:variantId/stock',
    validate({ params: variantIdParamSchema }),
    variantController.checkVariantStock
);

router.get(
    '/:variantId/max-order-qty',
    validate({
        params: variantIdParamSchema,
        query: getMaxOrderQtySchema
    }),
    variantController.getMaxOrderQty
);

router.get(
    '/:variantId',
    validate({ params: variantIdParamSchema }),
    variantController.getVariantById
);

router.patch(
    '/:variantId',
    authenticate,
    authorize(['ADMIN', 'MANAGER']),
    validate({
        params: variantIdParamSchema,
        body: updateVariantSchema
    }),
    variantController.updateVariant
);

router.delete(
    '/:variantId',
    authenticate,
    authorize(['ADMIN', 'MANAGER']),
    validate({ params: variantIdParamSchema }),
    variantController.deleteVariant
);



router.post(
    '/:variantId/reserve-stock',
    requireInternal,
    validate({
        params: variantIdParamSchema,
        body: reserveStockSchema
    }),
    variantController.reserveStock
);

router.post(
    '/:variantId/complete-sale',
    requireInternal,
    validate({
        params: variantIdParamSchema,
        body: completeSaleSchema
    }),
    variantController.completeSale
);

router.post(
    '/:variantId/release-stock',
    requireInternal,
    validate({
        params: variantIdParamSchema,
        body: releaseReservedStockSchema
    }),
    variantController.releaseReservedStock
);

module.exports = router;