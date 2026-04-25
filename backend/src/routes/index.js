const express = require("express");
const router = express.Router();

// ===== IMPORT EXISTING ROUTES =====
const authRoutes = require("../modules/auth/auth.routes");
const userRoutes = require("../modules/users/user.routes");
const userAddressRoutes = require("../modules/user_addresses/user_addresses.routes");
const categoryRoutes = require("../modules/categories/category.routes");
const productModuleRoutes = require("../modules/products/routes");
const discountRoutes = require("../modules/discounts/discount.routes");
const cartRoutes = require("../modules/carts/cart.routes");
const shipmentRoutes = require('../modules/shipments/shipment.routes');
const reviewRoutes = require('../modules/reviews/review.routes');
const bannerRoutes = require('../modules/banners/banner.routes');
const announcementRoutes = require('../modules/announcements/announcement.routes');
const shopInfoRoutes = require('../modules/shop_info/shop_info.routes');
const notificationRoutes = require('../modules/notifications/notification.routes');
const chatRoutes = require('../modules/chats/chat.routes');
const paymentRoutes = require('../modules/payments/payment.routes');

// ============================================================================
// ===== MOUNT ALL ROUTES =====
// ============================================================================

// ✅ Auth routes (no prefix)
router.use("/auth", authRoutes);

// ✅ User routes
router.use("/users", userRoutes);

// ✅ User address routes
router.use("/user-addresses", userAddressRoutes);

// ✅ Category routes
router.use("/categories", categoryRoutes);

// ✅ Mount cart routes at /carts prefix
router.use("/carts", cartRoutes);

// ✅ Mount discount routes at /discounts prefix
router.use("/discounts", discountRoutes);

// Mount at /api/v1/shipments
router.use('/shipments', shipmentRoutes);

// Mount review routes
router.use('/reviews', reviewRoutes);

// Banner routes
router.use('/banners', bannerRoutes);

// Announcement routes
router.use('/announcements', announcementRoutes);

// Shop information routes
router.use('/shop-info', shopInfoRoutes);

// Notification routes
router.use("/notifications", notificationRoutes);

router.use('/payments', paymentRoutes);

router.use('/chats', chatRoutes);


// ✅ Product module routes (contains: products, variants, variant-units)
// Routes structure:
// - /products (GET all, POST create, etc.)
// - /products/:productId/variants (GET variants, POST create variant)
// - /variants/:variantId (GET, PATCH, DELETE variant)
// - /variant-units/:unitId (GET, PATCH, DELETE unit)
// - /variants/:variantId/units (GET units, POST create unit)
router.use("/", productModuleRoutes);


// ============================================================================
// ===== 404 HANDLER =====
// ============================================================================

router.use((req, res) => {
    res.status(404).json({
        success: false,
        code: "ROUTE_NOT_FOUND",
        message: `Route ${req.method} ${req.originalUrl} not found`,
    });
});

module.exports = router;