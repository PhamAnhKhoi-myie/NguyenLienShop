const OrderAuditLog = require('./order_log.model');
const { AUDIT_ACTIONS } = require('../../../constants/audit');

const ACTION_LEVEL_MAP = {
    [AUDIT_ACTIONS.CREATE_ORDER]: 'IMPORTANT',
    [AUDIT_ACTIONS.CANCEL_ORDER]: 'IMPORTANT',
    [AUDIT_ACTIONS.ADMIN_UPDATE_ORDER_STATUS]: 'SECURITY',
    [AUDIT_ACTIONS.ADMIN_UPDATE_ORDER]: 'SECURITY',
    [AUDIT_ACTIONS.FULFILL_ORDER_ITEMS]: 'IMPORTANT',
    [AUDIT_ACTIONS.RECORD_ORDER_SHIPMENT]: 'IMPORTANT',
    [AUDIT_ACTIONS.CONFIRM_ORDER_DELIVERY]: 'IMPORTANT',
};

class OrderAuditLogService {
    static async createLog(data) {
        try {
            const level = ACTION_LEVEL_MAP[data.action] || 'INFO';

            await OrderAuditLog.create({
                ...data,
                level,
            });
        } catch (err) {
            console.error('[OrderAuditLog]', err);
        }
    }
}

module.exports = OrderAuditLogService;
