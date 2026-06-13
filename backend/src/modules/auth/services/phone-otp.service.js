const crypto = require('crypto');
const AppError = require('../../../utils/appError.util');
const SmsService = require('../../sms/sms.service');
const PhoneOtp = require('../models/phone-otp.model');

const getPositiveInteger = (name, fallback) => {
    const value = Number(process.env[name] || fallback);
    return Number.isInteger(value) && value > 0 ? value : fallback;
};

class PhoneOtpService {
    getConfig() {
        return {
            length: getPositiveInteger('SMS_OTP_LENGTH', 6),
            ttlSeconds: getPositiveInteger('SMS_OTP_TTL_SECONDS', 300),
            resendSeconds: getPositiveInteger('SMS_OTP_RESEND_SECONDS', 60),
            windowSeconds: getPositiveInteger('SMS_OTP_WINDOW_SECONDS', 900),
            maxRequests: getPositiveInteger('SMS_OTP_MAX_REQUESTS', 5),
            maxAttempts: getPositiveInteger('SMS_OTP_MAX_ATTEMPTS', 5),
        };
    }

    hashOtp(otp) {
        return crypto.createHash('sha256').update(String(otp)).digest('hex');
    }

    createOtp(length) {
        const minimum = 10 ** (length - 1);
        const maximum = 10 ** length;
        return crypto.randomInt(minimum, maximum).toString();
    }

    async requestOtp(phoneNumber, purpose) {
        const config = this.getConfig();
        const now = new Date();
        const existing = await PhoneOtp.findOne({
            phone_number: phoneNumber,
            purpose,
        });

        const windowCutoff = new Date(now.getTime() - config.windowSeconds * 1000);
        const resendCutoff = new Date(now.getTime() - config.resendSeconds * 1000);

        if (existing?.last_requested_at > resendCutoff) {
            throw new AppError(
                "Please wait before requesting a new OTP code",
                429,
                'OTP_RATE_LIMIT'
            );
        }

        const isCurrentWindow = existing?.window_started_at >= windowCutoff;

        if (isCurrentWindow && existing.request_count >= config.maxRequests) {
            throw new AppError(
                "You have requested too many OTP codes. Please try again later",
                429,
                'TOO_MANY_REQUESTS'
            );
        }

        const otp = this.createOtp(config.length);
        const windowStartedAt = isCurrentWindow
            ? existing.window_started_at
            : now;
        const requestCount = isCurrentWindow
            ? existing.request_count + 1
            : 1;

        const otpExpiresAt = new Date(
            now.getTime() + config.ttlSeconds * 1000
        );
        const windowExpiresAt = new Date(
            windowStartedAt.getTime() + config.windowSeconds * 1000
        );
        const recordExpiresAt = new Date(
            Math.max(otpExpiresAt.getTime(), windowExpiresAt.getTime())
        );
        let record;

        try {
            record = await PhoneOtp.findOneAndUpdate(
                {
                    phone_number: phoneNumber,
                    purpose,
                },
                {
                    $set: {
                        otp_hash: this.hashOtp(otp),
                        otp_expires_at: otpExpiresAt,
                        attempt_count: 0,
                        request_count: requestCount,
                        window_started_at: windowStartedAt,
                        last_requested_at: now,
                        expires_at: recordExpiresAt,
                    },
                },
                {
                    upsert: true,
                    new: true,
                    runValidators: true,
                    setDefaultsOnInsert: true,
                }
            );
        } catch (error) {
            if (error.code === 11000) {
                return this.requestOtp(phoneNumber, purpose);
            }
            throw error;
        }

        let delivery;

        try {
            delivery = await SmsService.sendOtp({
                phoneNumber,
                otp,
                purpose,
            });
        } catch (error) {
            await PhoneOtp.deleteOne({
                _id: record._id,
                last_requested_at: now,
            });
            throw error;
        }

        return {
            expiresIn: config.ttlSeconds,
            resendAfter: config.resendSeconds,
            provider: delivery.provider,
            mockOtp: delivery.mockOtp,
        };
    }

    async verifyOtp(phoneNumber, purpose, otp) {
        const config = this.getConfig();
        const record = await PhoneOtp.findOne({
            phone_number: phoneNumber,
            purpose,
        });

        if (!record || record.otp_expires_at <= new Date()) {
            throw new AppError(
                "OTP is invalid or expired",
                400,
                'INVALID_OTP'
            );
        }

        if (record.attempt_count >= config.maxAttempts) {
            await PhoneOtp.deleteOne({ _id: record._id });
            throw new AppError(
                "You have entered the wrong OTP too many times",
                429,
                'OTP_BLOCKED'
            );
        }

        const expectedHash = Buffer.from(record.otp_hash, 'hex');
        const actualHash = Buffer.from(this.hashOtp(otp), 'hex');
        const isValid =
            expectedHash.length === actualHash.length &&
            crypto.timingSafeEqual(expectedHash, actualHash);

        if (!isValid) {
            record.attempt_count += 1;

            if (record.attempt_count >= config.maxAttempts) {
                await PhoneOtp.deleteOne({ _id: record._id });
            } else {
                await record.save();
            }

            throw new AppError(
                "OTP is incorrect",
                400,
                'INVALID_OTP'
            );
        }

        return record;
    }

    async consumeOtp(recordId) {
        const result = await PhoneOtp.deleteOne({ _id: recordId });

        if (result.deletedCount !== 1) {
            throw new AppError(
                "OTP has already been used",
                400,
                'OTP_ALREADY_USED'
            );
        }
    }
}

module.exports = new PhoneOtpService();
