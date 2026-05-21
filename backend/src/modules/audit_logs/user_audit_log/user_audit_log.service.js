const AuditLog = require('../audit_log.model');
const { AUDIT_ACTIONS } = require('../../../constants/audit');

const ACTION_LEVEL_MAP = {
    [AUDIT_ACTIONS.UPDATE_USER_PROFILE]: 'INFO',
    [AUDIT_ACTIONS.UPDATE_USER_STATUS]: 'IMPORTANT',
    [AUDIT_ACTIONS.UPDATE_USER_ROLES]: 'SECURITY',
    [AUDIT_ACTIONS.DELETE_USER_SOFT]: 'IMPORTANT',
};

class UserAuditLogService {
    static async createLog(data, options = {}) {
        try {
            const payload = {
                ...data,
                domain: 'USER',
                level: ACTION_LEVEL_MAP[data.action] || 'INFO',
                target_type: data.target_type || 'USER',
                target_id: data.target_id || data.user_id || null,
            };

            if (options.session) {
                await AuditLog.create([payload], { session: options.session });
                return;
            }

            await AuditLog.create(payload);
        } catch (err) {
            console.error('[UserAuditLog]', err);

            if (options.throwOnError) {
                throw err;
            }
        }
    }
}

module.exports = UserAuditLogService;
