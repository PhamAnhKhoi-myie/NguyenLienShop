const mongoose = require("mongoose");

const Banner = require("../modules/banners/banner.model");
const User = require("../modules/users/user.model");
const seedUser = require("./seedUser");

const bannerSeedData = [
    {
        image: {
            url: "https://res.cloudinary.com/dngkdo6ni/image/upload/v1779601409/nguyen-lien-shop/banners/sivwrs7gfzneivemnedj.jpg",
            alt_text: "Banner túi bao trái cây Minh Thư 1",
            public_id: "nguyen-lien-shop/banners/sivwrs7gfzneivemnedj",
        },
        link: "/products",
        location: "homepage_top",
        sort_order: 1,
        start_at: new Date("2026-01-01T00:00:00.000Z"),
        end_at: new Date("2035-12-31T23:59:59.000Z"),
    },
    {
        image: {
            url: "https://res.cloudinary.com/dngkdo6ni/image/upload/v1779597487/nguyen-lien-shop/banners/kxynoesf4mmak3csc7ci.jpg",
            alt_text: "Banner túi bao trái cây Minh Thư 2",
            public_id: "nguyen-lien-shop/banners/kxynoesf4mmak3csc7ci",
        },
        link: "/products",
        location: "homepage_top",
        sort_order: 2,
        start_at: new Date("2026-01-01T00:00:00.000Z"),
        end_at: new Date("2035-12-31T23:59:59.000Z"),
    },
    {
        image: {
            url: "https://res.cloudinary.com/dngkdo6ni/image/upload/v1779597213/nguyen-lien-shop/banners/oahmgdwry1u8k4y7vqkl.jpg",
            alt_text: "Banner túi bao trái cây Minh Thư 3",
            public_id: "nguyen-lien-shop/banners/oahmgdwry1u8k4y7vqkl",
        },
        link: "/products",
        location: "homepage_top",
        sort_order: 3,
        start_at: new Date("2026-01-01T00:00:00.000Z"),
        end_at: new Date("2035-12-31T23:59:59.000Z"),
    },
    {
        image: {
            url: "https://res.cloudinary.com/dngkdo6ni/image/upload/v1779596362/nguyen-lien-shop/banners/njwv3xltl9jqvlulxwia.jpg",
            alt_text: "Banner túi bao trái cây Minh Thư 4",
            public_id: "nguyen-lien-shop/banners/njwv3xltl9jqvlulxwia",
        },
        link: "/products",
        location: "homepage_top",
        sort_order: 4,
        start_at: new Date("2026-01-01T00:00:00.000Z"),
        end_at: new Date("2035-12-31T23:59:59.000Z"),
    },
];

const resolveSeedActor = async () => {
    let actor = await User.findOne({
        roles: { $in: ["ADMIN", "MANAGER"] },
        status: "ACTIVE",
    }).sort({ created_at: 1 });

    if (!actor) {
        await seedUser();

        actor = await User.findOne({
            roles: { $in: ["ADMIN", "MANAGER"] },
            status: "ACTIVE",
        }).sort({ created_at: 1 });
    }

    return actor?._id || null;
};

const seedBanners = async () => {
    console.log("== Seeding banners ==");

    const actorId = await resolveSeedActor();

    for (const item of bannerSeedData) {
        const existing = await Banner.findOne(
            {
                location: item.location,
                sort_order: item.sort_order,
            },
            null,
            { includeDeleted: true }
        );

        const bannerPayload = {
            ...item,
            updated_by: actorId,
            is_deleted: false,
            deleted_at: null,
        };

        if (existing) {
            await Banner.updateOne(
                { _id: existing._id },
                { $set: bannerPayload },
                { runValidators: true }
            );

            console.log(
                `[banners] Updated: ${item.location} #${item.sort_order}`
            );
            continue;
        }

        await Banner.create({
            ...bannerPayload,
            created_by: actorId,
        });

        console.log(`[banners] Created: ${item.location} #${item.sort_order}`);
    }

    console.log("Banners seeding completed");
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

            await seedBanners();
        } catch (err) {
            console.error("Banner seeding error:", err);
            process.exitCode = 1;
        } finally {
            await mongoose.disconnect();
            console.log("MongoDB disconnected");
        }
    };

    run();
}

module.exports = seedBanners;
