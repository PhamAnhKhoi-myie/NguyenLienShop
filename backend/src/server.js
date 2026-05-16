require("dotenv").config();

const mongoose = require("mongoose");
const app = require("./app");
const connectDB = require("./config/db");
const EmailService = require('./modules/emails/email.service');

const PORT = process.env.PORT || 5000;

let server;
let emailWorker;

const shutdown = async (signal) => {
    console.log(`\n${signal} received, shutting down gracefully...`);

    if (server) {
        await new Promise((resolve, reject) => {
            server.close((err) => (err ? reject(err) : resolve()));
        });
    }

    if (emailWorker) {
        clearInterval(emailWorker);
    }

    await mongoose.connection.close();
    console.log("HTTP server closed, MongoDB connection closed");
    process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

const startServer = async () => {
    await connectDB();

    server = app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
        console.log(`Swagger docs at http://localhost:${PORT}/api-docs`);
    });

    emailWorker = setInterval(() => {
        if (mongoose.connection.readyState !== 1) {
            return;
        }

        EmailService.processOneJob().catch(err => console.error('Email Worker Error:', err));
    }, 10000);
};

startServer().catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
});
