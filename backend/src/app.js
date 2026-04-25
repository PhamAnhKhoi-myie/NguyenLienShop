const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./docs/swagger");
const routes = require("./routes/index");
const errorHandler = require("./middlewares/errorHandler.middleware")

const app = express();

app.set('trust proxy', 1);

const parseCorsOrigins = () => {
    const raw = process.env.CORS_ORIGINS || "http://localhost:3000";
    return raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
};

app.use(helmet());

app.use(
    cors({
        origin: (origin, callback) => {
            const allowed = parseCorsOrigins();
            if (!origin || allowed.includes(origin)) {
                return callback(null, true);
            }
            return callback(new Error("Not allowed by CORS"));
        },
        credentials: true,
    })
);

app.use(cookieParser());
app.use(morgan("dev"));

// ✅ Stripe webhook requires raw body for signature verification
// Must be registered BEFORE express.json() to avoid body being parsed
app.use(
    "/api/v1/payments/webhook/stripe",
    express.raw({ type: "application/json" })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api/v1", apiLimiter);
app.use("/api/v1", routes);


const AppError = require("./utils/appError.util");

app.use((req, res, next) => {
    next(new AppError("Route not found", 404, "NOT_FOUND"));
});

app.use(errorHandler);

module.exports = app;