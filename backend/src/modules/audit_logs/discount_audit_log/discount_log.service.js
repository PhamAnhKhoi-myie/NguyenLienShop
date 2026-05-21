const AuditLog = require('../audit_log.model');
const { AUDIT_ACTIONS } = require('../../../constants/audit');

const ACTION_LEVEL_MAP = {
    [AUDIT_ACTIONS.CREATE_DISCOUNT]: 'IMPORTANT',
    [AUDIT_ACTIONS.BULK_IMPORT_DISCOUNTS]: 'IMPORTANT',
    [AUDIT_ACTIONS.UPDATE_DISCOUNT]: 'IMPORTANT',
    [AUDIT_ACTIONS.DELETE_DISCOUNT_SOFT]: 'SECURITY',
    [AUDIT_ACTIONS.REVOKE_DISCOUNT]: 'SECURITY',
    [AUDIT_ACTIONS.DUPLICATE_DISCOUNT]: 'IMPORTANT',
    [AUDIT_ACTIONS.REDEEM_DISCOUNT]: 'IMPORTANT',
};

class DiscountAuditLogService {
    static async createLog(data, options = {}) {
        try {
            const level = ACTION_LEVEL_MAP[data.action] || 'INFO';
            const payload = {
                ...data,
                domain: 'DISCOUNT',
                level,
                target_type: data.target_type || 'DISCOUNT',
                target_id: data.target_id || data.discount_id || null,
            };

            if (options.session) {
                await AuditLog.create([payload], { session: options.session });
                return;
            }

            await AuditLog.create(payload);
        } catch (err) {
            console.error('[DiscountAuditLog]', err);

            if (options.throwOnError) {
                throw err;
            }
        }
    }
}

module.exports = DiscountAuditLogService;
