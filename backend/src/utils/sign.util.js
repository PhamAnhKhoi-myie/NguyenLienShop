const jwt = require("jsonwebtoken");
const { randomUUID } = require("crypto");
const { getAccessSecret, getRefreshSecret, baseSignOptions } = require("../utils/constants.util");


const generateAccessToken = (payload) => {

    const userId = payload.userId || payload._id?.toString?.();

    if (!userId) {
        throw new Error("userId or _id required in payload");
    }

    return jwt.sign(
        {
            userId,
            roles: payload.roles || [],
            tokenVersion: payload.tokenVersion || 0,
            type: "access",
        },
        getAccessSecret(),
        {
            ...baseSignOptions(),
            expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
        }
    );
};


const generateRefreshToken = (payload) => {

    const userId = payload.userId || payload._id?.toString?.();

    if (!userId) {
        throw new Error("userId or _id required in payload");
    }
    const jti = payload.jti || randomUUID();

    return jwt.sign(
        {
            userId,
            jti,
            tokenVersion: payload.tokenVersion || 0,
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