const crypto = require('crypto');
const { maskPhoneNumber } = require('../../../utils/phone.util');

class MockSmsProvider {
    async sendOtp({ phoneNumber, otp, purpose }) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('Mock SMS provider is disabled in production');
        }

        console.log(`[MockSMS] ${purpose} ${maskPhoneNumber(phoneNumber)} OTP ${otp}`);

        return {
            provider: 'mock',
            messageId: crypto.randomUUID(),
            mockOtp: otp,
        };
    }
}

module.exports = MockSmsProvider;
