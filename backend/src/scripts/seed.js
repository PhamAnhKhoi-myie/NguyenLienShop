require("dotenv").config();
const mongoose = require("mongoose");

const seedUser = require("./seedUser");
const seedCategories = require("./seedCategories");
const seedProducts = require("./seedProducts");
const seedDiscounts = require("./seedDiscounts");

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
        await seedUser();
        await seedProducts();
        await seedDiscounts();

        console.log("✓ All seed completed");
    } catch (err) {
        console.error("✗ Seed failed:", err);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
        console.log("✓ MongoDB disconnected");
    }
};

run();