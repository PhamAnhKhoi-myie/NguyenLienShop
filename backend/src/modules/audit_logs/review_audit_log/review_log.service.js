const AuditLog = require('../audit_log.model');
const { AUDIT_ACTIONS } = require('../../../constants/audit');

const ACTION_LEVEL_MAP = {
    [AUDIT_ACTIONS.CREATE_REVIEW]: 'IMPORTANT',
    [AUDIT_ACTIONS.UPDATE_REVIEW]: 'IMPORTANT',
    [AUDIT_ACTIONS.DELETE_REVIEW_SOFT]: 'IMPORTANT',
    [AUDIT_ACTIONS.FLAG_REVIEW]: 'SECURITY',
    [AUDIT_ACTIONS.APPROVE_REVIEW]: 'SECURITY',
    [AUDIT_ACTIONS.REJECT_REVIEW]: 'SECURITY',
};

class ReviewAuditLogService {
    static async createLog(data, options = {}) {
        try {
            const level = ACTION_LEVEL_MAP[data.action] || 'INFO';
            const payload = {
                ...data,
                domain: 'REVIEW',
                level,
                target_type: data.target_type || 'REVIEW',
                target_id: data.target_id || data.review_id || null,
            };

            if (options.session) {
                await AuditLog.create([payload], { session: options.session });
                return;
            }

            await AuditLog.create(payload);
        } catch (err) {
            console.error('[ReviewAuditLog]', err);

            if (options.throwOnError) {
                throw err;
            }
        }
    }
}

module.exports = ReviewAuditLogService;
