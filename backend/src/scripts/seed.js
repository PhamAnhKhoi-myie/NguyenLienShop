require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../modules/users/user.model");

const MONGODB_URI = process.env.MONGODB_URI;
const BCRYPT_SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 10);

if (!MONGODB_URI) {
    throw new Error("Missing MONGODB_URI in .env");
}

const seedUsers = [
    {
        email: "admin@example.com",
        password: process.env.SEED_ADMIN_PASSWORD || "Admin@123",
        roles: ["ADMIN"],
        profile: { full_name: "System Admin" },
    },
    {
        email: "manager@example.com",
        password: process.env.SEED_MANAGER_PASSWORD || "Manager@123",
        roles: ["MANAGER"],
        profile: { full_name: "Manager User" },
    }
];

const run = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("✓ MongoDB connected");

        for (const user of seedUsers) {
            const email = user.email.trim().toLowerCase();

            const existing = await User.findOne({ email }).select("_id");

            if (existing) {
                console.log(`⊘ Skipped: ${email}`);
                continue;
            }

            const password_hash = await bcrypt.hash(user.password, BCRYPT_SALT_ROUNDS);

            await User.create({
                email,
                password_hash,
                roles: user.roles,
                profile: user.profile,
                status: "ACTIVE",
            });

            console.log(`✓ Created: ${email}`);
        }

        console.log("✓ Seeding completed");
    } catch (err) {
        console.error("✗ Seeding error:", err);
    } finally {
        await mongoose.disconnect();
        console.log("✓ MongoDB disconnected");
    }
};

run();