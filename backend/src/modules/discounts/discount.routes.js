const express = require('express');
const validate = require('../../middlewares/validate.middleware');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/authorize.middleware');
const DiscountController = require('./discount.controller');
const {
    createDiscountSchema,
    updateDiscountSchema,
    validateDiscountSchema,
    bulkCreateSchema,
    listDiscountsQuerySchema,
    getDiscountParamSchema,
    updateDiscountParamSchema,
    deleteDiscountParamSchema,
} = require('./discount.validator');

const router = express.Router();

/**
 * PUBLIC ROUTES (No authentication required)
 */

/**
 * POST /api/v1/discounts/validate
 * Validate discount code and calculate applicable discount for checkout
 */
router.post('/validate', validate(validateDiscountSchema), DiscountController.validateDiscount);

/**
 * POST /api/v1/discounts/applicable
 * Get list of applicable discounts for a given cart
 */
router.post('/applicable', DiscountController.getApplicableDiscounts);

/**
 * ADMIN ROUTES (Require authentication + ADMIN authorization)
 * All routes below require both auth and admin role
 */

/**
 * POST /api/v1/discounts
 * Create new discount campaign
 */
router.post(
    '/',
    authenticate,
    authorize(['ADMIN']),
    validate(createDiscountSchema),
    DiscountController.createDiscount
);

/**
 * GET /api/v1/discounts
 * List all discounts with filters and pagination
 */
router.get(
    '/',
    authenticate,
    authorize(['ADMIN']),
    validate(listDiscountsQuerySchema),
    DiscountController.listDiscounts
);

/**
 * POST /api/v1/discounts/bulk/import
 * Bulk import discounts from CSV/array
 * IMPORTANT: Must come AFTER specific routes like /validate, /applicable, /{discountId}
 */
router.post(
    '/bulk/import',
    authenticate,
    authorize(['ADMIN']),
    validate(bulkCreateSchema),
    DiscountController.bulkImport
);

/**
 * GET /api/v1/discounts/near-expiry
 * Get discounts that are expiring soon (for admin dashboard alerts)
 * IMPORTANT: Must come BEFORE /{discountId} dynamic routes
 */
router.get(
    '/near-expiry',
    authenticate,
    authorize(['ADMIN']),
    DiscountController.getNearExpiryDiscounts
);

/**
 * GET /api/v1/discounts/user/:userId
 * Get applicable discounts for a specific user (for admin/support)
 * IMPORTANT: Must come BEFORE /{discountId} dynamic routes
 */
router.get(
    '/user/:userId',
    authenticate,
    authorize(['ADMIN']),
    DiscountController.getDiscountsForUser
);

/**
 * GET /api/v1/discounts/:discountId
 * Get single discount detail
 */
router.get(
    '/:discountId',
    authenticate,
    authorize(['ADMIN']),
    validate(getDiscountParamSchema),
    DiscountController.getDiscount
);

/**
 * PATCH /api/v1/discounts/:discountId
 * Update discount
 */
router.patch(
    '/:discountId',
    authenticate,
    authorize(['ADMIN']),
    validate(updateDiscountParamSchema),
    validate(updateDiscountSchema),
    DiscountController.updateDiscount
);

/**
 * DELETE /api/v1/discounts/:discountId
 * Soft delete discount
 */
router.delete(
    '/:discountId',
    authenticate,
    authorize(['ADMIN']),
    validate(deleteDiscountParamSchema),
    DiscountController.deleteDiscount
);

/**
 * POST /api/v1/discounts/:discountId/revoke
 * Mark discount as inactive (without deleting)
 */
router.post(
    '/:discountId/revoke',
    authenticate,
    authorize(['ADMIN']),
    validate(getDiscountParamSchema),
    DiscountController.revokeDiscount
);

/**
 * POST /api/v1/discounts/:discountId/duplicate
 * Clone discount with new code
 */
router.post(
    '/:discountId/duplicate',
    authenticate,
    authorize(['ADMIN']),
    validate(getDiscountParamSchema),
    DiscountController.duplicateDiscount
);

/**
 * GET /api/v1/discounts/:discountId/stats
 * Get discount usage statistics
 */
router.get(
    '/:discountId/stats',
    authenticate,
    authorize(['ADMIN']),
    validate(getDiscountParamSchema),
    DiscountController.getStatistics
);

module.exports = router;
