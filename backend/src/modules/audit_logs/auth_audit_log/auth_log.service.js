const AuthAuditLog = require('./auth_log.model');
const { AUDIT_ACTIONS } = require('../../../constants/audit');

const ACTION_LEVEL_MAP = {
    [AUDIT_ACTIONS.AUTH_LOGIN]: 'INFO',
    [AUDIT_ACTIONS.AUTH_REGISTER]: 'INFO',

    [AUDIT_ACTIONS.AUTH_CHANGE_PASSWORD]: 'SECURITY',
    [AUDIT_ACTIONS.AUTH_RESET_PASSWORD]: 'SECURITY',

    [AUDIT_ACTIONS.AUTH_FORGOT_PASSWORD]: 'IMPORTANT',
};

class AuthAuditLogService {
    static async createLog(data) {
        try {
            const level = ACTION_LEVEL_MAP[data.action] || 'INFO';

            await AuthAuditLog.create({
                ...data,
                level,
            });
        } catch (err) {
            console.error('[AuthAuditLog]', err);
        }
    }
}

module.exports = AuthAuditLogService;