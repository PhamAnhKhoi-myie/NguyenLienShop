const AuditLog = require('../audit_log.model');
const { AUDIT_ACTIONS } = require('../../../constants/audit');

const ACTION_LEVEL_MAP = {
    [AUDIT_ACTIONS.CREATE_USER_ADDRESS]: 'INFO',
    [AUDIT_ACTIONS.UPDATE_USER_ADDRESS]: 'INFO',
    [AUDIT_ACTIONS.SET_DEFAULT_USER_ADDRESS]: 'IMPORTANT',
    [AUDIT_ACTIONS.DELETE_USER_ADDRESS]: 'IMPORTANT',
};

class UserAddressAuditLogService {
    static async createLog(data, options = {}) {
        try {
            const payload = {
                ...data,
                domain: 'USER_ADDRESS',
                level: ACTION_LEVEL_MAP[data.action] || 'INFO',
                target_type: data.target_type || 'USER_ADDRESS',
                target_id: data.target_id || data.address_id || null,
            };

            if (options.session) {
                await AuditLog.create([payload], { session: options.session });
                return;
            }

            await AuditLog.create(payload);
        } catch (err) {
            console.error('[AddressAuditLog]', err);

            if (options.throwOnError) {
                throw err;
            }
        }
    }
}

module.exports = UserAddressAuditLogService;
