const mongoose = require("mongoose");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const setupConnectionListeners = () => {
    mongoose.connection.on("error", (err) => {
        console.error("MongoDB runtime error:", err);
    });

    mongoose.connection.on("disconnected", () => {
        console.warn("MongoDB disconnected");
    });

    mongoose.connection.on("reconnected", () => {
        console.log("MongoDB reconnected");
    });
};

setupConnectionListeners();

const connectDB = async (retries = 5, baseDelayMs = 5000) => {
    const dbName = process.env.MONGODB_DB_NAME || "nguyenlien_db";

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const conn = await mongoose.connect(process.env.MONGODB_URI, {
                dbName,
            });

            console.log(
                `MongoDB connected: ${conn.connection.host} | DB: ${conn.connection.name}`
            );
            return;
        } catch (error) {
            console.error(
                `MongoDB connection error (attempt ${attempt}/${retries}):`,
                error.message
            );

            if (attempt === retries) {
                console.error("Max retries reached. Exiting.");
                process.exit(1);
            }

            const delay = baseDelayMs * attempt;
            console.log(`Retrying in ${delay}ms...`);
            await sleep(delay);
        }
    }
};

module.exports = connectDB;