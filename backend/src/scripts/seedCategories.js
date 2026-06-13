const mongoose = require("mongoose");
const Category = require("../modules/categories/category.model");

const seedCategoriesData = [
    {
        name: "Mango bag",
        slug: "tui-bao-trai-xoai",
        description:
            "Types of bags used for mangoes, helping to limit insects, dust and protect the fruit peel during the growing process.",
        display_order: 1,
    },
    {
        name: "Grapefruit bag",
        slug: "tui-bao-trai-buoi",
        description:
            "Bags for grapefruit and other large fruits, often used to reduce sucking insects and protect the peel surface.",
        display_order: 2,
    },
    {
        name: "Guava bag",
        slug: "tui-bao-trai-oi",
        description:
            "Bags for guava fruit, suitable for the need to protect young fruit from yellow flies, pests and environmental impacts.",
        display_order: 3,
    },
    {
        name: "Dragon fruit bag",
        slug: "tui-bao-trai-thanh-long",
        description:
            "Bags used for dragon fruit, help protect the fruit during the growing stage and keep the fruit surface cleaner.",
        display_order: 4,
    },
    {
        name: "Jackfruit bag",
        slug: "tui-bao-trai-mit",
        description:
            "Bags for jackfruit and other large fruits, prioritize durable, breathable materials and large sizes.",
        display_order: 5,
    },
    {
        name: "Grape bag",
        slug: "tui-bao-trai-nho",
        description:
            "Bags for grapes or small bunches of fruit, suitable for groups of products that need to be wrapped in bunches instead of individual fruits.",
        display_order: 6,
    },
    {
        name: "Fabric label bag",
        slug: "tui-bao-nhan-vai",
        description:
            "Bags for longans, lychees and fruits that grow in clusters, helping to limit insects and dust.",
        display_order: 7,
    },
    {
        name: "Banana bag",
        slug: "tui-bao-trai-chuoi",
        description:
            "Bags for banana bunches, usually need to be long, breathable and easy to fix on the tree.",
        display_order: 8,
    },
    {
        name: "Bag of custard apple fruit",
        slug: "tui-bao-trai-na-mang-cau",
        description:
            "Bags for custard apple, custard apple and other fruits have surfaces that are susceptible to insect attack during the fruit growing stage.",
        display_order: 9,
    },
    {
        name: "Long fruit and vegetable bags",
        slug: "tui-bao-rau-cu-qua-dai",
        description:
            "Bags for luffa, gourd, squash, bitter melon and other long fruits, suitable for product groups that need a longer size than regular fruit bags.",
        display_order: 10,
    },
];

const seedCategories = async () => {
    console.log("== Seeding categories ==");

    for (const item of seedCategoriesData) {
        const existing = await Category.findOne(
            { slug: item.slug },
            null,
            { includeDeleted: true }
        );

        if (existing) {
            await Category.updateOne(
                { _id: existing._id },
                {
                    $set: {
                        name: item.name,
                        slug: item.slug,
                        description: item.description,
                        parent_id: null,
                        path: [],
                        level: 0,
                        status: "ACTIVE",
                        display_order: item.display_order,
                        is_deleted: false,
                        deleted_at: null,
                    },
                },
                {
                    runValidators: true,
                }
            );

            console.log(`↻ Updated category: ${item.slug}`);
            continue;
        }

        await Category.create({
            name: item.name,
            slug: item.slug,
            description: item.description,
            parent_id: null,
            path: [],
            level: 0,
            status: "ACTIVE",
            display_order: item.display_order,
        });

        console.log(`✓ Created category: ${item.slug}`);
    }

    console.log("✓ Categories seeding completed");
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
                dbName: process.env.MONGODB_DB_NAME || "nguyenlien_db",
            });

            console.log("✓ MongoDB connected");
            console.log("DB NAME:", mongoose.connection.name);

            await seedCategories();
        } catch (err) {
            console.error("✗ Category seeding error:", err);
            process.exitCode = 1;
        } finally {
            await mongoose.disconnect();
            console.log("✓ MongoDB disconnected");
        }
    };

    run();
}

module.exports = seedCategories;