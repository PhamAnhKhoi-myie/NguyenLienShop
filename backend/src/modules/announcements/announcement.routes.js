const express = require('express');
const router = express.Router();
const AnnouncementController = require('./announcement.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/authorize.middleware');
const validate = require('../../middlewares/validate.middleware');
const {
    createAnnouncementSchema,
    updateAnnouncementSchema
} = require('./announcement.validator');

/**
 * ✅ CRITICAL: Specific routes BEFORE dynamic routes
 * Order: /admin/* → / → /:id
 */

/**
 * ============================================
 * PUBLIC ROUTES (no auth required)
 * ============================================
 */

/**
 * GET /api/v1/announcements
 * Get active announcements
 * ✅ No authentication required
 * ✅ Optional target filter via query
 *
 * @query {string} target - Optional: all, user, admin, guest
 * @returns {Object[]} Array of active announcements sorted by priority
 */
router.get('/', AnnouncementController.getActive);

/**
 * GET /api/v1/announcements/:id
 * Get single announcement
 * ✅ Public access (returns if active or not)
 */
router.get('/:id', AnnouncementController.getOne);

/**
 * ============================================
 * ADMIN ROUTES (require authentication + admin role)
 * ============================================
 */

/**
 * GET /api/v1/announcements/admin/all
 * Get all announcements (active + scheduled)
 * ✅ Must come BEFORE /:id route
 *
 * @query {string} target - Optional filter by target
 * @query {string} type - Optional filter by type
 * @query {boolean} activeOnly - Optional: only active (not scheduled)
 * @returns {Object[]} Array of announcements
 */
router.get(
    '/admin/all',
    authenticate,
    authorize('admin'),
    AnnouncementController.getAll
);

/**
 * GET /api/v1/announcements/admin/scheduled
 * Get scheduled announcements (not started yet)
 * ✅ Must come BEFORE /:id route
 *
 * @returns {Object[]} Array of scheduled announcements
 */
router.get(
    '/admin/scheduled',
    authenticate,
    authorize('admin'),
    AnnouncementController.getScheduled
);

/**
 * GET /api/v1/announcements/admin/expired
 * Get expired announcements
 * ✅ Must come BEFORE /:id route
 *
 * @returns {Object[]} Array of expired announcements
 */
router.get(
    '/admin/expired',
    authenticate,
    authorize('admin'),
    AnnouncementController.getExpired
);

/**
 * GET /api/v1/announcements/admin/deleted
 * Get deleted announcements (for recovery)
 * ✅ Must come BEFORE /:id route
 * ✅ Shows audit trail with deleted_at timestamp
 *
 * @returns {Object[]} Array of deleted announcements
 */
router.get(
    '/admin/deleted',
    authenticate,
    authorize('admin'),
    AnnouncementController.getDeleted
);

/**
 * POST /api/v1/announcements
 * Create announcement
 * ✅ Validation done by middleware
 * ✅ User ID from JWT (audit trail)
 * ✅ Returns 201 Created
 *
 * @body {Object} announcement data
 * @returns {Object} Created announcement with id
 */
router.post(
    '/',
    authenticate,
    authorize('admin'),
    validate(createAnnouncementSchema),
    AnnouncementController.create
);

/**
 * PUT /api/v1/announcements/:id
 * Update announcement
 * ✅ Validation done by middleware
 * ✅ User ID from JWT (audit trail)
 * ✅ All fields optional (partial update)
 *
 * @param {string} id - Announcement ID
 * @body {Object} announcement - Partial announcement data to update
 * @returns {Object} Updated announcement
 */
router.put(
    '/:id',
    authenticate,
    authorize('admin'),
    validate(updateAnnouncementSchema),
    AnnouncementController.update
);

/**
 * DELETE /api/v1/announcements/:id
 * Soft delete announcement
 * ✅ Sets is_deleted = true, deleted_at = now
 * ✅ User ID from JWT (audit trail)
 * ✅ Can be restored later
 *
 * @param {string} id - Announcement ID
 * @returns {Object} Success message
 */
router.delete(
    '/:id',
    authenticate,
    authorize('admin'),
    AnnouncementController.delete
);

/**
 * POST /api/v1/announcements/:id/restore
 * Restore deleted announcement
 * ✅ Sets is_deleted = false, deleted_at = null
 * ✅ User ID from JWT (audit trail)
 * ✅ Returns restored announcement data
 *
 * @param {string} id - Announcement ID
 * @returns {Object} Restored announcement
 */
router.post(
    '/:id/restore',
    authenticate,
    authorize('admin'),
    AnnouncementController.restore
);

module.exports = router;