const jwt = require("jsonwebtoken");
const { randomUUID } = require("crypto");
const { getAccessSecret, getRefreshSecret, baseSignOptions } = require("../utils/constants.util");

// ✅ FIX #1: Accept plain object (not user doc) for auth.service compatibility
const generateAccessToken = (payload) => {
    // Support both: { userId: "...", roles: [...], tokenVersion: ... }
    const userId = payload.userId || payload._id?.toString?.();

    if (!userId) {
        throw new Error("userId or _id required in payload");
    }

    return jwt.sign(
        {
            userId,
            roles: payload.roles || [],
            tokenVersion: payload.tokenVersion || 0, // ✅ Add tokenVersion
            type: "access",
        },
        getAccessSecret(),
        {
            ...baseSignOptions(),
            expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
        }
    );
};

// ✅ FIX #3: Accept plain object for auth.service compatibility
const generateRefreshToken = (payload, jti = randomUUID()) => {
    // Support both: { userId: "...", jti: "..." } and { _id: ObjectId, jti: "..." }
    const userId = payload.userId || payload._id?.toString?.();

    if (!userId) {
        throw new Error("userId or _id required in payload");
    }

    return jwt.sign(
        {
            userId,
            jti: jti || payload.jti,
            tokenVersion: payload.tokenVersion || 0, // ✅ Add tokenVersion
            type: "refresh",
        },
        getRefreshSecret(),
        {
            ...baseSignOptions(),
            expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
        }
    );
};

module.exports = {
    generateAccessToken,
    generateRefreshToken,
};