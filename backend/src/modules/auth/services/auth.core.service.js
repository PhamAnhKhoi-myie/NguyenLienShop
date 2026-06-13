const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../../users/user.model');
const UserMapper = require('../../users/user.mapper');
const TokenService = require('../security/token.service');
const {
    generateAccessToken,
    generateRefreshToken,
} = require('../../../utils/sign.util');
const TokenHash = require('../security/token.hash');
const AppError = require('../../../utils/appError.util');
const AuthAuditLogService = require('../../audit_logs/auth_audit_log/auth_log.service');
const NotificationEventService = require('../../notifications/notification_event.service');
const PhoneOtpService = require('./phone-otp.service');
const { AUDIT_ACTIONS } = require('../../../constants/audit');
const {
    normalizePhoneNumber,
    maskPhoneNumber,
} = require('../../../utils/phone.util');

class AuthCoreService {
    async requestRegistrationOtp(phoneNumber) {
        const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);
        const existingUser = await User.findOne({
            'profile.phone_number': normalizedPhoneNumber,
        });

        if (existingUser) {
            throw new AppError(
                "Phone number is already registered",
                400,
                'PHONE_ALREADY_EXISTS'
            );
        }

        const delivery = await PhoneOtpService.requestOtp(
            normalizedPhoneNumber,
            'REGISTER'
        );

