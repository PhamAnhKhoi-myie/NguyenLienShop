require("dotenv").config();

const mongoose = require("mongoose");

const Order = require("../modules/orders/order.model");
const Product = require("../modules/products/product.model");
const Review = require("../modules/reviews/review.model");
const ReviewService = require("../modules/reviews/review.service");
const User = require("../modules/users/user.model");
const Variant = require("../modules/products/variant.model");
const VariantUnit = require("../modules/products/variant_unit.model");
const OrderAuditLog = require("../modules/audit_logs/order_audit_log/order_log.model");
const ReviewAuditLog = require("../modules/audit_logs/review_audit_log/review_log.model");

const MONGODB_URI = process.env.MONGO_URI;
const DB_NAME = process.env.MONGODB_DB_NAME || "nguyenlien_dev";
const ORDER_PREFIX = "DEV-REV";
const TITLE_PREFIX = "[ĐÁNH GIÁ DEV]";
const LEGACY_TITLE_PREFIX = "[DEV REVIEW]";
const PREFERRED_ADMIN_EMAIL = "khoiphamvk123@gmail.com";
const PREFERRED_CUSTOMER_EMAILS = [
    "nguyenvana.customer@gmail.com",
    "tranthibich.customer@gmail.com",
    "levanbinh.customer@gmail.com",
    "phamthicam.customer@gmail.com",
    "huynhvancuong.customer@gmail.com",
    "dangthidiem.customer@gmail.com",
];

