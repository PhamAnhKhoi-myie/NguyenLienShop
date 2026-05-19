const ProductAuditLog = require('./product_log.model');
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
    static async createLog(data) {
        try {
            const level = ACTION_LEVEL_MAP[data.action] || 'INFO';

            await ProductAuditLog.create({
                ...data,
                level,
            });
        } catch (err) {
            console.error('[ProductAuditLog]', err);
        }
    }
}

module.exports = ProductAuditLogService;
