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
const orderRoutes = require("../modules/orders/order.routes");
const shipmentRoutes = require("../modules/shipments/shipment.routes");
const reviewRoutes = require("../modules/reviews/review.routes");
const bannerRoutes = require("../modules/banners/banner.routes");
const announcementRoutes = require("../modules/announcements/announcement.routes");
const shopInfoRoutes = require("../modules/shop_info/shop_info.routes");
const notificationRoutes = require("../modules/notifications/notification.routes");
const chatRoutes = require("../modules/chats/chat.routes");
const paymentRoutes = require("../modules/payments/payment.routes");
const auditLogRoutes = require("../modules/audit_logs/audit_log.routes");

// ============================================================================
// ===== MOUNT ALL ROUTES =====
// ============================================================================

// Auth routes
router.use("/auth", authRoutes);

// User routes
router.use("/users", userRoutes);

// User address routes
router.use("/user-addresses", userAddressRoutes);

// Category routes
router.use("/categories", categoryRoutes);

// Cart routes
router.use("/carts", cartRoutes);

// Discount routes
router.use("/discounts", discountRoutes);

// Order routes
router.use("/orders", orderRoutes);

// Shipment routes
router.use("/shipments", shipmentRoutes);

// Review routes
router.use("/reviews", reviewRoutes);

// Banner routes
router.use("/banners", bannerRoutes);

// Announcement routes
router.use("/announcements", announcementRoutes);

// Shop information routes
router.use("/shop-info", shopInfoRoutes);

// Notification routes
router.use("/notifications", notificationRoutes);

// Payment routes
router.use("/payments", paymentRoutes);

// Chat routes
router.use("/chats", chatRoutes);

// Audit log routes
router.use("/audit-logs", auditLogRoutes);

// Product module routes
// Routes structure:
// - /products
// - /products/:productId/variants
// - /variants/:variantId
// - /variant-units/:unitId
// - /variants/:variantId/units
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