// filepath: e:\MyEffort\NguyenLien\backend\src\modules\auth\services\auth.session.service.js
const User = require('../../users/user.model');
const TokenService = require('../security/token.service');
const { generateAccessToken, generateRefreshToken } = require('../../../utils/sign.util');
const { verifyRefreshToken } = require('../../../utils/verify.util');
const TokenSecurity = require('../security/token.security');
const TokenHash = require('../security/token.hash');
const AppError = require('../../../utils/appError.util');
const crypto = require('crypto');

class AuthSessionService {
    async refresh(userId, refreshToken, userAgent = null, ipAddress = null) {
        const decoded = verifyRefreshToken(refreshToken);
        if (decoded.userId !== userId) {
            throw new AppError('INVALID_TOKEN', 'User ID không khớp');
        }
        const user = await User.findById(userId).select('+token_version');
        if (!user || user.status !== 'ACTIVE') {
            throw new AppError('USER_NOT_FOUND', 'Người dùng không tồn tại hoặc không hoạt động');
        }
        await TokenSecurity.checkVersion(decoded.tokenVersion, user.token_version);
        await TokenSecurity.checkReuse(decoded.jti);
        const tokenRecord = await TokenSecurity.verifyOwnership(decoded.jti, userId);
        if (tokenRecord.is_revoked) {
            throw new AppError('TOKEN_REVOKED', 'Token đã bị thu hồi');
        }
        TokenSecurity.validateAndHashToken(refreshToken, decoded.jti, userId);
        // Rotate tokens
        const newAccessToken = generateAccessToken({ userId, roles: user.roles, tokenVersion: user.token_version });
        const newRefreshJti = crypto.randomUUID();
        const newRefreshToken = generateRefreshToken({ userId, jti: newRefreshJti, tokenVersion: user.token_version });
        const newTokenHash = TokenHash.hash(newRefreshToken);
        await TokenService.createRefreshToken({
            user_id: user._id,
            jti: newRefreshJti,
            token_hash: newTokenHash,
            user_agent: userAgent,
            ip_address: ipAddress,
            is_revoked: false,
        });
        await TokenService.revokeByJti(decoded.jti, 'rotated');
        return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    }

    async logout(userId, jti) {
        await TokenSecurity.verifyOwnership(jti, userId);
        await TokenService.revokeByJti(jti, 'manual');
        return { message: 'Đăng xuất thành công' };
    }

    async logoutAllDevices(userId) {
        const user = await User.findByIdAndUpdate(userId, { $inc: { token_version: 1 } }, { new: true });
        if (!user) {
            throw new AppError('USER_NOT_FOUND', 'Không tìm thấy người dùng');
        }
        await TokenService.revokeAllByUser(userId, 'logout_all_devices');
        return { message: 'Đăng xuất từ tất cả thiết bị thành công' };
    }
}

module.exports = new AuthSessionService();