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
        try {
            const hashedPassword = await bcrypt.hash(password, 12);

            const user = new User({
                email,
                password_hash: hashedPassword,
                profile: { full_name: fullName },
                status: 'ACTIVE',
                roles: ['CUSTOMER'],
                token_version: 0,
            });

            await user.save();

            return UserMapper.toResponseDTO(user);

        } catch (error) {

            if (error.code === 11000) {
                throw new AppError(
                    'Email đã tồn tại',
                    400,
                    'EMAIL_ALREADY_EXISTS'
                );
            }

            console.error(error);

            throw new AppError(
                'Không thể đăng ký tài khoản',
                500,
                'REGISTER_FAILED'
            );
        }
    }

    async login(email, password, userAgent = null, ipAddress = null) {
        const user = await User.findOne({ email }).select('+password_hash');

        if (!user) {
            throw new AppError(
                'Email hoặc mật khẩu không đúng',
                401,
                'INVALID_CREDENTIALS'
            );
        }

        const isValid = await bcrypt.compare(password, user.password_hash);

        if (!isValid) {
            throw new AppError(
                'Email hoặc mật khẩu không đúng',
                401,
                'INVALID_CREDENTIALS'
            );
        }

        if (user.status !== 'ACTIVE') {
            const statusMap = {
                SUSPENDED: new AppError('Tài khoản bị khóa', 403, 'ACCOUNT_SUSPENDED'),
                INACTIVE: new AppError('Tài khoản không hoạt động', 403, 'ACCOUNT_INACTIVE'),
            };
            throw statusMap[user.status] || new AppError('Tài khoản không hoạt động', 403, 'ACCOUNT_INACTIVE');
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
            throw new AppError(
                'Không tìm thấy người dùng',
                404,
                'USER_NOT_FOUND'
            );
        }

        const isValid = await bcrypt.compare(currentPassword, user.password_hash);

        if (!isValid) {
            throw new AppError(
                'Mật khẩu hiện tại không đúng',
                401,
                'INVALID_CREDENTIALS'
            );
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 12);
        await User.findByIdAndUpdate(userId, { password_hash: hashedNewPassword, $inc: { token_version: 1 } });
        await TokenService.revokeAllByUser(userId, 'password_changed');
        return { message: 'Mật khẩu đã được thay đổi' };
    }
}

module.exports = new AuthCoreService();