const crypto = require("crypto");
const RefreshToken = require("./token.model");
const AppError = require("../../../utils/appError.util");

const hashToken = (rawToken) =>
    crypto.createHash("sha256").update(rawToken).digest("hex");

const createRefreshToken = async (data) => {
    const tokenData = {
        user_id: data.user_id,
        jti: data.jti,
        token_hash: data.token_hash || (data.token ? hashToken(data.token) : null),
        user_agent: data.user_agent || "",
        ip_address: data.ip_address || "",
        is_revoked: data.is_revoked ?? false,
        expires_at: data.expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };
    try {
        return await RefreshToken.create(tokenData);
    } catch (error) {
        console.error("[token.service.createRefreshToken]", error);
        throw error;
    }
};

const findByJti = async (jti) => {
    if (!jti) {
        throw new AppError("JTI is required", 400, "JTI_REQUIRED");
    }
    return RefreshToken.findOne({ jti });
};

const revokeByJti = async (jti, reason = "manual", replacedByJti = null) => {
    if (!jti) {
        throw new AppError("JTI is required", 400, "JTI_REQUIRED");
    }
    const updated = await RefreshToken.findOneAndUpdate(
        { jti, is_revoked: false },
        {
            $set: {
                is_revoked: true,
                revoked_at: new Date(),
                revoked_reason: reason,
                replaced_by_jti: replacedByJti || null,
            },
        },
        { new: true }
    );
    if (!updated) {
        console.warn("[token.service.revokeByJti] Token already revoked or not found", { jti, reason });
    }
    return updated;
};

const revokeAllByUser = async (userId, reason = "security") => {
    if (!userId) {
        throw new AppError("User ID required", 400, "VALIDATION_ERROR");
    }

    const result = await RefreshToken.updateMany(
        { user_id: userId, is_revoked: false },
        {
            $set: {
                is_revoked: true,
                revoked_at: new Date(),
                revoked_reason: reason,
            },
        }
    );

    console.info("[token.service.revokeAllByUser]", {
        userId,
        revoked_count: result.modifiedCount,
        reason,
    });

    return result;
};

const verifyTokenVersion = async (userId, tokenVersion) => {
    const user = await require("../../users/user.model").findById(userId).select("+token_version");
    if (!user) {
        throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }
    if (user.token_version !== tokenVersion) {
        throw new AppError("Token version mismatch - session invalidated", 401, "TOKEN_VERSION_MISMATCH");
    }
    return true;
};

module.exports = {
    hashToken,
    createRefreshToken,
    findByJti,
    revokeByJti,
    revokeAllByUser,
    verifyTokenVersion,
};