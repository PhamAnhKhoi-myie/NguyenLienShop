const User = require('../../users/user.model');
const TokenService = require('../security/token.service');
const { generateAccessToken, generateRefreshToken } = require('../../../utils/sign.util');
const { verifyRefreshToken } = require('../../../utils/verify.util');
const TokenHash = require('../security/token.hash');
const AppError = require('../../../utils/appError.util');
const crypto = require('crypto');

class AuthSessionService {
    async refresh(refreshToken, userAgent = null, ipAddress = null) {
        let decoded;
        try {
            decoded = verifyRefreshToken(refreshToken);
        } catch (err) {
            throw new AppError("Invalid refresh token", 401, 'INVALID_REFRESH_TOKEN');
        }
        const userId = decoded.userId;

        const tokenRecord = await TokenService.findByJti(decoded.jti);

        if (!tokenRecord) {
            throw new AppError("Token does not exist", 401, 'TOKEN_NOT_FOUND');
        }

        if (tokenRecord.user_id.toString() !== userId) {
            throw new AppError("Token does not belong to user", 401, 'INVALID_TOKEN');
        }

        if (tokenRecord.replaced_by_jti) {
            console.warn('[SECURITY] Refresh token reuse detected', {
                userId
            });

            await TokenService.revokeAllByUser(userId, 'reuse_detected');

            throw new AppError('Token reuse detected', 403, 'TOKEN_REUSE_DETECTED');
        }

        if (tokenRecord.is_revoked) {
            throw new AppError("Token has been revoked", 401, 'TOKEN_REVOKED');
        }

        if (tokenRecord.expires_at < new Date()) {
            throw new AppError("Token has expired", 401, 'TOKEN_EXPIRED');
        }

        if (!TokenHash.verify(refreshToken, tokenRecord.token_hash)) {
            throw new AppError("Invalid token", 401, 'INVALID_TOKEN');
        }

        const user = await User.findById(userId).select('+token_version');

        if (!user) {
            throw new AppError("User not found", 404, 'USER_NOT_FOUND');
        }

        if (user.status !== 'ACTIVE') {
            throw new AppError("Inactive account", 403, 'ACCOUNT_INACTIVE');
        }

        if (decoded.tokenVersion !== user.token_version) {
            throw new AppError("Token version does not match", 401, 'TOKEN_VERSION_MISMATCH');
        }

        const newRefreshJti = crypto.randomUUID();

        const revoked = await TokenService.revokeByJti(
            decoded.jti,
            'rotated',
            newRefreshJti
        );

        if (!revoked) {
            throw new AppError("Token has been used", 401, 'TOKEN_ALREADY_USED');
        }

        const newRefreshToken = generateRefreshToken({
            userId,
            jti: newRefreshJti,
            tokenVersion: user.token_version
        });

        await TokenService.createRefreshToken({
            user_id: user._id,
            jti: newRefreshJti,
            token_hash: TokenHash.hash(newRefreshToken),
            user_agent: userAgent,
            ip_address: ipAddress,
            is_revoked: false,
        });

        const newAccessToken = generateAccessToken({
            userId,
            roles: user.roles,
            tokenVersion: user.token_version
        });

        return {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
        };
    }

    async logout(refreshToken) {
        let decoded;
        try {
            decoded = verifyRefreshToken(refreshToken);
        } catch (error) {
            return false;
        }

        const tokenRecord = await TokenService.findByJti(decoded.jti);

        if (!tokenRecord) {
            return false;
        }

        if (tokenRecord.user_id.toString() !== decoded.userId) {
            return false;
        }

        if (!TokenHash.verify(refreshToken, tokenRecord.token_hash)) {
            return false;
        }

        await TokenService.revokeByJti(decoded.jti, 'manual');
        return true;
    }

    async logoutAllDevices(userId) {
        const user = await User.findByIdAndUpdate(userId, { $inc: { token_version: 1 } }, { new: true });
        if (!user) {
            throw new AppError("User not found", 404, 'USER_NOT_FOUND');
        }
        await TokenService.revokeAllByUser(userId, 'logout_all_devices');
        return { message: "Signed out from all devices successfully" };
    }
}

module.exports = new AuthSessionService();
