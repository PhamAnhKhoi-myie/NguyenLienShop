const CategoryAuditLog = require('./category_log.model');
const { AUDIT_ACTIONS } = require('../../../constants/audit');

const ACTION_LEVEL_MAP = {
    [AUDIT_ACTIONS.CREATE_CATEGORY]: 'INFO',
    [AUDIT_ACTIONS.UPDATE_CATEGORY]: 'IMPORTANT',
    [AUDIT_ACTIONS.DELETE_CATEGORY_SOFT]: 'IMPORTANT',
    [AUDIT_ACTIONS.DELETE_CATEGORY_HARD]: 'SECURITY',
    [AUDIT_ACTIONS.RESTORE_CATEGORY]: 'IMPORTANT',
};

class CategoryAuditLogService {
    static async createLog(data) {
        try {
            const level = ACTION_LEVEL_MAP[data.action] || 'INFO';

            await CategoryAuditLog.create({
                ...data,
                level,
            });
        } catch (err) {
            console.error('[CategoryAuditLog]', err);
        }
    }
}

module.exports = CategoryAuditLogService;