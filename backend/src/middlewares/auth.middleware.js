const { verifyAccessToken } = require("../utils/verify.util");
const AppError = require("../utils/appError.util");
const asyncHandler = require("../utils/asyncHandler.util");
const UserService = require('../modules/users/user.service');

const extractBearerToken = (authHeader) => {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return { error: "BEARER_REQUIRED" };
    }
    const parts = authHeader.split(" ");
    if (parts.length !== 2) {
        return { error: "INVALID_BEARER" };
    }
    return { token: parts[1] };
};

const authenticate = asyncHandler(async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        throw new AppError(
            "Authorization header required",
            401,
            "BEARER_REQUIRED"
        );
    }

    const parsed = extractBearerToken(authHeader);

    if (parsed.error === "BEARER_REQUIRED") {
        throw new AppError(
            "Bearer token required",
            401,
            "BEARER_REQUIRED"
        );
    }

    if (parsed.error === "INVALID_BEARER") {
        throw new AppError(
            "Invalid authorization header format",
            401,
            "INVALID_BEARER"
        );
    }

    try {
        const decoded = verifyAccessToken(parsed.token);

        if (!decoded?.userId) {
            throw new AppError(
                "Invalid token payload",
                401,
                "INVALID_TOKEN"
            );
        }

        const dbUser = await UserService.getUserWithTokenVersion(decoded.userId);

        if (!dbUser) {
            throw new AppError(
                "User not found",
                401,
                "USER_NOT_FOUND"
            );
        }

        if (dbUser.token_version !== decoded.tokenVersion) {
            throw new AppError(
                "Token has been revoked",
                401,
                "TOKEN_REVOKED"
            );
        }

        req.user = {
            id: dbUser._id.toString(),
            roles: dbUser.roles,
        };

        next();
    } catch (error) {
        // Nếu đã là AppError → giữ nguyên
        if (error instanceof AppError) {
            throw error;
        }

        // JWT errors
        if (error.name === "TokenExpiredError") {
            throw new AppError(
                "Access token has expired",
                401,
                "TOKEN_EXPIRED"
            );
        }

        if (
            error.name === "JsonWebTokenError" ||
            error.name === "NotBeforeError"
        ) {
            throw new AppError(
                "Invalid token",
                401,
                "INVALID_TOKEN"
            );
        }

        console.error("[auth.middleware] Unexpected error:", error);

        throw new AppError(
            "Authentication failed",
            401,
            "AUTH_ERROR"
        );
    }
});


module.exports = {
    authenticate,
    extractBearerToken
};