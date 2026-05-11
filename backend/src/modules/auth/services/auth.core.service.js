const User = require('../../users/user.model');
const UserMapper = require('../../users/user.mapper');
const TokenService = require('../security/token.service');
const { generateAccessToken, generateRefreshToken } = require('../../../utils/sign.util');
const TokenHash = require('../security/token.hash');
const AppError = require('../../../utils/appError.util');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const PasswordReset = require('../models/password-reset.model');
const EmailService = require('../../emails/email.service');
const AuthAuditLogService = require('../../audit_logs/auth_audit_log/auth_log.service');
const { AUDIT_ACTIONS } = require('../../../constants/audit');

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

            try {
                await AuthAuditLogService.createLog({
                    actor_id: user._id,
                    user_id: user._id,
                    action: AUDIT_ACTIONS.AUTH_REGISTER,
                    changes: {
                        user: {
                            from: null,
                            to: user.email,
                        },
                    },
                });
            } catch (err) {
                console.error('Audit log failed:', err);
            }

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
        const user = await User.findOne({ email }).select('+password_hash +token_version');

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

        try {
            await AuthAuditLogService.createLog({
                actor_id: user._id,
                user_id: user._id,
                action: AUDIT_ACTIONS.AUTH_LOGIN,
                changes: {
                    login: {
                        from: null,
                        to: 'SUCCESS',
                    },
                },
                ip_address: ipAddress,
                user_agent: userAgent,
            });
        } catch (err) {
            console.error('Audit log failed:', err);
        }

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

        try {
            await AuthAuditLogService.createLog({
                actor_id: userId,
                user_id: userId,
                action: AUDIT_ACTIONS.AUTH_CHANGE_PASSWORD,
                changes: {
                    password: {
                        from: 'OLD',
                        to: 'UPDATED',
                    },
                },
            });
        } catch (err) {
            console.error('Audit log failed:', err);
        }

        await TokenService.revokeAllByUser(userId, 'password_changed');
        return { message: 'Mật khẩu đã được thay đổi' };
    }

    async forgotPassword(email) {
        const user = await User.findOne({ email });

        // Không leak thông tin email tồn tại hay không
        if (!user) {
            return { message: 'Nếu email tồn tại, chúng tôi đã gửi mã xác nhận' };
        }

        const FIFTEEN_MIN = 15 * 60 * 1000;
        const ONE_MIN = 60 * 1000;

        // Rate limit 5 lần / 15 phút
        const count = await PasswordReset.countDocuments({
            email,
            createdAt: { $gte: new Date(Date.now() - FIFTEEN_MIN) }
        });

        if (count >= 5) {
            throw new AppError(
                'Bạn đã yêu cầu quá nhiều lần. Vui lòng thử lại sau',
                429,
                'TOO_MANY_REQUESTS'
            );
        }

        // Rate limit 1 lần / 60s
        const latest = await PasswordReset.findOne({ email }).sort({ createdAt: -1 });

        if (latest && Date.now() - latest.createdAt < ONE_MIN) {
            throw new AppError(
                'Vui lòng đợi trước khi yêu cầu mã mới',
                429,
                'OTP_RATE_LIMIT'
            );
        }

        // Tạo OTP
        const otp = crypto.randomInt(100000, 999999).toString();

        const otp_hash = crypto
            .createHash('sha256')
            .update(otp)
            .digest('hex');

        await PasswordReset.findOneAndUpdate(
            { email },
            {
                otp_hash,
                expires_at: new Date(Date.now() + 5 * 60 * 1000),
                attempt_count: 0
            },
            { upsert: true }
        );

        await EmailService.enqueueEmail({
            to: [email],
            template: 'FORGOT_PASSWORD_OTP',
            payload: {
                email,
                otp,
                expires_in: 5
            }
        });

        try {
            await AuthAuditLogService.createLog({
                actor_id: user?._id || null,
                user_id: user?._id || null,
                action: AUDIT_ACTIONS.AUTH_FORGOT_PASSWORD,
                changes: {
                    forgot_password: {
                        from: null,
                        to: email,
                    },
                },
            });
        } catch (err) {
            console.error('Audit log failed:', err);
        }

        return { message: 'Nếu email tồn tại, chúng tôi đã gửi mã xác nhận' };
    }

    async resetPassword(email, otp, newPassword) {
        const record = await PasswordReset.findOne({
            email,
            expires_at: { $gt: new Date() }
        }).sort({ createdAt: -1 });

        if (!record) {
            throw new AppError(
                'OTP không hợp lệ',
                400,
                'INVALID_OTP'
            );
        }

        if (record.expires_at < new Date()) {
            throw new AppError(
                'OTP đã hết hạn',
                400,
                'OTP_EXPIRED'
            );
        }

        const hashedOtp = crypto
            .createHash('sha256')
            .update(otp)
            .digest('hex');
        if (record.attempt_count >= 5) {
            throw new AppError(
                'Bạn đã nhập sai quá nhiều lần',
                429,
                'OTP_BLOCKED'
            );
        }

        if (hashedOtp !== record.otp_hash) {
            record.attempt_count += 1;

            if (record.attempt_count >= 5) {
                await PasswordReset.deleteOne({ _id: record._id });
            } else {
                await record.save();
            }

            throw new AppError(
                'OTP không đúng',
                400,
                'INVALID_OTP'
            );
        }

        const user = await User.findOne({ email });

        if (!user) {
            throw new AppError(
                'Không tìm thấy người dùng',
                404,
                'USER_NOT_FOUND'
            );
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 12);

        await User.findByIdAndUpdate(user._id, {
            password_hash: hashedNewPassword,
            $inc: { token_version: 1 }
        });

        try {
            await AuthAuditLogService.createLog({
                actor_id: user._id,
                user_id: user._id,
                action: AUDIT_ACTIONS.AUTH_RESET_PASSWORD,
                changes: {
                    password: {
                        from: 'RESET_REQUEST',
                        to: 'RESET_SUCCESS',
                    },
                },
            });
        } catch (err) {
            console.error('Audit log failed:', err);
        }

        await TokenService.revokeAllByUser(user._id, 'password_reset');

        // Xóa OTP sau khi dùng
        await PasswordReset.deleteOne({ _id: record._id });

        return { message: 'Mật khẩu đã được đặt lại' };
    }
}

module.exports = new AuthCoreService();