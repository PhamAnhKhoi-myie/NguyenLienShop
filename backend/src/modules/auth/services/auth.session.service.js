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
            throw new AppError('Refresh token không hợp lệ', 401, 'INVALID_REFRESH_TOKEN');
        }
        const userId = decoded.userId;

        console.log('[auth.session.refresh] Decoded token:', {
            userId,
            jti: decoded.jti,
            tokenVersion: decoded.tokenVersion,
        });

        const tokenRecord = await TokenService.findByJti(decoded.jti);

        if (!tokenRecord) {
            throw new AppError('Token không tồn tại', 401, 'TOKEN_NOT_FOUND');
        }

        if (tokenRecord.user_id.toString() !== userId) {
            throw new AppError('Token không thuộc về user', 401, 'INVALID_TOKEN');
        }

        if (tokenRecord.replaced_by_jti) {
            console.warn('[SECURITY] Refresh token reuse detected', {
                userId,
                jti: decoded.jti,
                ipAddress,
                userAgent
            });

            await TokenService.revokeAllByUser(userId, 'reuse_detected');

            throw new AppError('Token reuse detected', 403, 'TOKEN_REUSE_DETECTED');
        }

        if (tokenRecord.is_revoked) {
            throw new AppError('Token đã bị revoke', 401, 'TOKEN_REVOKED');
        }

        if (tokenRecord.expires_at < new Date()) {
            throw new AppError('Token đã hết hạn', 401, 'TOKEN_EXPIRED');
        }

        if (!TokenHash.verify(refreshToken, tokenRecord.token_hash)) {
            throw new AppError('Token không hợp lệ', 401, 'INVALID_TOKEN');
        }

        const user = await User.findById(userId).select('+token_version');

        if (!user) {
            throw new AppError('Không tìm thấy người dùng', 404, 'USER_NOT_FOUND');
        }

        if (user.status !== 'ACTIVE') {
            throw new AppError('Tài khoản không hoạt động', 403, 'ACCOUNT_INACTIVE');
        }

        if (decoded.tokenVersion !== user.token_version) {
            throw new AppError('Token version không khớp', 401, 'TOKEN_VERSION_MISMATCH');
        }

        console.log('[auth.session.refresh] User validated:', {
            userId: user._id,
            tokenVersion: user.token_version
        });

        const newRefreshJti = crypto.randomUUID();

        const revoked = await TokenService.revokeByJti(
            decoded.jti,
            'rotated',
            newRefreshJti
        );

        if (!revoked) {
            throw new AppError('Token đã được sử dụng', 401, 'TOKEN_ALREADY_USED');
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
        const decoded = verifyRefreshToken(refreshToken);

        const tokenRecord = await TokenService.findByJti(decoded.jti);

        if (!tokenRecord) {
            return;
        }

        if (tokenRecord.user_id.toString() !== decoded.userId) {
            return;
        }

        if (!TokenHash.verify(refreshToken, tokenRecord.token_hash)) {
            return;
        }

        await TokenService.revokeByJti(decoded.jti, 'manual');
    }

    async logoutAllDevices(userId) {
        const user = await User.findByIdAndUpdate(userId, { $inc: { token_version: 1 } }, { new: true });
        if (!user) {
            throw new AppError('Không tìm thấy người dùng', 404, 'USER_NOT_FOUND');
        }
        await TokenService.revokeAllByUser(userId, 'logout_all_devices');
        return { message: 'Đăng xuất từ tất cả thiết bị thành công' };
    }
}

module.exports = new AuthSessionService();