require("dotenv").config();
const mongoose = require("mongoose");

const Discount = require("../modules/discounts/discount.model");
const User = require("../modules/users/user.model");
const Category = require("../modules/categories/category.model");
const Product = require("../modules/products/product.model");
const Variant = require("../modules/products/variant.model");

const MONGODB_URI = process.env.MONGO_URI;

const CATEGORY_SLUGS = {
    mango: "tui-bao-trai-xoai",
    pomelo: "tui-bao-trai-buoi",
    guava: "tui-bao-trai-oi",
    dragonFruit: "tui-bao-trai-thanh-long",
    jackfruit: "tui-bao-trai-mit",
    grape: "tui-bao-trai-nho",
    banana: "tui-bao-trai-chuoi",
    longVegetable: "tui-bao-rau-cu-qua-dai",
};

const PRODUCT_SLUGS = {
    mangoBasic: "tui-bao-trai-xoai-vai-khong-det-trang-20x27cm",
    pomeloBasic: "tui-bao-trai-buoi-vai-khong-det-30x35cm",
    guavaBasic: "tui-bao-trai-oi-vai-khong-det-15x20cm",
    dragonFruitBasic: "tui-bao-thanh-long-vai-khong-det-25x30cm",
    jackfruitBasic: "tui-bao-trai-mit-vai-khong-det-45x55cm",
};

const addDays = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
};

const addHours = (hours) => {
    const date = new Date();
    date.setHours(date.getHours() + hours);
    return date;
};

const toObjectIdArray = (items) => {
    return items.filter(Boolean).map((item) => item._id);
};

const getAdminUser = async () => {
    const admin = await User.findOne({
        roles: "ADMIN",
        status: "ACTIVE",
    }).select("_id email");

    if (admin) {
        return admin;
    }

    const fallbackUser = await User.findOne({ status: "ACTIVE" }).select("_id email");

    if (!fallbackUser) {
        throw new Error('Missing admin user. Run "npm run seed:users" first.');
    }

    return fallbackUser;
};

const getRefs = async () => {
    const categories = await Category.find({
        slug: { $in: Object.values(CATEGORY_SLUGS) },
        status: "ACTIVE",
    }).select("_id slug");

    const products = await Product.find({
        slug: { $in: Object.values(PRODUCT_SLUGS) },
        is_deleted: false,
    }).select("_id slug category_id");

    const users = await User.find({
        roles: "CUSTOMER",
        status: "ACTIVE",
    })
        .select("_id email")
        .limit(5);

    const categoryMap = new Map(categories.map((item) => [item.slug, item]));
    const productMap = new Map(products.map((item) => [item.slug, item]));

    const selectedProducts = [
        productMap.get(PRODUCT_SLUGS.mangoBasic),
        productMap.get(PRODUCT_SLUGS.pomeloBasic),
        productMap.get(PRODUCT_SLUGS.guavaBasic),
        productMap.get(PRODUCT_SLUGS.dragonFruitBasic),
        productMap.get(PRODUCT_SLUGS.jackfruitBasic),
    ].filter(Boolean);

    const variants = await Variant.find({
        product_id: { $in: selectedProducts.map((product) => product._id) },
        is_deleted: false,
    })
        .select("_id product_id sku")
        .limit(6);

    return {
        categories: {
            mango: categoryMap.get(CATEGORY_SLUGS.mango),
            pomelo: categoryMap.get(CATEGORY_SLUGS.pomelo),
            guava: categoryMap.get(CATEGORY_SLUGS.guava),
            dragonFruit: categoryMap.get(CATEGORY_SLUGS.dragonFruit),
            jackfruit: categoryMap.get(CATEGORY_SLUGS.jackfruit),
            grape: categoryMap.get(CATEGORY_SLUGS.grape),
            banana: categoryMap.get(CATEGORY_SLUGS.banana),
            longVegetable: categoryMap.get(CATEGORY_SLUGS.longVegetable),
        },
        products: {
            mangoBasic: productMap.get(PRODUCT_SLUGS.mangoBasic),
            pomeloBasic: productMap.get(PRODUCT_SLUGS.pomeloBasic),
            guavaBasic: productMap.get(PRODUCT_SLUGS.guavaBasic),
            dragonFruitBasic: productMap.get(PRODUCT_SLUGS.dragonFruitBasic),
            jackfruitBasic: productMap.get(PRODUCT_SLUGS.jackfruitBasic),
        },
        variants,
        users,
    };
};

