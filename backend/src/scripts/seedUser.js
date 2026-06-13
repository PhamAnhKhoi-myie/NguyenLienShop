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
            full_name: "System Admin",
            phone_number: "0901000098",
        },
    },
    {
        email: "anhkhoivk8939@gmail.com",
        password: process.env.SEED_MANAGER_PASSWORD || "Manager@123",
        roles: ["MANAGER"],
        profile: {
            full_name: "Manager User",
            phone_number: "0901000099",
        },
    },
    {
        email: "nguyenvana.customer@gmail.com",
        password: "Customer@123",
        roles: ["CUSTOMER"],
        profile: {
            full_name: "Nguyen Van An",
            phone: "0901000001",
            address: "Can Tho",
        },
    },
    {
        email: "tranthibich.customer@gmail.com",
        password: "Customer@123",
        roles: ["CUSTOMER"],
        profile: {
            full_name: "Tran Thi Bich",
            phone: "0901000002",
            address: "Tien Giang",
        },
    },
    {
        email: "levanbinh.customer@gmail.com",
        password: "Customer@123",
        roles: ["CUSTOMER"],
        profile: {
            full_name: "Le Van Binh",
            phone: "0901000003",
            address: "Vinh Long",
        },
    },
    {
        email: "phamthicam.customer@gmail.com",
        password: "Customer@123",
        roles: ["CUSTOMER"],
        profile: {
            full_name: "Pham Thi Cam",
            phone: "0901000004",
            address: "Ben Tre",
        },
    },
    {
        email: "huynhvancuong.customer@gmail.com",
        password: "Customer@123",
        roles: ["CUSTOMER"],
        profile: {
            full_name: "Huynh Van Cuong",
            phone: "0901000005",
            address: "Dong Thap",
        },
    },
    {
        email: "dangthidiem.customer@gmail.com",
        password: "Customer@123",
        roles: ["CUSTOMER"],
        profile: {
            full_name: "Dang Thi Diem",
            phone: "0901000006",
            address: "Long An",
        },
    },
    {
        email: "buitruonggiang.customer@gmail.com",
        password: "Customer@123",
        roles: ["CUSTOMER"],
        profile: {
            full_name: "Bui Truong Giang",
            phone: "0901000007",
            address: "An Giang",
        },
    },
    {
        email: "vothihan.customer@gmail.com",
        password: "Customer@123",
        roles: ["CUSTOMER"],
        profile: {
            full_name: "Vo Thi Han",
            phone: "0901000008",
            address: "Hau Giang",
        },
    },
    {
        email: "ngothuhoai.customer@gmail.com",
        password: "Customer@123",
        roles: ["CUSTOMER"],
        profile: {
            full_name: "Ngo Thu Hoai",
            phone: "0901000009",
            address: "Soc Trang",
        },
    },
    {
        email: "dovanhung.customer@gmail.com",
        password: "Customer@123",
        roles: ["CUSTOMER"],
        profile: {
            full_name: "Do Van Hung",
            phone: "0901000010",
            address: "Tra Vinh",
        },
    },
    {
        email: "nguyenthilan.customer@gmail.com",
        password: "Customer@123",
        roles: ["CUSTOMER"],
        profile: {
            full_name: "Nguyen Thi Lan",
            phone: "0901000011",
            address: "City. Ho Chi Minh",
        },
    },
    {
        email: "tranvanloc.customer@gmail.com",
        password: "Customer@123",
        roles: ["CUSTOMER"],
        profile: {
            full_name: "Tran Van Loc",
            phone: "0901000012",
            address: "Binh Duong",
        },
    },
    {
        email: "levanminh.customer@gmail.com",
        password: "Customer@123",
        roles: ["CUSTOMER"],
        profile: {
            full_name: "Le Van Minh",
            phone: "0901000013",
            address: "Dong Nai",
        },
    },
    {
        email: "phamthimai.customer@gmail.com",
        password: "Customer@123",
        roles: ["CUSTOMER"],
        profile: {
            full_name: "Pham Thi Mai",
            phone: "0901000014",
            address: "Tay Ninh",
        },
    },
    {
        email: "hoangvannghia.customer@gmail.com",
        password: "Customer@123",
        roles: ["CUSTOMER"],
        profile: {
            full_name: "Hoang Van Nghia",
            phone: "0901000015",
            address: "Binh Phuoc",
        },
    },
    {
        email: "phanthioanh.customer@gmail.com",
        password: "Customer@123",
        roles: ["CUSTOMER"],
        profile: {
            full_name: "Phan Thi Oanh",
            phone: "0901000016",
            address: "Lam Dong",
        },
    },
    {
        email: "truongvanphuc.customer@gmail.com",
        password: "Customer@123",
        roles: ["CUSTOMER"],
        profile: {
            full_name: "Truong Van Phuc",
            phone: "0901000017",
            address: "Khanh Hoa",
        },
    },
    {
        email: "maithiquyen.customer@gmail.com",
        password: "Customer@123",
        roles: ["CUSTOMER"],
        profile: {
            full_name: "Mai Thi Quyen",
            phone: "0901000018",
            address: "Ninh Thuan",
        },
    },
    {
        email: "caovanson.customer@gmail.com",
        password: "Customer@123",
        roles: ["CUSTOMER"],
        profile: {
            full_name: "Cao Van Son",
            phone: "0901000019",
            address: "Binh Thuan",
        },
    },
    {
        email: "dinhtithao.customer@gmail.com",
        password: "Customer@123",
        roles: ["CUSTOMER"],
        profile: {
            full_name: "Dinh Thi Thao",
            phone: "0901000020",
            address: "Dak Lak",
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
            console.log(`⊘ Skipped user: ${email}`);
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
                dbName: process.env.MONGODB_DB_NAME || "nguyenlien_db",
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
