const AuditLog = require('../audit_log.model');
const { AUDIT_ACTIONS } = require('../../../constants/audit');

const ACTION_LEVEL_MAP = {
    [AUDIT_ACTIONS.CREATE_PRODUCT]: 'IMPORTANT',
    [AUDIT_ACTIONS.UPDATE_PRODUCT]: 'IMPORTANT',
    [AUDIT_ACTIONS.DELETE_PRODUCT_SOFT]: 'SECURITY',
    [AUDIT_ACTIONS.CREATE_VARIANT]: 'IMPORTANT',
    [AUDIT_ACTIONS.UPDATE_VARIANT]: 'IMPORTANT',
    [AUDIT_ACTIONS.DELETE_VARIANT_SOFT]: 'SECURITY',
    [AUDIT_ACTIONS.CREATE_VARIANT_UNIT]: 'IMPORTANT',
    [AUDIT_ACTIONS.UPDATE_VARIANT_UNIT]: 'IMPORTANT',
    [AUDIT_ACTIONS.DELETE_VARIANT_UNIT]: 'SECURITY',
    [AUDIT_ACTIONS.RESERVE_VARIANT_STOCK]: 'IMPORTANT',
    [AUDIT_ACTIONS.COMPLETE_VARIANT_SALE]: 'IMPORTANT',
    [AUDIT_ACTIONS.RELEASE_VARIANT_STOCK]: 'IMPORTANT',
};

class ProductAuditLogService {
    static async createLog(data, options = {}) {
        try {
            const payload = {
                ...data,
                domain: 'PRODUCT',
                level: ACTION_LEVEL_MAP[data.action] || 'INFO',
                target_type: data.target_type || 'PRODUCT',
                target_id: data.target_id || data.product_id || data.variant_id || data.unit_id || null,
            };

            if (options.session) {
                await AuditLog.create([payload], { session: options.session });
                return;
            }

            await AuditLog.create(payload);
        } catch (err) {
            console.error('[ProductAuditLog]', err);

            if (options.throwOnError) {
                throw err;
            }
        }
    }
}

module.exports = ProductAuditLogService;
