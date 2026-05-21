const AuditLog = require('../audit_log.model');
const { AUDIT_ACTIONS } = require('../../../constants/audit');

const ACTION_LEVEL_MAP = {
    [AUDIT_ACTIONS.ENQUEUE_EMAIL]: 'INFO',
    [AUDIT_ACTIONS.EMAIL_SEND_SUCCESS]: 'INFO',
    [AUDIT_ACTIONS.EMAIL_SEND_FAILED]: 'IMPORTANT',
};

class EmailAuditLogService {
    static async createLog(data, options = {}) {
        try {
            const payload = {
                ...data,
                domain: 'EMAIL',
                level: ACTION_LEVEL_MAP[data.action] || 'INFO',
                target_type: data.target_type || 'EMAIL',
                target_id: data.target_id || data.email_job_id || null,
            };

            if (options.session) {
                await AuditLog.create([payload], { session: options.session });
                return;
            }

            await AuditLog.create(payload);
        } catch (err) {
            console.error('[EmailAuditLog]', err);

            if (options.throwOnError) {
                throw err;
            }
        }
    }
}

module.exports = EmailAuditLogService;
