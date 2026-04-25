const jwt = require("jsonwebtoken");

const JWT_ALGORITHM = "HS256";
const JWT_ISSUER = process.env.JWT_ISSUER || "your-app";
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || "your-client";
const JWT_CLOCK_TOLERANCE = Number(process.env.JWT_CLOCK_TOLERANCE || 0); // seconds

const getAccessSecret = () => {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) throw new Error("Missing JWT_ACCESS_SECRET");
    return secret;
};

const getRefreshSecret = () => {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) throw new Error("Missing JWT_REFRESH_SECRET");
    return secret;
};

const baseSignOptions = () => ({
    algorithm: JWT_ALGORITHM,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
});

const baseVerifyOptions = () => ({
    algorithms: [JWT_ALGORITHM],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
    ...(JWT_CLOCK_TOLERANCE > 0 ? { clockTolerance: JWT_CLOCK_TOLERANCE } : {}),
});

module.exports = {
    getAccessSecret,
    getRefreshSecret,
    baseSignOptions,
    baseVerifyOptions,
};