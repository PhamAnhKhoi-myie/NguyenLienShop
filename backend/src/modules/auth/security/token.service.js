const crypto = require("crypto");
const RefreshToken = require("./token.model");
const AppError = require("../../../utils/appError.util");

const hashToken = (rawToken) =>
    crypto.createHash("sha256").update(rawToken).digest("hex");

/**
 * Create refresh token record
 * @param {Object} data - { user_id, jti, token_hash, user_agent, ip_address, is_revoked }
 */
const createRefreshToken = async (data) => {
    // ✅ FIX #1: Accept flexible input (auth.service passes token_hash already)
    const tokenData = {
        user_id: data.user_id,
        jti: data.jti,
        token_hash: data.token_hash || (data.token ? hashToken(data.token) : null),
        user_agent: data.user_agent || "",
        ip_address: data.ip_address || "",
        is_revoked: data.is_revoked ?? false,
        expires_at: data.expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    };

    try {
        return await RefreshToken.create(tokenData);
    } catch (error) {
        console.error("[token.service.createRefreshToken]", error);
        throw error;
    }
};

/**
 * Find token by JTI
 * @param {String} jti
 * @returns {Object} Token document (with user_id for ownership check)
 */
const findByJti = async (jti) => {
    if (!jti) {
        throw new AppError("JTI required", 400, "VALIDATION_ERROR");
    }

    return RefreshToken.findOne({ jti });
};

/**
 * Revoke token by JTI
 * @param {String} jti
 * @param {String} reason - 'manual' | 'rotated' | 'reuse_detected' | 'logout_all_devices' | 'password_changed'
 * @param {String} replacedByJti - (optional) JTI of replacement token
 */
const revokeByJti = async (jti, reason = "manual", replacedByJti = null) => {
    if (!jti) {
        throw new AppError("JTI required", 400, "VALIDATION_ERROR");
    }

    // ✅ FIX #2: Use findOneAndUpdate to return updated doc
    const updated = await RefreshToken.findOneAndUpdate(
        { jti, is_revoked: false }, // Only revoke if not already revoked
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

    // ✅ FIX #3: Log if token not found or already revoked
    if (!updated) {
        console.warn("[token.service.revokeByJti] Token already revoked or not found", {
            jti,
            reason,
        });
    }

    return updated;
};

/**
 * Revoke all tokens for a user
 * @param {String} userId
 * @param {String} reason - 'logout_all_devices' | 'password_changed' | 'reuse_detected' | 'security'
 */
const revokeAllByUser = async (userId, reason = "security") => {
    if (!userId) {
        throw new AppError("User ID required", 400, "VALIDATION_ERROR");
    }

    // ✅ FIX #4: Return update result (count of revoked tokens)
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

/**
 * ✅ NEW: Verify token version match (security check)
 * @param {String} userId
 * @param {Number} tokenVersion - from JWT payload
 * @returns {Boolean}
 */
const verifyTokenVersion = async (userId, tokenVersion) => {
    const user = await require("../../users/user.model").findById(userId).select("+token_version");

    if (!user) {
        throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    if (user.token_version !== tokenVersion) {
        throw new AppError(
            "Token version mismatch - session invalidated",
            401,
            "TOKEN_REVOKED"
        );
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