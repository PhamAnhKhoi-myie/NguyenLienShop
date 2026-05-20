const EmailAuditLog = require('./email_log.model');
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
                level: ACTION_LEVEL_MAP[data.action] || 'INFO',
            };

            if (options.session) {
                await EmailAuditLog.create([payload], { session: options.session });
                return;
            }

            await EmailAuditLog.create(payload);
        } catch (err) {
            console.error('[EmailAuditLog]', err);

            if (options.throwOnError) {
                throw err;
            }
        }
    }
}

module.exports = EmailAuditLogService;
