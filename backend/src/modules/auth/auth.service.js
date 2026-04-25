// filepath: e:\MyEffort\NguyenLien\backend\src\modules\auth\auth.service.js
const coreService = require('./services/auth.core.service');
const sessionService = require('./services/auth.session.service');
const { verifyAccessToken } = require('../../utils/verify.util');

class AuthService {
    async register(...args) { return coreService.register(...args); }
    async login(...args) { return coreService.login(...args); }
    async refresh(...args) { return sessionService.refresh(...args); }
    async logout(...args) { return sessionService.logout(...args); }
    async logoutAllDevices(...args) { return sessionService.logoutAllDevices(...args); }
    async verifyAccessToken(accessToken) {
        if (!accessToken) {
            throw new Error('Access token required');
        }
        return verifyAccessToken(accessToken);
    }
    async changePassword(...args) { return coreService.changePassword(...args); }
}

module.exports = new AuthService();