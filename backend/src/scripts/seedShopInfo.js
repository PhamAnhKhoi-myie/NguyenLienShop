const mongoose = require("mongoose");
const ShopInfo = require("../modules/shop_info/shop_info.model");

const shopInfoData = {
    shop_name: "Nguyễn Liên Shop",
    email: "support@nguyenlien.shop",
    phone: "0909123456",
    address: "Kho Nguyễn Liên Shop, TP. Hồ Chí Minh",
    shipping_partner: "Viettel Post",
    working_hours: [
        { day: "mon", open: "08:00", close: "20:00" },
        { day: "tue", open: "08:00", close: "20:00" },
        { day: "wed", open: "08:00", close: "20:00" },
        { day: "thu", open: "08:00", close: "20:00" },
        { day: "fri", open: "08:00", close: "20:00" },
        { day: "sat", open: "08:00", close: "20:00" },
        { day: "sun", open: "09:00", close: "18:00" },
        { day: "holiday", open: "09:00", close: "18:00" },
    ],
    social_links: {
        facebook: "https://facebook.com/nguyenlien.shop",
        zalo: "https://zalo.me/0909123456",
        instagram: "https://instagram.com/nguyenlien.shop",
        shoppe: "https://shopee.vn/nguyenlien.shop",
        tiktok: "https://www.tiktok.com/@nguyenlien.shop",
    },
    certification_links: {
        ministry_notified: "https://online.gov.vn/Home/WebDetails/000000",
        ministry_registered: "https://online.gov.vn/Home/WebDetails/000001",
        extra: "https://nguyenlien.shop/chung-nhan",
    },
    map_embed_url: "https://www.google.com/maps?q=NguyenLien%20Shop%20TP.%20Ho%20Chi%20Minh",
    is_active: true,
};

const seedShopInfo = async () => {
    console.log("== Seeding shop info ==");

    const existing = await ShopInfo.findOne().sort({ created_at: 1 });
    const count = await ShopInfo.countDocuments();

    if (count > 1) {
        console.warn(`[shop-info] Found ${count} records. Updating the oldest record only.`);
    }

    if (existing) {
        await ShopInfo.updateOne(
            { _id: existing._id },
            { $set: shopInfoData },
            { runValidators: true }
        );

        console.log("[shop-info] Updated shop info");
        return;
    }

    await ShopInfo.create(shopInfoData);

    console.log("[shop-info] Created shop info");
};

if (require.main === module) {
    require("dotenv").config();

    const MONGODB_URI = process.env.MONGO_URI;

    if (!MONGODB_URI) {
        throw new Error("Missing MONGO_URI in .env");
    }

    const run = async () => {
        try {
            await mongoose.connect(MONGODB_URI, {
                dbName: process.env.MONGODB_DB_NAME || "nguyenlien_dev",
            });

            console.log("MongoDB connected");
            console.log("DB NAME:", mongoose.connection.name);

            await seedShopInfo();
        } catch (err) {
            console.error("Shop info seeding error:", err);
            process.exitCode = 1;
        } finally {
            await mongoose.disconnect();
            console.log("MongoDB disconnected");
        }
    };

    run();
}

module.exports = seedShopInfo;
