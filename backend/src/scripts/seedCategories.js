const mongoose = require("mongoose");
const Category = require("../modules/categories/category.model");

const seedCategoriesData = [
    {
        name: "Túi bao trái xoài",
        slug: "tui-bao-trai-xoai",
        description:
            "Các loại túi dùng để bao trái xoài, giúp hạn chế côn trùng, bụi bẩn và bảo vệ vỏ trái trong quá trình phát triển.",
        display_order: 1,
    },
    {
        name: "Túi bao trái bưởi",
        slug: "tui-bao-trai-buoi",
        description:
            "Túi dùng cho bưởi và các loại trái lớn, giúp hạn chế côn trùng chích hút và bảo vệ bề mặt vỏ.",
        display_order: 2,
    },
    {
        name: "Túi bao trái ổi",
        slug: "tui-bao-trai-oi",
        description:
            "Túi dùng cho trái ổi, phù hợp để bảo vệ trái non khỏi ruồi vàng, sâu bệnh và tác động từ môi trường.",
        display_order: 3,
    },
    {
        name: "Túi bao trái thanh long",
        slug: "tui-bao-trai-thanh-long",
        description:
            "Túi dùng cho thanh long, giúp bảo vệ trái trong giai đoạn phát triển và giữ bề mặt trái sạch hơn.",
        display_order: 4,
    },
    {
        name: "Túi bao trái mít",
        slug: "tui-bao-trai-mit",
        description:
            "Túi dùng cho mít và các loại trái lớn, ưu tiên chất liệu bền, thoáng khí và kích thước rộng.",
        display_order: 5,
    },
    {
        name: "Túi bao trái nho",
        slug: "tui-bao-trai-nho",
        description:
            "Túi dùng cho nho hoặc các chùm trái nhỏ, phù hợp với nhóm sản phẩm cần bao theo chùm thay vì từng trái.",
        display_order: 6,
    },
    {
        name: "Túi bao nhãn và vải",
        slug: "tui-bao-nhan-vai",
        description:
            "Túi dùng cho nhãn, vải và các loại trái mọc theo chùm, giúp hạn chế côn trùng và bụi bẩn.",
        display_order: 7,
    },
    {
        name: "Túi bao buồng chuối",
        slug: "tui-bao-trai-chuoi",
        description:
            "Túi dùng cho buồng chuối, có thiết kế dài, thoáng khí và dễ cố định trên cây.",
        display_order: 8,
    },
    {
        name: "Túi bao trái na và mãng cầu",
        slug: "tui-bao-trai-na-mang-cau",
        description:
            "Túi dùng cho na, mãng cầu và các loại trái có bề mặt dễ bị côn trùng tấn công trong giai đoạn phát triển.",
        display_order: 9,
    },
    {
        name: "Túi bao rau củ quả dài",
        slug: "tui-bao-rau-cu-qua-dai",
        description:
            "Túi dùng cho mướp, bầu, bí, khổ qua và các loại quả dài, có kích thước dài hơn túi bao trái thông thường.",
        display_order: 10,
    },
    {
        name: "Sản phẩm khác",
        slug: "san-pham-khac",
        description:
            "Các vật tư phụ trợ dùng trong vườn và đóng gói như dây thun, dây buộc, tem nhãn và dụng cụ nhỏ.",
        display_order: 11,
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
                dbName: process.env.MONGODB_DB_NAME || "nguyenlien_dev",
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
