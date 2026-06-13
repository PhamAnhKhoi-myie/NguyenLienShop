const coreService = require('./services/auth.core.service');
const sessionService = require('./services/auth.session.service');
const { verifyAccessToken } = require('../../utils/verify.util');
const AppError = require('../../utils/appError.util');

class AuthService {
    async requestRegistrationOtp(...args) {
        return coreService.requestRegistrationOtp(...args);
    }

    async register(...args) { return coreService.register(...args); }

    async login(...args) { return coreService.login(...args); }

    async refresh(refreshToken, userAgent = null, ipAddress = null) {
        return sessionService.refresh(refreshToken, userAgent, ipAddress);
    }
    async logout(...args) { return sessionService.logout(...args); }

    async logoutAllDevices(...args) { return sessionService.logoutAllDevices(...args); }

    async verifyAccessToken(accessToken) {
        if (!accessToken) {
            throw new AppError(
                'Access token required',
                401,
                'MISSING_TOKEN'
            );
        }
        return verifyAccessToken(accessToken);
    }

    async changePassword(...args) { return coreService.changePassword(...args); }

    async forgotPassword(...args) {
        return coreService.forgotPassword(...args);
    }

    async resetPassword(...args) {
        return coreService.resetPassword(...args);
    }
}

module.exports = new AuthService();
