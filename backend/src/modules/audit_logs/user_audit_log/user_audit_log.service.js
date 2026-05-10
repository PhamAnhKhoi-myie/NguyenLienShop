const UserAuditLog = require('./user_audit_log.model');
const { AUDIT_ACTIONS } = require('../../../constants/audit');

const ACTION_LEVEL_MAP = {
    [AUDIT_ACTIONS.UPDATE_USER_PROFILE]: 'INFO',
    [AUDIT_ACTIONS.UPDATE_USER_STATUS]: 'IMPORTANT',
    [AUDIT_ACTIONS.UPDATE_USER_ROLES]: 'SECURITY',
    [AUDIT_ACTIONS.DELETE_USER_SOFT]: 'IMPORTANT',
};

class UserAuditLogService {
    static async createLog(data) {
        try {
            const level = ACTION_LEVEL_MAP[data.action] || 'INFO';

            await UserAuditLog.create({
                ...data,
                level,
            });
        } catch (err) {
            console.error('[UserAuditLog]', err);
        }
    }
}

module.exports = UserAuditLogService;