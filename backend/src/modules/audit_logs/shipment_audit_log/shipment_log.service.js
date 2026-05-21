const AuditLog = require('../audit_log.model');
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
    static async createLog(data, options = {}) {
        try {
            const payload = {
                ...data,
                domain: 'SHIPMENT',
                level: ACTION_LEVEL_MAP[data.action] || 'INFO',
                target_type: data.target_type || 'SHIPMENT',
                target_id: data.target_id || data.shipment_id || null,
            };

            if (options.session) {
                await AuditLog.create([payload], { session: options.session });
                return;
            }

            await AuditLog.create(payload);
        } catch (err) {
            console.error('[ShipmentAuditLog]', err);

            if (options.throwOnError) {
                throw err;
            }
        }
    }
}

module.exports = ShipmentAuditLogService;
