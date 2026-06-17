const AuditLog = require('../audit_log.model');
const { AUDIT_ACTIONS } = require('../../../constants/audit');

const ACTION_LEVEL_MAP = {
    [AUDIT_ACTIONS.CREATE_ORDER]: 'IMPORTANT',
    [AUDIT_ACTIONS.CANCEL_ORDER]: 'IMPORTANT',
    [AUDIT_ACTIONS.ADMIN_UPDATE_ORDER_STATUS]: 'SECURITY',
    [AUDIT_ACTIONS.ADMIN_UPDATE_ORDER]: 'SECURITY',
    [AUDIT_ACTIONS.ADMIN_COMPLETE_ORDER_REFUND]: 'SECURITY',
    [AUDIT_ACTIONS.FULFILL_ORDER_ITEMS]: 'IMPORTANT',
    [AUDIT_ACTIONS.RECORD_ORDER_SHIPMENT]: 'IMPORTANT',
    [AUDIT_ACTIONS.CONFIRM_ORDER_DELIVERY]: 'IMPORTANT',
};

class OrderAuditLogService {
    static async createLog(data, options = {}) {
        try {
            const payload = {
                ...data,
                domain: 'ORDER',
                level: ACTION_LEVEL_MAP[data.action] || 'INFO',
                target_type: data.target_type || 'ORDER',
                target_id: data.target_id || data.order_id || null,
            };

            if (options.session) {
                await AuditLog.create([payload], { session: options.session });
                return;
            }

            await AuditLog.create(payload);
        } catch (err) {
            console.error('[OrderAuditLog]', err);

            if (options.throwOnError) {
                throw err;
            }
        }
    }
}

module.exports = OrderAuditLogService;
