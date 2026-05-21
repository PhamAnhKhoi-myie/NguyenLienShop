const AuditLog = require('../audit_log.model');
const { AUDIT_ACTIONS } = require('../../../constants/audit');

const ACTION_LEVEL_MAP = {
    [AUDIT_ACTIONS.AUTH_LOGIN]: 'INFO',
    [AUDIT_ACTIONS.AUTH_REGISTER]: 'INFO',

    [AUDIT_ACTIONS.AUTH_CHANGE_PASSWORD]: 'SECURITY',
    [AUDIT_ACTIONS.AUTH_RESET_PASSWORD]: 'SECURITY',

    [AUDIT_ACTIONS.AUTH_FORGOT_PASSWORD]: 'IMPORTANT',
};

class AuthAuditLogService {
    static async createLog(data, options = {}) {
        try {
            const payload = {
                ...data,
                domain: 'AUTH',
                level: ACTION_LEVEL_MAP[data.action] || 'INFO',
                target_type: data.target_type || 'AUTH',
                target_id: data.target_id || data.user_id || null,
            };

            if (options.session) {
                await AuditLog.create([payload], { session: options.session });
                return;
            }

            await AuditLog.create(payload);
        } catch (err) {
            console.error('[AuthAuditLog]', err);

            if (options.throwOnError) {
                throw err;
            }
        }
    }
}

module.exports = AuthAuditLogService;
