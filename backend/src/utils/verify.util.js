const jwt = require("jsonwebtoken");
const { getAccessSecret, getRefreshSecret, baseVerifyOptions } = require("../utils/constants.util");

const verifyAccessToken = (token) => {
    try {
        const decoded = jwt.verify(token, getAccessSecret(), baseVerifyOptions());
        if (decoded.type !== "access") {
            const err = new Error("Invalid token type");
            err.code = "INVALID_TOKEN";
            throw err;
        }
        return decoded;
    } catch (err) {
        if (err.code === "INVALID_TOKEN") throw err;

        if (err.name === "TokenExpiredError") {
            const e = new Error("Token expired");
            e.code = "TOKEN_EXPIRED";
            e.name = "TokenExpiredError";
            throw e;
        }

        if (err.name === "JsonWebTokenError" || err.name === "NotBeforeError") {
            const e = new Error("Invalid token");
            e.code = "INVALID_TOKEN";
            throw e;
        }

        throw err;
    }
};

const verifyRefreshToken = (token) => {
    try {
        const decoded = jwt.verify(token, getRefreshSecret(), baseVerifyOptions());

        if (decoded.type !== "refresh") {
            throw new jwt.JsonWebTokenError("Invalid token type");
        }

        if (!decoded.jti) {
            throw new jwt.JsonWebTokenError("Missing JTI in token");
        }

        return decoded;
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            const e = new Error("Refresh token expired");
            e.code = "TOKEN_EXPIRED";
            e.name = "TokenExpiredError";
            throw e;
        }

        if (err.name === "JsonWebTokenError" || err.name === "NotBeforeError") {
            const e = new Error("Invalid refresh token");
            e.code = "INVALID_TOKEN";
            throw e;
        }

        throw err;
    }
};

module.exports = {
    verifyAccessToken,
    verifyRefreshToken,
};