const buildDiscountsData = (refs, adminId) => {
    return [
        {
            code: "WELCOME10",
            type: "percent",
            value: 10,
            max_discount_amount: 30000,
            application_strategy: "apply_all",
            applicable_targets: { type: "all" },
            user_eligibility: { type: "first_time_only" },
            min_order_value: 100000,
            usage_limit: 500,
            usage_per_user_limit: 1,
            is_stackable: false,
            stack_priority: 10,
            started_at: addDays(-10),
            expiry_date: addDays(60),
            status: "active",
            usage_count: 0,
            created_by: adminId,
        },
        {
            code: "FREESHIP20K",
            type: "fixed",
            value: 20000,
            application_strategy: "apply_all",
            applicable_targets: { type: "all" },
            user_eligibility: { type: "all" },
            min_order_value: 150000,
            usage_limit: 300,
            usage_per_user_limit: 3,
            claim_limit: 300,
            show_on_homepage: true,
            homepage_priority: 80,
            requires_claim: true,
            is_stackable: true,
            stack_priority: 5,
            started_at: addDays(-5),
            expiry_date: addDays(45),
            status: "active",
            usage_count: 12,
            created_by: adminId,
        },
        {
            code: "ALLSHOP5",
            type: "percent",
            value: 5,
            max_discount_amount: 25000,
            application_strategy: "apply_all",
            applicable_targets: { type: "all" },
            user_eligibility: { type: "all" },
            min_order_value: 0,
            usage_limit: 1000,
            usage_per_user_limit: 5,
            claim_limit: 1000,
            show_on_homepage: true,
            homepage_priority: 60,
            requires_claim: true,
            is_stackable: false,
            stack_priority: 1,
            started_at: addDays(-15),
            expiry_date: addDays(90),
            status: "active",
            usage_count: 35,
            created_by: adminId,
        },
        {
            code: "ORDER50K",
            type: "fixed",
            value: 50000,
            application_strategy: "apply_all",
            applicable_targets: { type: "all" },
            user_eligibility: { type: "all" },
            min_order_value: 500000,
            usage_limit: 200,
            usage_per_user_limit: 2,
            claim_limit: 200,
            show_on_homepage: true,
            homepage_priority: 90,
            requires_claim: true,
            is_stackable: false,
            stack_priority: 8,
            started_at: addDays(-7),
            expiry_date: addDays(30),
            status: "active",
            usage_count: 18,
            created_by: adminId,
        },
        {
            code: "BIGORDER100K",
            type: "fixed",
            value: 100000,
            application_strategy: "apply_all",
            applicable_targets: { type: "all" },
            user_eligibility: { type: "all" },
            min_order_value: 1000000,
            usage_limit: 100,
            usage_per_user_limit: 1,
            claim_limit: 100,
            show_on_homepage: true,
            homepage_priority: 100,
            requires_claim: true,
            is_stackable: false,
            stack_priority: 9,
            started_at: addDays(-3),
            expiry_date: addDays(40),
            status: "active",
            usage_count: 4,
            created_by: adminId,
        },
        {
            code: "XOAIMANGO15",
            type: "percent",
            value: 15,
            max_discount_amount: 50000,
            application_strategy: "apply_all",
            applicable_targets: {
                type: "specific_categories",
                category_ids: toObjectIdArray([refs.categories.mango]),
            },
            user_eligibility: { type: "all" },
            min_order_value: 120000,
            usage_limit: 250,
            usage_per_user_limit: 2,
            is_stackable: false,
            stack_priority: 6,
            started_at: addDays(-2),
            expiry_date: addDays(35),
            status: "active",
            usage_count: 7,
            created_by: adminId,
        },
        {
            code: "BUOI20",
            type: "percent",
            value: 20,
            max_discount_amount: 70000,
            application_strategy: "apply_all",
            applicable_targets: {
                type: "specific_categories",
                category_ids: toObjectIdArray([refs.categories.pomelo]),
            },
            user_eligibility: { type: "all" },
            min_order_value: 200000,
            usage_limit: 150,
            usage_per_user_limit: 2,
            is_stackable: false,
            stack_priority: 6,
            started_at: addDays(-2),
            expiry_date: addDays(35),
            status: "active",
            usage_count: 6,
            created_by: adminId,
        },
        {
            code: "OI10K",
            type: "fixed",
            value: 10000,
            application_strategy: "apply_all",
            applicable_targets: {
                type: "specific_categories",
                category_ids: toObjectIdArray([refs.categories.guava]),
            },
            user_eligibility: { type: "all" },
            min_order_value: 80000,
            usage_limit: 400,
            usage_per_user_limit: 4,
            is_stackable: true,
            stack_priority: 3,
            started_at: addDays(-5),
            expiry_date: addDays(50),
            status: "active",
            usage_count: 22,
            created_by: adminId,
        },
        {
            code: "THANHLONG12",
            type: "percent",
            value: 12,
            max_discount_amount: 40000,
            application_strategy: "apply_cheapest",
            applicable_targets: {
                type: "specific_categories",
                category_ids: toObjectIdArray([refs.categories.dragonFruit]),
            },
            user_eligibility: { type: "all" },
            min_order_value: 150000,
            usage_limit: 180,
            usage_per_user_limit: 2,
            is_stackable: false,
            stack_priority: 4,
            started_at: addDays(-1),
            expiry_date: addDays(25),
            status: "active",
            usage_count: 9,
            created_by: adminId,
        },
        {
            code: "MIT30K",
            type: "fixed",
            value: 30000,
            application_strategy: "apply_most_expensive",
            applicable_targets: {
                type: "specific_categories",
                category_ids: toObjectIdArray([refs.categories.jackfruit]),
            },
            user_eligibility: { type: "all" },
            min_order_value: 250000,
            usage_limit: 120,
            usage_per_user_limit: 2,
            is_stackable: false,
            stack_priority: 4,
            started_at: addDays(-1),
            expiry_date: addDays(25),
            status: "active",
            usage_count: 3,
            created_by: adminId,
        },
        {
            code: "PRODUCTXOAI25",
            type: "percent",
            value: 25,
            max_discount_amount: 60000,
            application_strategy: "apply_once",
            applicable_targets: {
                type: "specific_products",
                product_ids: toObjectIdArray([refs.products.mangoBasic]),
            },
            user_eligibility: { type: "all" },
            min_order_value: 100000,
            usage_limit: 80,
            usage_per_user_limit: 1,
            is_stackable: false,
            stack_priority: 7,
            started_at: addDays(-1),
            expiry_date: addDays(20),
            status: "active",
            usage_count: 2,
            created_by: adminId,
        },
        {
            code: "COMBOFRUIT30K",
            type: "fixed",
            value: 30000,
            application_strategy: "apply_all",
            applicable_targets: {
                type: "specific_products",
                product_ids: toObjectIdArray([
                    refs.products.mangoBasic,
                    refs.products.pomeloBasic,
                    refs.products.guavaBasic,
                ]),
            },
            user_eligibility: { type: "all" },
            min_order_value: 250000,
            usage_limit: 150,
            usage_per_user_limit: 2,
            is_stackable: false,
            stack_priority: 5,
            started_at: addDays(-4),
            expiry_date: addDays(30),
            status: "active",
            usage_count: 11,
            created_by: adminId,
        },
        {
            code: "VARIANTSALE10",
            type: "percent",
            value: 10,
            max_discount_amount: 35000,
            application_strategy: "apply_all",
            applicable_targets: {
                type: "specific_variants",
                variant_ids: refs.variants.slice(0, 3).map((variant) => variant._id),
            },
            user_eligibility: { type: "all" },
            min_order_value: 120000,
            usage_limit: 100,
            usage_per_user_limit: 2,
            is_stackable: false,
            stack_priority: 5,
            started_at: addDays(-3),
            expiry_date: addDays(28),
            status: "active",
            usage_count: 5,
            created_by: adminId,
        },
        {
            code: "VIP20",
            type: "percent",
            value: 20,
            max_discount_amount: 100000,
            application_strategy: "apply_all",
            applicable_targets: { type: "all" },
            user_eligibility: {
                type: "vip_users",
                min_user_tier: "gold",
            },
            min_order_value: 300000,
            usage_limit: 100,
            usage_per_user_limit: 2,
            is_stackable: false,
            stack_priority: 10,
            started_at: addDays(-2),
            expiry_date: addDays(60),
            status: "active",
            usage_count: 0,
            created_by: adminId,
        },
        {
            code: "PRIVATE25K",
            type: "fixed",
            value: 25000,
            application_strategy: "apply_all",
            applicable_targets: { type: "all" },
            user_eligibility: {
                type: "specific_users",
                user_ids: refs.users.slice(0, 3).map((user) => user._id),
            },
            min_order_value: 100000,
            usage_limit: 60,
            usage_per_user_limit: 2,
            is_stackable: false,
            stack_priority: 7,
            started_at: addDays(-2),
            expiry_date: addDays(30),
            status: "active",
            usage_count: 1,
            created_by: adminId,
        },
        {
            code: "FLASH2H",
            type: "percent",
            value: 30,
            max_discount_amount: 80000,
            application_strategy: "apply_all",
            applicable_targets: { type: "all" },
            user_eligibility: { type: "all" },
            min_order_value: 200000,
            usage_limit: 50,
            usage_per_user_limit: 1,
            claim_limit: 50,
            show_on_homepage: true,
            homepage_priority: 120,
            requires_claim: true,
            is_stackable: false,
            stack_priority: 20,
            started_at: addHours(-1),
            expiry_date: addHours(2),
            status: "active",
            usage_count: 8,
            created_by: adminId,
        },
        {
            code: "NEAREXPIRY15",
            type: "percent",
            value: 15,
            max_discount_amount: 45000,
            application_strategy: "apply_all",
            applicable_targets: { type: "all" },
            user_eligibility: { type: "all" },
            min_order_value: 150000,
            usage_limit: 100,
            usage_per_user_limit: 1,
            claim_limit: 100,
            show_on_homepage: true,
            homepage_priority: 70,
            requires_claim: true,
            is_stackable: false,
            stack_priority: 6,
            started_at: addDays(-10),
            expiry_date: addDays(2),
            status: "active",
            usage_count: 15,
            created_by: adminId,
        },
        {
            code: "COMINGSOON20",
            type: "percent",
            value: 20,
            max_discount_amount: 60000,
            application_strategy: "apply_all",
            applicable_targets: { type: "all" },
            user_eligibility: { type: "all" },
            min_order_value: 200000,
            usage_limit: 200,
            usage_per_user_limit: 2,
            is_stackable: false,
            stack_priority: 5,
            started_at: addDays(3),
            expiry_date: addDays(40),
            status: "active",
            usage_count: 0,
            created_by: adminId,
        },
        {
            code: "PAUSED10",
            type: "percent",
            value: 10,
            max_discount_amount: 30000,
            application_strategy: "apply_all",
            applicable_targets: { type: "all" },
            user_eligibility: { type: "all" },
            min_order_value: 100000,
            usage_limit: 100,
            usage_per_user_limit: 1,
            is_stackable: false,
            stack_priority: 1,
            started_at: addDays(-5),
            expiry_date: addDays(30),
            status: "paused",
            usage_count: 0,
            created_by: adminId,
        },
        {
            code: "INACTIVE20K",
            type: "fixed",
            value: 20000,
            application_strategy: "apply_all",
            applicable_targets: { type: "all" },
            user_eligibility: { type: "all" },
            min_order_value: 100000,
            usage_limit: 100,
            usage_per_user_limit: 1,
            is_stackable: false,
            stack_priority: 1,
            started_at: addDays(-5),
            expiry_date: addDays(30),
            status: "inactive",
            usage_count: 0,
            created_by: adminId,
        },
        {
            code: "EXPIRED50",
            type: "percent",
            value: 50,
            max_discount_amount: 100000,
            application_strategy: "apply_all",
            applicable_targets: { type: "all" },
            user_eligibility: { type: "all" },
            min_order_value: 200000,
            usage_limit: 100,
            usage_per_user_limit: 1,
            is_stackable: false,
            stack_priority: 1,
            started_at: addDays(-60),
            expiry_date: addDays(-1),
            status: "expired",
            usage_count: 25,
            created_by: adminId,
        },
        {
            code: "LIMITLEFT",
            type: "fixed",
            value: 15000,
            application_strategy: "apply_all",
            applicable_targets: { type: "all" },
            user_eligibility: { type: "all" },
            min_order_value: 80000,
            usage_limit: 20,
            usage_per_user_limit: 1,
            is_stackable: false,
            stack_priority: 2,
            started_at: addDays(-10),
            expiry_date: addDays(15),
            status: "active",
            usage_count: 19,
            created_by: adminId,
        },
    ];
};

