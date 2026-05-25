require("dotenv").config();

const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGO_URI;
const dbName = process.env.MONGODB_DB_NAME;
const nodeEnv = process.env.NODE_ENV || "development";
const allowReset = process.env.ALLOW_DB_RESET === "true";
const safeDbNamePattern = /(^|[-_])(dev|test|local)([-_]|$)/i;
const blockedDbNamePattern = /(prod|production)/i;

const assertCanReset = () => {
    if (!MONGODB_URI) {
        throw new Error("Missing MONGO_URI in .env");
    }

    if (!dbName) {
        throw new Error("MONGODB_DB_NAME is required for database reset");
    }

    if (nodeEnv === "production") {
        throw new Error("Refusing to reset database when NODE_ENV=production");
    }

    if (!allowReset) {
        throw new Error("Refusing to reset database without ALLOW_DB_RESET=true");
    }

    if (blockedDbNamePattern.test(dbName)) {
        throw new Error(`Refusing to reset production-like database name: ${dbName}`);
    }

    if (!safeDbNamePattern.test(dbName)) {
        throw new Error(
            `Refusing to reset "${dbName}". Use a dev/test/local database name.`
        );
    }
};

const run = async () => {
    try {
        assertCanReset();

        await mongoose.connect(MONGODB_URI, { dbName });

        if (mongoose.connection.name !== dbName) {
            throw new Error(
                `Connected to unexpected database "${mongoose.connection.name}"`
            );
        }

        console.log(`Resetting database: ${mongoose.connection.name}`);

        await mongoose.connection.dropDatabase();

        console.log(`Database reset completed: ${mongoose.connection.name}`);
        console.log("Run npm run seed to restore seed data.");
    } catch (err) {
        console.error("Database reset failed:", err.message);
        process.exitCode = 1;
    } finally {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
    }
};

run();
