// filepath: e:\MyEffort\NguyenLien\backend\src\modules\auth\services\auth.core.service.js
const User = require('../../users/user.model');
const UserMapper = require('../../users/user.mapper');
const TokenService = require('../security/token.service');
const { generateAccessToken, generateRefreshToken } = require('../../../utils/sign.util');
const TokenHash = require('../security/token.hash');
const AppError = require('../../../utils/appError.util');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

class AuthCoreService {
    async register(email, password, fullName = null) {
        // Validation now handled by schema in middleware
        try {
            const hashedPassword = await bcrypt.hash(password, 12);
            const user = new User({
                email,
                password_hash: hashedPassword,
                profile: { full_name: fullName },  // Đặt trong profile
                status: 'ACTIVE',
                roles: ['CUSTOMER'],  // Sử dụng enum hợp lệ
                token_version: 0,
            });
            await user.save();
            return UserMapper.toResponseDTO(user);
        } catch (error) {
            if (error.code === 11000) {
                throw new AppError('EMAIL_ALREADY_EXISTS', 'Email đã tồn tại');
            }
            throw error;
        }
    }

    async login(email, password, userAgent = null, ipAddress = null) {
        const user = await User.findOne({ email }).select('+password_hash');
        if (!user) {
            throw new AppError('INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng');
        }
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            throw new AppError('INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng');
        }
        if (user.status !== 'ACTIVE') {
            throw new AppError('ACCOUNT_INACTIVE', 'Tài khoản không hoạt động');
        }
        const userId = user._id.toString();
        const accessToken = generateAccessToken({ userId, roles: user.roles, tokenVersion: user.token_version });
        const refreshJti = crypto.randomUUID();
        const refreshToken = generateRefreshToken({ userId, jti: refreshJti, tokenVersion: user.token_version });
        const tokenHash = TokenHash.hash(refreshToken);
        await TokenService.createRefreshToken({
            user_id: user._id,
            jti: refreshJti,
            token_hash: tokenHash,
            user_agent: userAgent,
            ip_address: ipAddress,
            is_revoked: false,
        });
        await User.findByIdAndUpdate(user._id, { last_login_at: new Date() });
        return { user: UserMapper.toResponseDTO(user), tokens: { accessToken, refreshToken } };
    }

    async changePassword(userId, currentPassword, newPassword) {
        const user = await User.findById(userId).select('+password_hash');
        if (!user) {
            throw new AppError('USER_NOT_FOUND', 'Không tìm thấy người dùng');
        }
        const isValid = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isValid) {
            throw new AppError('INVALID_CREDENTIALS', 'Mật khẩu hiện tại không đúng');
        }
        const hashedNewPassword = await bcrypt.hash(newPassword, 12);
        await User.findByIdAndUpdate(userId, { password_hash: hashedNewPassword, $inc: { token_version: 1 } });
        await TokenService.revokeAllByUser(userId, 'password_changed');
        return { message: 'Mật khẩu đã được thay đổi' };
    }
}

module.exports = new AuthCoreService();