const seedDiscounts = async () => {
    console.log("== Seeding discounts ==");

    const admin = await getAdminUser();
    const refs = await getRefs();

    const discountsData = buildDiscountsData(refs, admin._id);

    for (const item of discountsData) {
        const code = item.code.toUpperCase().trim();

        const existingDiscount = await Discount.findOne(
            { code },
            null,
            { includeDeleted: true }
        );

        const payload = {
            ...item,
            code,
            updated_by: admin._id,
            is_deleted: false,
            deleted_at: null,
        };

        if (existingDiscount) {
            await Discount.updateOne(
                { _id: existingDiscount._id },
                { $set: payload },
                { runValidators: true }
            );

            console.log(`↻ Updated discount: ${code}`);
            continue;
        }

        await Discount.create(payload);

        console.log(`✓ Created discount: ${code}`);
    }

    console.log("✓ Discounts seeding completed");
};

if (require.main === module) {
    if (!MONGODB_URI) {
        throw new Error("Missing MONGO_URI in .env");
    }

    const run = async () => {
        try {
            await mongoose.connect(MONGODB_URI, {
                dbName: process.env.MONGODB_DB_NAME || "nguyenlien_dev",
            });

            console.log("✓ MongoDB connected");
            console.log("DB NAME:", mongoose.connection.name);

            await seedDiscounts();
        } catch (err) {
            console.error("✗ Discount seeding error:", err);
            process.exitCode = 1;
        } finally {
            await mongoose.disconnect();
            console.log("✓ MongoDB disconnected");
        }
    };

    run();
}

module.exports = seedDiscounts;
