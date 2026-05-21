const AuditLog = require('../audit_log.model');
const { AUDIT_ACTIONS } = require('../../../constants/audit');

const ACTION_LEVEL_MAP = {
    [AUDIT_ACTIONS.MARK_NOTIFICATION_READ]: 'INFO',
    [AUDIT_ACTIONS.MARK_BULK_NOTIFICATIONS_READ]: 'IMPORTANT',
    [AUDIT_ACTIONS.MARK_ALL_NOTIFICATIONS_READ]: 'IMPORTANT',
    [AUDIT_ACTIONS.DELETE_NOTIFICATION_SOFT]: 'IMPORTANT',
    [AUDIT_ACTIONS.DELETE_ALL_NOTIFICATIONS_SOFT]: 'IMPORTANT',
};

class NotificationAuditLogService {
    static async createLog(data, options = {}) {
        try {
            const level = ACTION_LEVEL_MAP[data.action] || 'INFO';

            const payload = {
                ...data,
                domain: 'NOTIFICATION',
                level,
                target_type: data.target_type || 'NOTIFICATION',
                target_id: data.target_id || data.notification_id || null,
            };

            if (options.session) {
                await AuditLog.create([payload], {
                    session: options.session,
                });
                return;
            }

            await AuditLog.create(payload);
        } catch (err) {
            console.error('[NotificationAuditLog]', err);

            if (options.throwOnError) {
                throw err;
            }
        }
    }
}

module.exports = NotificationAuditLogService;