        return {
            phone_number: normalizedPhoneNumber,
            ...delivery,
        };
    }

    async register(
        phoneNumber,
        otp,
        password,
        fullName = null,
        email = null,
        metadata = {}
    ) {
        const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);
        const existingPhone = await User.findOne({
            'profile.phone_number': normalizedPhoneNumber,
        });

        if (existingPhone) {
            throw new AppError(
                "Phone number is already registered",
                400,
                'PHONE_ALREADY_EXISTS'
            );
        }

        if (email) {
            const existingEmail = await User.findOne({ email });

            if (existingEmail) {
                throw new AppError(
                    "Email already exists",
                    400,
                    'EMAIL_ALREADY_EXISTS'
                );
            }
        }

        const otpRecord = await PhoneOtpService.verifyOtp(
            normalizedPhoneNumber,
            'REGISTER',
            otp
        );
        await PhoneOtpService.consumeOtp(otpRecord._id);

        try {
            const hashedPassword = await bcrypt.hash(password, 12);
            const verifiedAt = new Date();
            const user = new User({
                email: email || null,
                password_hash: hashedPassword,
                profile: {
                    full_name: fullName,
                    phone_number: normalizedPhoneNumber,
                },
                status: 'ACTIVE',
                roles: ['CUSTOMER'],
                token_version: 0,
                is_phone_verified: true,
                phone_verified_at: verifiedAt,
            });

            await user.save();
            await AuthAuditLogService.createLog({
                actor_id: user._id,
                user_id: user._id,
                action: AUDIT_ACTIONS.AUTH_REGISTER,
                changes: {
                    user: {
                        from: null,
                        to: maskPhoneNumber(normalizedPhoneNumber),
                    },
                },
                ip_address: metadata.ip || null,
                user_agent: metadata.userAgent || null,
            });

            await NotificationEventService.accountCreated(user);

            return UserMapper.toResponseDTO(user);
        } catch (error) {
            if (error.code === 11000) {
                const duplicateField = Object.keys(error.keyPattern || {})[0];

                if (duplicateField === 'email') {
                    throw new AppError(
                        "Email already exists",
                        400,
                        'EMAIL_ALREADY_EXISTS'
                    );
                }

                throw new AppError(
                    "Phone number is already registered",
                    400,
                    'PHONE_ALREADY_EXISTS'
                );
            }

            if (error instanceof AppError) {
                throw error;
            }

            console.error(error);

            throw new AppError(
                "Unable to register account",
                500,
                'REGISTER_FAILED'
            );
        }
    }

    async login(phoneNumber, password, userAgent = null, ipAddress = null) {
        const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);
        const user = await User.findOne({
            'profile.phone_number': normalizedPhoneNumber,
        }).select('+password_hash +token_version');

        if (!user) {
            throw new AppError(
                "Incorrect phone number or password",
                401,
                'INVALID_CREDENTIALS'
            );
        }

        const isValid = await bcrypt.compare(password, user.password_hash);

        if (!isValid) {
            throw new AppError(
                "Incorrect phone number or password",
                401,
                'INVALID_CREDENTIALS'
            );
        }

        if (user.status !== 'ACTIVE') {
            const statusMap = {
                SUSPENDED: new AppError(
                    "Account locked",
                    403,
                    'ACCOUNT_SUSPENDED'
                ),
                INACTIVE: new AppError(
                    "Inactive account",
                    403,
                    'ACCOUNT_INACTIVE'
                ),
            };

            throw (
                statusMap[user.status] ||
                new AppError(
                    "Inactive account",
                    403,
                    'ACCOUNT_INACTIVE'
                )
            );
        }

        const userId = user._id.toString();
        const accessToken = generateAccessToken({
            userId,
            roles: user.roles,
            tokenVersion: user.token_version,
        });
        const refreshJti = crypto.randomUUID();
        const refreshToken = generateRefreshToken({
            userId,
            jti: refreshJti,
            tokenVersion: user.token_version,
        });

        await TokenService.createRefreshToken({
            user_id: user._id,
            jti: refreshJti,
            token_hash: TokenHash.hash(refreshToken),
            user_agent: userAgent,
            ip_address: ipAddress,
            is_revoked: false,
        });
        await User.findByIdAndUpdate(user._id, {
            last_login_at: new Date(),
        });

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

        return {
            user: UserMapper.toResponseDTO(user),
            tokens: {
                accessToken,
                refreshToken,
            },
        };
    }

    async changePassword(userId, currentPassword, newPassword, metadata = {}) {
        const user = await User.findById(userId).select('+password_hash');

        if (!user) {
            throw new AppError(
                "User not found",
                404,
                'USER_NOT_FOUND'
            );
        }

        const isValid = await bcrypt.compare(
            currentPassword,
            user.password_hash
        );

        if (!isValid) {
            throw new AppError(
                "Current password is incorrect",
                401,
                'INVALID_CREDENTIALS'
            );
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 12);
        await User.findByIdAndUpdate(userId, {
            password_hash: hashedNewPassword,
            $inc: { token_version: 1 },
        });

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
            ip_address: metadata.ip || null,
            user_agent: metadata.userAgent || null,
        });

        await TokenService.revokeAllByUser(userId, 'password_changed');
        await NotificationEventService.passwordChanged(user);

        return { message: "Password has been changed" };
    }

    async forgotPassword(phoneNumber, metadata = {}) {
        const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);
        const user = await User.findOne({
            'profile.phone_number': normalizedPhoneNumber,
        });
        const message =
            "If the phone number exists, a confirmation code has been sent";

        if (!user) {
            return {
                message,
                data: null,
            };
        }

        const delivery = await PhoneOtpService.requestOtp(
            normalizedPhoneNumber,
            'PASSWORD_RESET'
        );

        await AuthAuditLogService.createLog({
            actor_id: user._id,
            user_id: user._id,
            action: AUDIT_ACTIONS.AUTH_FORGOT_PASSWORD,
            changes: {
                forgot_password: {
                    from: null,
                    to: maskPhoneNumber(normalizedPhoneNumber),
                },
            },
            ip_address: metadata.ip || null,
            user_agent: metadata.userAgent || null,
        });

        return {
            message,
            data: {
                phone_number: normalizedPhoneNumber,
                ...delivery,
            },
        };
    }

    async resetPassword(
        phoneNumber,
        otp,
        newPassword,
        metadata = {}
    ) {
        const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);
        const otpRecord = await PhoneOtpService.verifyOtp(
            normalizedPhoneNumber,
            'PASSWORD_RESET',
            otp
        );
        const user = await User.findOne({
            'profile.phone_number': normalizedPhoneNumber,
        });

        if (!user) {
            throw new AppError(
                "User not found",
                404,
                'USER_NOT_FOUND'
            );
        }

        await PhoneOtpService.consumeOtp(otpRecord._id);
        const hashedNewPassword = await bcrypt.hash(newPassword, 12);
        await User.findByIdAndUpdate(user._id, {
            password_hash: hashedNewPassword,
            $inc: { token_version: 1 },
        });
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
            ip_address: metadata.ip || null,
            user_agent: metadata.userAgent || null,
        });

        await TokenService.revokeAllByUser(user._id, 'password_reset');
        await NotificationEventService.passwordChanged(user);

        return { message: "Password has been reset" };
    }
}

module.exports = new AuthCoreService();
