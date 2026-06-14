const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../modules/users/user.model");

const BCRYPT_SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 10);

const seedUsers = [
    {
        email: "khoiphamvk123@gmail.com",
        password: process.env.SEED_ADMIN_PASSWORD || "Admin@123",
        roles: ["ADMIN"],
        profile: {
            full_name: "Quản trị viên hệ thống",
            phone_number: "0901000098",
        },
    },
    {
        email: "anhkhoivk8939@gmail.com",
        password: process.env.SEED_MANAGER_PASSWORD || "Manager@123",
        roles: ["MANAGER"],
        profile: {
            full_name: "Quản lý cửa hàng",
            phone_number: "0901000099",
        },
    },
    {
        email: "nguyenvana.customer@gmail.com",
        password: "Customer@123",
        roles: ["CUSTOMER"],
        profile: {
            full_name: "Nguyễn Văn An",
            phone: "0901000001",
            address: "Cần Thơ",
        },
    },
    {
        email: "tranthibich.customer@gmail.com",
        password: "Customer@123",
        roles: ["CUSTOMER"],
        profile: {
            full_name: "Trần Thị Bích",
            phone: "0901000002",
            address: "Tiền Giang",
        },
    },
    {
        email: "levanbinh.customer@gmail.com",
        password: "Customer@123",
        roles: ["CUSTOMER"],
        profile: {
            full_name: "Lê Văn Bình",
            phone: "0901000003",
            address: "Vĩnh Long",
        },
    },
    {
        email: "phamthicam.customer@gmail.com",
        password: "Customer@123",
        roles: ["CUSTOMER"],
        profile: {
            full_name: "Phạm Thị Cẩm",
            phone: "0901000004",
            address: "Bến Tre",
        },
    },
    {
        email: "huynhvancuong.customer@gmail.com",
        password: "Customer@123",
        roles: ["CUSTOMER"],
        profile: {
            full_name: "Huỳnh Văn Cường",
            phone: "0901000005",
            address: "Đồng Tháp",
        },
    },
    {
        email: "dangthidiem.customer@gmail.com",
        password: "Customer@123",
        roles: ["CUSTOMER"],
        profile: {
            full_name: "Đặng Thị Diễm",
            phone: "0901000006",
            address: "Long An",
        },
    },
    {
        email: "buitruonggiang.customer@gmail.com",
        password: "Customer@123",
        roles: ["CUSTOMER"],
        profile: {
            full_name: "Bùi Trường Giang",
            phone: "0901000007",
            address: "An Giang",
        },
    },
    {
        email: "vothihan.customer@gmail.com",
        password: "Customer@123",
        roles: ["CUSTOMER"],
        profile: {
            full_name: "Võ Thị Hân",
            phone: "0901000008",
            address: "Hậu Giang",
        },
    },
    {
        email: "ngothuhoai.customer@gmail.com",
        password: "Customer@123",
        roles: ["CUSTOMER"],
        profile: {
            full_name: "Ngô Thu Hoài",
            phone: "0901000009",
            address: "Sóc Trăng",
        },
    },
    {
        email: "dovanhung.customer@gmail.com",
        password: "Customer@123",
        roles: ["CUSTOMER"],
        profile: {
            full_name: "Đỗ Văn Hùng",
            phone: "0901000010",
            address: "Trà Vinh",
        },
    },
    {
        email: "nguyenthilan.customer@gmail.com",
        password: "Customer@123",
        roles: ["CUSTOMER"],
        profile: {
            full_name: "Nguyễn Thị Lan",
            phone: "0901000011",
            address: "TP. Hồ Chí Minh",
        },
    },
    {
        email: "tranvanloc.customer@gmail.com",
        password: "Customer@123",
        roles: ["CUSTOMER"],
        profile: {
            full_name: "Trần Văn Lộc",
            phone: "0901000012",
            address: "Bình Dương",
        },
    },
    {
        email: "levanminh.customer@gmail.com",
        password: "Customer@123",
        roles: ["CUSTOMER"],
        profile: {
            full_name: "Lê Văn Minh",
            phone: "0901000013",
            address: "Đồng Nai",
        },
    },
    {
        email: "phamthimai.customer@gmail.com",
        password: "Customer@123",
        roles: ["CUSTOMER"],
        profile: {
            full_name: "Phạm Thị Mai",
            phone: "0901000014",
            address: "Tây Ninh",
        },
    },
    {
        email: "hoangvannghia.customer@gmail.com",
        password: "Customer@123",
        roles: ["CUSTOMER"],
        profile: {
            full_name: "Hoàng Văn Nghĩa",
            phone: "0901000015",
            address: "Bình Phước",
        },
    },
    {
        email: "phanthioanh.customer@gmail.com",
        password: "Customer@123",
        roles: ["CUSTOMER"],
        profile: {
            full_name: "Phan Thị Oanh",
            phone: "0901000016",
            address: "Lâm Đồng",
        },
    },
    {
        email: "truongvanphuc.customer@gmail.com",
        password: "Customer@123",
        roles: ["CUSTOMER"],
        profile: {
            full_name: "Trương Văn Phúc",
            phone: "0901000017",
            address: "Khánh Hòa",
        },
    },
    {
        email: "maithiquyen.customer@gmail.com",
        password: "Customer@123",
        roles: ["CUSTOMER"],
        profile: {
            full_name: "Mai Thị Quyên",
            phone: "0901000018",
            address: "Ninh Thuận",
        },
    },
    {
        email: "caovanson.customer@gmail.com",
        password: "Customer@123",
        roles: ["CUSTOMER"],
        profile: {
            full_name: "Cao Văn Sơn",
            phone: "0901000019",
            address: "Bình Thuận",
        },
    },
    {
        email: "dinhtithao.customer@gmail.com",
        password: "Customer@123",
        roles: ["CUSTOMER"],
        profile: {
            full_name: "Đinh Thị Thảo",
            phone: "0901000020",
            address: "Đắk Lắk",
        },
    },
];

const seedUser = async () => {
    console.log("== Seeding users ==");

    for (const user of seedUsers) {
        const email = user.email.trim().toLowerCase();
        const phoneNumber = user.profile.phone_number || user.profile.phone;

        const existing = await User.findOne({
            $or: [
                { email },
                { "profile.phone_number": phoneNumber },
            ],
        }).select("_id");

        if (existing) {
            const profileUpdates = {
                "profile.full_name": user.profile.full_name,
                "profile.phone_number": phoneNumber,
            };

            await User.updateOne(
                { _id: existing._id },
                { $set: profileUpdates },
                { runValidators: true }
            );

            console.log(`↻ Updated user: ${email}`);
            continue;
        }

        const password_hash = await bcrypt.hash(
            user.password,
            BCRYPT_SALT_ROUNDS
        );

        await User.create({
            email,
            password_hash,
            roles: user.roles,
            profile: {
                full_name: user.profile.full_name,
                phone_number: phoneNumber,
            },
            status: "ACTIVE",
            is_phone_verified: true,
            phone_verified_at: new Date(),
        });

        console.log(`✓ Created user: ${email}`);
    }

    console.log("✓ Users seeding completed");
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

            await seedUser();
        } catch (err) {
            console.error("✗ User seeding error:", err);
            process.exitCode = 1;
        } finally {
            await mongoose.disconnect();
            console.log("✓ MongoDB disconnected");
        }
    };

    run();
}

module.exports = seedUser;
