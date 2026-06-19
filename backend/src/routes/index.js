const express = require("express");
const router = express.Router();


const authRoutes = require("../modules/auth/auth.routes");
const userRoutes = require("../modules/users/user.routes");
const userAddressRoutes = require("../modules/user_addresses/user_addresses.routes");
const categoryRoutes = require("../modules/categories/category.routes");
const productModuleRoutes = require("../modules/products/routes");
const discountRoutes = require("../modules/discounts/discount.routes");
const loyaltyRoutes = require("../modules/loyalty/loyalty.routes");
const cartRoutes = require("../modules/carts/cart.routes");
const orderRoutes = require("../modules/orders/order.routes");
const shipmentRoutes = require("../modules/shipments/shipment.routes");
const reviewRoutes = require("../modules/reviews/review.routes");
const bannerRoutes = require("../modules/banners/banner.routes");
const announcementRoutes = require("../modules/announcements/announcement.routes");
const analyticsRoutes = require("../modules/analytics/analytics.routes");
const shopInfoRoutes = require("../modules/shop_info/shop_info.routes");
const notificationRoutes = require("../modules/notifications/notification.routes");
const chatRoutes = require("../modules/chats/chat.routes");
const paymentRoutes = require("../modules/payments/payment.routes");
const auditLogRoutes = require("../modules/audit_logs/audit_log.routes");
const uploadRoutes = require("../modules/uploads/upload.routes");
const locationRoutes = require("../modules/locations/location.routes");
const blogRoutes = require("../modules/blogs/blog.routes");






router.use("/auth", authRoutes);


router.use("/users", userRoutes);


router.use("/user-addresses", userAddressRoutes);

router.use("/locations", locationRoutes);


router.use("/categories", categoryRoutes);


router.use("/carts", cartRoutes);


router.use("/discounts", discountRoutes);

router.use("/loyalty", loyaltyRoutes);


router.use("/orders", orderRoutes);


router.use("/shipments", shipmentRoutes);


router.use("/reviews", reviewRoutes);


router.use("/banners", bannerRoutes);


router.use("/announcements", announcementRoutes);

router.use("/admin/dashboard", analyticsRoutes);


router.use("/shop-info", shopInfoRoutes);


router.use("/notifications", notificationRoutes);


router.use("/payments", paymentRoutes);


router.use("/chats", chatRoutes);


router.use("/audit-logs", auditLogRoutes);


router.use("/uploads", uploadRoutes);

router.use("/blogs", blogRoutes);








router.use("/", productModuleRoutes);





router.use((req, res) => {
    res.status(404).json({
        success: false,
        code: "ROUTE_NOT_FOUND",
        message: `Route ${req.method} ${req.originalUrl} not found`,
    });
});

module.exports = router;
