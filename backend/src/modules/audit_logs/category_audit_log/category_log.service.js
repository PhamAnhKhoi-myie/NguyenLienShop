const AuditLog = require('../audit_log.model');
const { AUDIT_ACTIONS } = require('../../../constants/audit');

const ACTION_LEVEL_MAP = {
    [AUDIT_ACTIONS.CREATE_CATEGORY]: 'INFO',
    [AUDIT_ACTIONS.UPDATE_CATEGORY]: 'IMPORTANT',
    [AUDIT_ACTIONS.DELETE_CATEGORY_SOFT]: 'IMPORTANT',
    [AUDIT_ACTIONS.DELETE_CATEGORY_HARD]: 'SECURITY',
    [AUDIT_ACTIONS.RESTORE_CATEGORY]: 'IMPORTANT',
};

class CategoryAuditLogService {
    static async createLog(data, options = {}) {
        try {
            const payload = {
                ...data,
                domain: 'CATEGORY',
                level: ACTION_LEVEL_MAP[data.action] || 'INFO',
                target_type: data.target_type || 'CATEGORY',
                target_id: data.target_id || data.category_id || null,
            };

            if (options.session) {
                await AuditLog.create([payload], { session: options.session });
                return;
            }

            await AuditLog.create(payload);
        } catch (err) {
            console.error('[CategoryAuditLog]', err);

            if (options.throwOnError) {
                throw err;
            }
        }
    }
}

module.exports = CategoryAuditLogService;
