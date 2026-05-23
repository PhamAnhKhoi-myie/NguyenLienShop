const mongoose = require("mongoose");
const Category = require("../modules/categories/category.model");

const seedCategoriesData = [
    {
        name: "Túi bao trái xoài",
        slug: "tui-bao-trai-xoai",
        description:
            "Các loại túi bao dùng cho xoài, hỗ trợ hạn chế côn trùng, bụi bẩn và bảo vệ vỏ trái trong quá trình phát triển.",
        display_order: 1,
    },
    {
        name: "Túi bao trái bưởi",
        slug: "tui-bao-trai-buoi",
        description:
            "Túi bao cho bưởi và các loại trái có kích thước lớn, thường dùng để giảm côn trùng chích hút và bảo vệ bề mặt vỏ.",
        display_order: 2,
    },
    {
        name: "Túi bao trái ổi",
        slug: "tui-bao-trai-oi",
        description:
            "Túi bao cho trái ổi, phù hợp với nhu cầu bảo vệ trái non khỏi ruồi vàng, sâu bệnh và tác động từ môi trường.",
        display_order: 3,
    },
    {
        name: "Túi bao trái thanh long",
        slug: "tui-bao-trai-thanh-long",
        description:
            "Túi bao dùng cho thanh long, giúp bảo vệ trái trong giai đoạn phát triển và giữ bề mặt trái sạch hơn.",
        display_order: 4,
    },
    {
        name: "Túi bao trái mít",
        slug: "tui-bao-trai-mit",
        description:
            "Túi bao cho mít và các loại trái lớn, ưu tiên chất liệu bền, thoáng khí và kích thước rộng.",
        display_order: 5,
    },
    {
        name: "Túi bao trái nho",
        slug: "tui-bao-trai-nho",
        description:
            "Túi bao cho nho hoặc các chùm trái nhỏ, phù hợp nhóm sản phẩm cần bao theo chùm thay vì từng trái riêng lẻ.",
        display_order: 6,
    },
    {
        name: "Túi bao nhãn vải",
        slug: "tui-bao-nhan-vai",
        description:
            "Túi bao cho nhãn, vải và các loại trái mọc theo chùm, hỗ trợ hạn chế côn trùng và bụi bẩn.",
        display_order: 7,
    },
    {
        name: "Túi bao trái chuối",
        slug: "tui-bao-trai-chuoi",
        description:
            "Túi bao cho buồng chuối, thường cần kích thước dài, thoáng khí và dễ cố định trên cây.",
        display_order: 8,
    },
    {
        name: "Túi bao trái na mãng cầu",
        slug: "tui-bao-trai-na-mang-cau",
        description:
            "Túi bao cho na, mãng cầu và các loại trái có bề mặt dễ bị côn trùng tấn công trong giai đoạn lớn trái.",
        display_order: 9,
    },
    {
        name: "Túi bao rau củ quả dài",
        slug: "tui-bao-rau-cu-qua-dai",
        description:
            "Túi bao cho mướp, bầu, bí, khổ qua và các loại quả dáng dài, phù hợp nhóm sản phẩm cần kích thước dài hơn túi trái cây thông thường.",
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