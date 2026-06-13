const AppError = require('../../utils/appError.util');
const MockSmsProvider = require('./providers/mock-sms.provider');

class SmsService {
    constructor() {
        this.providers = {
            mock: new MockSmsProvider(),
        };
    }

    async sendOtp(payload) {
        const providerName = String(process.env.SMS_PROVIDER || 'mock').toLowerCase();
        const provider = this.providers[providerName];

        if (!provider) {
            throw new AppError(
                `SMS provider ${providerName} is not configured`,
                500,
                'SMS_PROVIDER_UNSUPPORTED'
            );
        }

        try {
            return await provider.sendOtp(payload);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }

            throw new AppError(
                "Unable to send OTP code",
                503,
                'SMS_SEND_FAILED'
            );
        }
    }
}

module.exports = new SmsService();
