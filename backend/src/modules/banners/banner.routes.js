const express = require('express');
const router = express.Router();

const BannerController = require('./banner.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/authorize.middleware');
const validate = require('../../middlewares/validate.middleware');
const {
    createBannerSchema,
    updateBannerSchema
} = require('./banner.validator');

/**
 * ✅ CRITICAL: Specific routes BEFORE dynamic routes
 * Order: /location/:location → /deleted → / → /:id
 */

/**
 * ============================================
 * PUBLIC ROUTES (no auth required)
 * ============================================
 */

/**
 * GET /api/v1/banners/location/:location
 * Get active banners for a location
 * ✅ No authentication required
 * ✅ Returns only currently active banners (start_at ≤ now < end_at)
 *
 * @param {string} location - One of: homepage_top, homepage_middle, homepage_bottom, category_page
 * @returns {Object[]} Array of active banners
 */
router.get(
    '/location/:location',
    BannerController.getByLocation
);

/**
 * GET /api/v1/banners/:id
 * Get single banner (public)
 * ✅ Returns banner regardless of active status
 */
router.get(
    '/:id',
    BannerController.getOne
);

/**
 * ============================================
 * ADMIN ROUTES (require authentication + admin role)
 * ============================================
 */

/**
 * GET /api/v1/banners/deleted
 * Get deleted banners (for recovery)
 * ✅ Specific admin endpoint BEFORE generic GET /
 * ✅ Shows audit trail with deleted_at timestamp
 *
 * @returns {Object[]} Array of deleted banners
 */
router.get(
    '/deleted',
    authenticate,
    authorize('admin'),
    BannerController.getDeleted
);

/**
 * GET /api/v1/banners
 * Get all banners (active + scheduled)
 * ✅ Authentication + authorization required
 * ✅ Optional location filter via query parameter
 *
 * @query {string} location - Optional filter by location
 * @returns {Object[]} Array of all non-deleted banners
 */
router.get(
    '/',
    authenticate,
    authorize('admin'),
    BannerController.getAll
);

/**
 * POST /api/v1/banners
 * Create banner
 * ✅ Validation done by middleware
 * ✅ User ID from JWT (audit trail)
 * ✅ Returns 201 Created
 *
 * @body {Object} banner - Banner data (image, link, location, sort_order, start_at, end_at)
 * @returns {Object} Created banner with id
 */
router.post(
    '/',
    authenticate,
    authorize('admin'),
    validate(createBannerSchema),
    BannerController.create
);

/**
 * PUT /api/v1/banners/:id
 * Update banner
 * ✅ Validation done by middleware
 * ✅ User ID from JWT (audit trail)
 * ✅ All fields optional (partial update)
 *
 * @param {string} id - Banner ID
 * @body {Object} banner - Partial banner data to update
 * @returns {Object} Updated banner
 */
router.put(
    '/:id',
    authenticate,
    authorize('admin'),
    validate(updateBannerSchema),
    BannerController.update
);

/**
 * DELETE /api/v1/banners/:id
 * Soft delete banner
 * ✅ Sets is_deleted = true, deleted_at = now
 * ✅ User ID from JWT (audit trail)
 * ✅ Can be restored later
 *
 * @param {string} id - Banner ID
 * @returns {Object} Success message
 */
router.delete(
    '/:id',
    authenticate,
    authorize('admin'),
    BannerController.delete
);

/**
 * POST /api/v1/banners/:id/restore
 * Restore deleted banner
 * ✅ Sets is_deleted = false, deleted_at = null
 * ✅ User ID from JWT (audit trail)
 * ✅ Returns restored banner data
 *
 * @param {string} id - Banner ID
 * @returns {Object} Restored banner
 */
router.post(
    '/:id/restore',
    authenticate,
    authorize('admin'),
    BannerController.restore
);

module.exports = router;