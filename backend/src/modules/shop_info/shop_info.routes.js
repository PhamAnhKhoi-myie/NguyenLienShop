const express = require('express');
const ShopInfoController = require('./shop_info.controller');
const { createShopInfoSchema, updateShopInfoSchema } = require('./shop_info.validator');
const validate = require('../../middlewares/validate.middleware');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/authorize.middleware');


const router = express.Router();

/**
 * PUBLIC ROUTES (No authentication required)
 * ✅ These endpoints are available to all users (guest, user, admin)
 */

/**
 * GET /api/v1/shop-info
 * Get complete shop information (full DTO)
 * Response: shop_name, email, phone, address, working_hours, social_links, map_embed_url, is_active
 */
router.get('/', ShopInfoController.getShopInfo);

/**
 * GET /api/v1/shop-info/contact
 * Get contact information only (lighter DTO)
 * Response: shop_name, email, phone, address, is_active
 * Used for: contact forms, footer contact widget
 */
router.get('/contact', ShopInfoController.getContactInfo);

/**
 * GET /api/v1/shop-info/hours
 * Get working hours only
 * Response: shop_name, working_hours, is_active
 * Used for: storefront widget, "Are we open?" checks
 */
router.get('/hours', ShopInfoController.getWorkingHours);

/**
 * GET /api/v1/shop-info/social
 * Get social media links only
 * Response: shop_name, social_links, is_active
 * Used for: footer embeds, social media links
 */
router.get('/social', ShopInfoController.getSocialLinks);

/**
 * GET /api/v1/shop-info/is-open
 * Check if shop is currently open (real-time status)
 * Response: { is_open: boolean }
 * Used for: "Open/Closed" badge on storefront
 */
router.get('/is-open', ShopInfoController.isShopOpen);

/**
 * GET /api/v1/shop-info/next-opening
 * Get next opening time
 * Response: { date, time, day } or null
 * Used for: "We open at..." message when closed
 */
router.get('/next-opening', ShopInfoController.getNextOpeningTime);

/**
 * ADMIN ROUTES (Authentication required)
 * ✅ These endpoints require valid JWT token and admin role
 */

/**
 * POST /api/v1/shop-info
 * Create shop information (typically called once during setup)
 * ✅ Prevents duplicate creation (only 1 shop info allowed)
 * ✅ All fields required
 * Request body: shop_name, email, phone, address, working_hours, social_links?, map_embed_url?, is_active?
 * Response: Full shop info DTO
 */
router.post(
    '/',
    authenticate,
    authorize('admin'),
    validate(createShopInfoSchema),
    ShopInfoController.createShopInfo
);

/**
 * PATCH /api/v1/shop-info
 * Update shop information (partial updates allowed)
 * ✅ All fields optional
 * ✅ Only provided fields are updated
 * Request body: shop_name?, email?, phone?, address?, working_hours?, social_links?, map_embed_url?, is_active?
 * Response: Updated shop info DTO
 */
router.patch(
    '/',
    authenticate,
    authorize('admin'),
    validate(updateShopInfoSchema),
    ShopInfoController.updateShopInfo
);

/**
 * PATCH /api/v1/shop-info/status
 * Toggle shop status (activate/deactivate)
 * ✅ Useful for temporary closing (maintenance mode)
 * Request body: { is_active: boolean }
 * Response: Updated shop info DTO
 */
router.patch(
    '/status',
    authenticate,
    authorize('admin'),
    ShopInfoController.toggleShopStatus
);

module.exports = router;