const metadata = {
    ip: "127.0.0.1",
    userAgent: "seed:reviews:dev",
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const assertCanRun = () => {
    if (!MONGODB_URI) {
        throw new Error("Missing MONGO_URI in .env");
    }

    if (process.env.NODE_ENV === "production") {
        throw new Error("Refusing to seed review fixtures when NODE_ENV=production");
    }
};

const toId = (value) => value.toString();

const getPrimaryImage = (product) => {
    const primary = product.images?.find((image) => image.is_primary);
    return primary?.url || product.images?.[0]?.url || null;
};

const getUnitPrice = (unit) => {
    const firstTier = [...(unit.price_tiers || [])].sort(
        (left, right) => left.min_qty - right.min_qty
    )[0];

    return firstTier?.unit_price || 10000;
};

const buildVariantLabel = (variant) => {
    return [variant.size, variant.fabric_type].filter(Boolean).join(" - ");
};

const pick = (items, index) => {
    if (index >= items.length) {
        throw new Error(`Not enough product variants for review fixture index ${index}`);
    }

    return items[index];
};

const loadUsers = async () => {
    const preferredAdmin = await User.findOne({
        email: PREFERRED_ADMIN_EMAIL,
        roles: "ADMIN",
        status: "ACTIVE",
    });
    const admin = preferredAdmin || await User.findOne({
        roles: "ADMIN",
        status: "ACTIVE",
    }).sort({ created_at: 1 });

    const customers = await User.find({ roles: "CUSTOMER", status: "ACTIVE" }).sort({
        created_at: 1,
    });
    const customersByEmail = new Map(
        customers.map((customer) => [customer.email, customer])
    );
    const preferredCustomers = PREFERRED_CUSTOMER_EMAILS
        .map((email) => customersByEmail.get(email))
        .filter(Boolean);
    const fallbackCustomers = customers.filter(
        (customer) => !PREFERRED_CUSTOMER_EMAILS.includes(customer.email)
    );
    const orderedCustomers = [...preferredCustomers, ...fallbackCustomers];

    if (!admin) {
        throw new Error("Missing active ADMIN user. Run npm run seed:users first.");
    }

    if (orderedCustomers.length < 6) {
        throw new Error("Need at least 6 active CUSTOMER users. Run npm run seed:users first.");
    }

    return {
        admin,
        primaryUser: orderedCustomers[0],
        publicReviewUsers: [orderedCustomers[0], orderedCustomers[1], orderedCustomers[2]],
        pendingReviewUsers: [orderedCustomers[3], orderedCustomers[4]],
        flaggedReviewUser: orderedCustomers[5],
        flaggerUser: orderedCustomers[1],
    };
};

const loadCombos = async () => {
    const products = await Product.find({ status: "ACTIVE" })
        .sort({ created_at: 1, _id: 1 })
        .lean();

    const variants = await Variant.find({ status: "ACTIVE" })
        .sort({ created_at: 1, _id: 1 })
        .lean();

    const units = await VariantUnit.find()
        .sort({ is_default: -1, pack_size: 1, _id: 1 })
        .lean();

    const productsById = new Map(products.map((product) => [toId(product._id), product]));
    const unitsByVariantId = units.reduce((acc, unit) => {
        const variantId = toId(unit.variant_id);

        if (!acc.has(variantId)) {
            acc.set(variantId, []);
        }

        acc.get(variantId).push(unit);
        return acc;
    }, new Map());

    const combos = variants
        .map((variant) => {
            const product = productsById.get(toId(variant.product_id));
            const unit = unitsByVariantId.get(toId(variant._id))?.[0];

            if (!product || !unit) {
                return null;
            }

            return { product, variant, unit };
        })
        .filter(Boolean);

    const productComboCounts = combos.reduce((acc, combo) => {
        const productId = toId(combo.product._id);
        acc.set(productId, (acc.get(productId) || 0) + 1);
        return acc;
    }, new Map());

    const targetProductId = [...productComboCounts.entries()]
        .find(([, count]) => count >= 2)?.[0];

    if (!targetProductId) {
        throw new Error("Need at least one active product with 2 active variants and units.");
    }

    const targetCombos = combos.filter(
        (combo) => toId(combo.product._id) === targetProductId
    );

    const otherCombos = combos.filter(
        (combo) => toId(combo.product._id) !== targetProductId
    );

    if (otherCombos.length < 8) {
        throw new Error("Need at least 8 active non-target product variants for review fixtures.");
    }

    return { targetCombos, otherCombos };
};

const cleanupFixtures = async () => {
    const orderCodePattern = new RegExp(`^${ORDER_PREFIX}-`);
    const titlePattern = new RegExp(`^${escapeRegExp(TITLE_PREFIX)}`);
    const legacyTitlePattern = new RegExp(`^${escapeRegExp(LEGACY_TITLE_PREFIX)}`);

    const oldOrders = await Order.find(
        { order_code: orderCodePattern },
        "_id order_code",
        { includeDeleted: true }
    );
    const oldOrderIds = oldOrders.map((order) => order._id);

    const reviewQuery = [
        { title: titlePattern },
        { title: legacyTitlePattern },
    ];

    if (oldOrderIds.length > 0) {
        reviewQuery.push({ order_id: { $in: oldOrderIds } });
    }

    const oldReviews = await Review.find(
        { $or: reviewQuery },
        "_id",
        { includeUnapproved: true }
    );
    const oldReviewIds = oldReviews.map((review) => review._id);

    if (oldReviewIds.length > 0 || oldOrderIds.length > 0) {
        await ReviewAuditLog.deleteMany({
            $or: [
                { review_id: { $in: oldReviewIds } },
                { order_id: { $in: oldOrderIds } },
            ],
        });
    }

    if (oldOrderIds.length > 0) {
        await OrderAuditLog.deleteMany({ order_id: { $in: oldOrderIds } });
        await Order.deleteMany({ _id: { $in: oldOrderIds } });
    }

    if (oldReviewIds.length > 0) {
        await Review.deleteMany({ _id: { $in: oldReviewIds } });
    }

    return {
        orders: oldOrderIds.length,
        reviews: oldReviewIds.length,
    };
};

const buildOrderPayload = ({ code, user, combo, quantity = 1 }) => {
    const unitPrice = getUnitPrice(combo.unit);
    const lineTotal = unitPrice * quantity;
    const now = new Date();
    const shippedAt = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const deliveredAt = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    return {
        user_id: user._id,
        order_code: code,
        address_snapshot: {
            receiver_name: user.profile?.full_name || "Khách hàng dev",
            phone: user.profile?.phone_number || "0901000000",
            province_code: "79",
            province_name: "TP. Hồ Chí Minh",
            ward_code: "26734",
            ward_name: "Phường dev",
            detail: "123 Nguyen Lien",
            full_address: "123 Nguyễn Liên, TP. Hồ Chí Minh",
            note: "Review fixture",
        },
        items: [
            {
                _id: new mongoose.Types.ObjectId(),
                product_id: combo.product._id,
                variant_id: combo.variant._id,
                unit_id: combo.unit._id,
                product_name: combo.product.name,
                product_image: getPrimaryImage(combo.product),
                variant_label: buildVariantLabel(combo.variant),
                sku: combo.variant.sku,
                unit_label: combo.unit.display_name,
                pack_size: combo.unit.pack_size,
                quantity_ordered: quantity,
                quantity_fulfilled: quantity,
                unit_price: unitPrice,
                line_total: lineTotal,
                review_status: "pending",
            },
        ],
        pricing: {
            subtotal: lineTotal,
            shipping_fee: 0,
            discount_amount: 0,
            total_amount: lineTotal,
        },
        currency: "VND",
        payment: {
            method: "COD",
            status: "PAID",
            paid_at: deliveredAt,
        },
        shipment: {
            carrier: "VIETTEL",
            tracking_code: code.replaceAll("-", ""),
            shipped_at: shippedAt,
            delivered_at: deliveredAt,
        },
        customer_receipt: {
            confirmed_at: deliveredAt,
            confirmed_by: user._id,
        },
        status: "DELIVERED",
        status_history: [
            { from: null, to: "PENDING", changed_at: now, changed_by: null, note: "Dev fixture created" },
            { from: "PENDING", to: "PAID", changed_at: now, changed_by: null, note: "Dev fixture paid" },
            { from: "PAID", to: "PROCESSING", changed_at: now, changed_by: null, note: "Dev fixture processing" },
            { from: "PROCESSING", to: "SHIPPED", changed_at: shippedAt, changed_by: null, note: "Dev fixture shipped" },
            { from: "SHIPPED", to: "DELIVERED", changed_at: deliveredAt, changed_by: null, note: "Dev fixture delivered" },
        ],
        customer_notes: "Dữ liệu mẫu phục vụ kiểm tra giao diện đánh giá",
    };
};

const createDeliveredOrder = async ({ code, user, combo }) => {
    return Order.create(buildOrderPayload({ code, user, combo }));
};

const createReviewForOrder = async ({ order, user, combo, title, content, rating }) => {
    const dto = await ReviewService.createReview(
        toId(user._id),
        toId(combo.product._id),
        toId(combo.variant._id),
        toId(order._id),
        {
            rating,
            title,
            content,
        },
        metadata
    );

    return Review.findById(dto.id, null, { includeUnapproved: true });
};

const seedReviewsDev = async () => {
    console.log("== Seeding dev review fixtures ==");

    const users = await loadUsers();
    const { targetCombos, otherCombos } = await loadCombos();
    const cleanup = await cleanupFixtures();

    console.log(`[reviews-dev] Removed ${cleanup.orders} orders and ${cleanup.reviews} reviews`);

    const created = {
        pendingOrders: [],
        reviewedOrders: [],
        targetProductReviews: [],
        otherApprovedReviews: [],
        pendingReviews: [],
        flaggedReviews: [],
    };

    for (let index = 0; index < 3; index += 1) {
        const order = await createDeliveredOrder({
            code: `${ORDER_PREFIX}-PENDING-${String(index + 1).padStart(2, "0")}`,
            user: users.primaryUser,
            combo: pick(otherCombos, index),
        });

        created.pendingOrders.push(order);
    }

    const primaryReviewedCombos = [
        pick(targetCombos, 0),
        pick(otherCombos, 3),
        pick(otherCombos, 4),
    ];

    for (let index = 0; index < 3; index += 1) {
        const combo = primaryReviewedCombos[index];
        const order = await createDeliveredOrder({
            code: `${ORDER_PREFIX}-REVIEWED-${String(index + 1).padStart(2, "0")}`,
            user: users.primaryUser,
            combo,
        });
        const review = await createReviewForOrder({
            order,
            user: users.primaryUser,
            combo,
            rating: 5 - (index % 2),
            title: `${TITLE_PREFIX} Đã duyệt ${index + 1}`,
            content: `Đánh giá dev đã duyệt ${index + 1}. Sản phẩm đúng như mô tả, giao hàng ổn định và dễ thao tác trên giao diện.`,
        });

        await ReviewService.approveReview(toId(review._id), toId(users.admin._id), metadata);

        created.reviewedOrders.push(order);
        if (toId(combo.product._id) === toId(targetCombos[0].product._id)) {
            created.targetProductReviews.push(review);
        } else {
            created.otherApprovedReviews.push(review);
        }
    }

    const publicReviewCombos = [pick(targetCombos, 1), pick(targetCombos, 0)];

    for (let index = 0; index < publicReviewCombos.length; index += 1) {
        const user = users.publicReviewUsers[index + 1];
        const combo = publicReviewCombos[index];
        const order = await createDeliveredOrder({
            code: `${ORDER_PREFIX}-PUBLIC-${String(index + 1).padStart(2, "0")}`,
            user,
            combo,
        });
        const review = await createReviewForOrder({
            order,
            user,
            combo,
            rating: 4 + (index % 2),
            title: `${TITLE_PREFIX} Khách xem sản phẩm ${index + 1}`,
            content: `Đánh giá dev công khai ${index + 1}. Nội dung có độ dài phù hợp để hiển thị tốt trong danh sách đánh giá sản phẩm.`,
        });

        await ReviewService.approveReview(toId(review._id), toId(users.admin._id), metadata);
        created.targetProductReviews.push(review);
    }

    for (let index = 0; index < 2; index += 1) {
        const user = users.pendingReviewUsers[index];
        const combo = pick(otherCombos, index + 5);
        const order = await createDeliveredOrder({
            code: `${ORDER_PREFIX}-MOD-PENDING-${String(index + 1).padStart(2, "0")}`,
            user,
            combo,
        });
        const review = await createReviewForOrder({
            order,
            user,
            combo,
            rating: 4,
            title: `${TITLE_PREFIX} Chờ duyệt ${index + 1}`,
            content: `Đánh giá dev đang chờ duyệt ${index + 1}. Nội dung này dùng để kiểm tra tab Chờ duyệt trong trang quản trị.`,
        });

        created.pendingReviews.push(review);
    }

    const flaggedCombo = pick(otherCombos, 7);
    const flaggedOrder = await createDeliveredOrder({
        code: `${ORDER_PREFIX}-FLAGGED-01`,
        user: users.flaggedReviewUser,
        combo: flaggedCombo,
    });
    const flaggedReview = await createReviewForOrder({
        order: flaggedOrder,
        user: users.flaggedReviewUser,
        combo: flaggedCombo,
        rating: 2,
        title: `${TITLE_PREFIX} Bị báo cáo 1`,
        content: "Đánh giá dev bị báo cáo để kiểm tra tab Bị báo cáo trong trang quản trị.",
    });

    await ReviewService.approveReview(toId(flaggedReview._id), toId(users.admin._id), metadata);
    await ReviewService.flagReview(
        toId(flaggedReview._id),
        "other",
        toId(users.flaggerUser._id),
        metadata
    );

    created.flaggedReviews.push(flaggedReview);

    const targetProduct = targetCombos[0].product;

    console.log("[reviews-dev] Primary user:", users.primaryUser.email);
    console.log("[reviews-dev] Admin user:", users.admin.email);
    console.log("[reviews-dev] Target product id:", toId(targetProduct._id));
    console.log("[reviews-dev] Target product name:", targetProduct.name);
    console.log("[reviews-dev] Pending review-button orders:", created.pendingOrders.length);
    console.log("[reviews-dev] Reviewed orders for primary user:", created.reviewedOrders.length);
    console.log("[reviews-dev] Approved reviews on target product:", created.targetProductReviews.length);
    console.log("[reviews-dev] Other approved reviews for reviewed-order fixtures:", created.otherApprovedReviews.length);
    console.log("[reviews-dev] Pending moderation reviews:", created.pendingReviews.length);
    console.log("[reviews-dev] Flagged moderation reviews:", created.flaggedReviews.length);

    return {
        primaryUser: users.primaryUser.email,
        adminUser: users.admin.email,
        targetProductId: toId(targetProduct._id),
        pendingOrders: created.pendingOrders.length,
        reviewedOrders: created.reviewedOrders.length,
        targetProductReviews: created.targetProductReviews.length,
        otherApprovedReviews: created.otherApprovedReviews.length,
        pendingReviews: created.pendingReviews.length,
        flaggedReviews: created.flaggedReviews.length,
    };
};

if (require.main === module) {
    const run = async () => {
        try {
            assertCanRun();

            await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });

            console.log("MongoDB connected");
            console.log("DB NAME:", mongoose.connection.name);

            await seedReviewsDev();
        } catch (err) {
            console.error("Dev review fixture seeding error:", err);
            process.exitCode = 1;
        } finally {
            if (mongoose.connection.readyState !== 0) {
                await mongoose.disconnect();
                console.log("MongoDB disconnected");
            }
        }
    };

    run();
}

module.exports = seedReviewsDev;
