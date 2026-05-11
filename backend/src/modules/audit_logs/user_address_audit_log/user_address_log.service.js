const UserAddressAuditLog = require('./user_address_log.model');
const { AUDIT_ACTIONS } = require('../../../constants/audit');

const ACTION_LEVEL_MAP = {
    [AUDIT_ACTIONS.CREATE_USER_ADDRESS]: 'INFO',
    [AUDIT_ACTIONS.UPDATE_USER_ADDRESS]: 'INFO',
    [AUDIT_ACTIONS.SET_DEFAULT_USER_ADDRESS]: 'IMPORTANT',
    [AUDIT_ACTIONS.DELETE_USER_ADDRESS]: 'IMPORTANT',
};

class UserAddressAuditLogService {
    static async createLog(data) {
        try {
            const level = ACTION_LEVEL_MAP[data.action] || 'INFO';

            await UserAddressAuditLog.create({
                ...data,
                level,
            });
        } catch (err) {
            console.error('[AddressAuditLog]', err);
        }
    }
}

module.exports = UserAddressAuditLogService;