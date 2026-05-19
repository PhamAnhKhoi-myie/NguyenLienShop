const ShipmentAuditLog = require('./shipment_log.model');
const { AUDIT_ACTIONS } = require('../../../constants/audit');

const ACTION_LEVEL_MAP = {
    [AUDIT_ACTIONS.CREATE_SHIPMENT]: 'IMPORTANT',
    [AUDIT_ACTIONS.SHIPMENT_WEBHOOK_STATUS]: 'IMPORTANT',
    [AUDIT_ACTIONS.SHIPMENT_WEBHOOK_REJECTED]: 'SECURITY',
    [AUDIT_ACTIONS.UPDATE_SHIPMENT_STATUS]: 'IMPORTANT',
    [AUDIT_ACTIONS.RECORD_SHIPMENT_FAILURE]: 'IMPORTANT',
    [AUDIT_ACTIONS.CANCEL_SHIPMENT]: 'IMPORTANT',
    [AUDIT_ACTIONS.RETRY_SHIPMENT]: 'IMPORTANT',
    [AUDIT_ACTIONS.CONFIRM_SHIPMENT_DELIVERY]: 'IMPORTANT',
    [AUDIT_ACTIONS.ADMIN_UPDATE_SHIPMENT]: 'SECURITY',
    [AUDIT_ACTIONS.DELETE_SHIPMENT_SOFT]: 'SECURITY',
};

class ShipmentAuditLogService {
    static async createLog(data) {
        try {
            const level = ACTION_LEVEL_MAP[data.action] || 'INFO';

            await ShipmentAuditLog.create({
                ...data,
                level,
            });
        } catch (err) {
            console.error('[ShipmentAuditLog]', err);
        }
    }
}

module.exports = ShipmentAuditLogService;
