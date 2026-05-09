const jwt = require("jsonwebtoken");
const AppError = require("../utils/appError.util");
const {
    getAccessSecret,
    getRefreshSecret,
    baseVerifyOptions,
} = require("../utils/constants.util");

const verifyAccessToken = (token) => {
    try {
        const decoded = jwt.verify(
            token,
            getAccessSecret(),
            baseVerifyOptions()
        );

        if (decoded.type !== "access") {
            throw new AppError(
                "Invalid token type",
                401,
                "INVALID_TOKEN"
            );
        }

        return decoded;
    } catch (err) {
        if (err instanceof AppError) {
            throw err;
        }

        if (err.name === "TokenExpiredError") {
            throw new AppError(
                "Token expired",
                401,
                "TOKEN_EXPIRED"
            );
        }

        if (
            err.name === "JsonWebTokenError" ||
            err.name === "NotBeforeError"
        ) {
            throw new AppError(
                "Invalid token",
                401,
                "INVALID_TOKEN"
            );
        }

        throw new AppError(
            "Token verification failed",
            401,
            "TOKEN_VERIFICATION_FAILED"
        );
    }
};

const verifyRefreshToken = (token) => {
    try {
        const decoded = jwt.verify(
            token,
            getRefreshSecret(),
            baseVerifyOptions()
        );

        if (decoded.type !== "refresh") {
            throw new AppError(
                "Invalid refresh token type",
                401,
                "INVALID_TOKEN"
            );
        }

        if (!decoded.jti) {
            throw new AppError(
                "Missing JTI in token",
                401,
                "INVALID_TOKEN"
            );
        }

        return decoded;
    } catch (err) {
        if (err instanceof AppError) {
            throw err;
        }

        if (err.name === "TokenExpiredError") {
            throw new AppError(
                "Refresh token expired",
                401,
                "TOKEN_EXPIRED"
            );
        }

        if (
            err.name === "JsonWebTokenError" ||
            err.name === "NotBeforeError"
        ) {
            throw new AppError(
                "Invalid refresh token",
                401,
                "INVALID_TOKEN"
            );
        }

        throw new AppError(
            "Refresh token verification failed",
            401,
            "TOKEN_VERIFICATION_FAILED"
        );
    }
};

module.exports = {
    verifyAccessToken,
    verifyRefreshToken,
};