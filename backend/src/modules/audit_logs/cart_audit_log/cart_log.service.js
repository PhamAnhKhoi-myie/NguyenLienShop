const AuditLog = require('../audit_log.model');
const { AUDIT_ACTIONS } = require('../../../constants/audit');

const ACTION_LEVEL_MAP = {
    [AUDIT_ACTIONS.ADD_CART_ITEM]: 'INFO',
    [AUDIT_ACTIONS.UPDATE_CART_ITEM_QUANTITY]: 'INFO',
    [AUDIT_ACTIONS.REMOVE_CART_ITEM]: 'INFO',
    [AUDIT_ACTIONS.APPLY_CART_DISCOUNT]: 'IMPORTANT',
    [AUDIT_ACTIONS.REMOVE_CART_DISCOUNT]: 'IMPORTANT',
    [AUDIT_ACTIONS.MERGE_CART]: 'IMPORTANT',
    [AUDIT_ACTIONS.CHECKOUT_CART]: 'IMPORTANT',
    [AUDIT_ACTIONS.CLEAR_CART]: 'IMPORTANT',
};

class CartAuditLogService {
    static async createLog(data, options = {}) {
        try {
            const level = ACTION_LEVEL_MAP[data.action] || 'INFO';
            const payload = {
                ...data,
                domain: 'CART',
                level,
                target_type: data.target_type || 'CART',
                target_id: data.target_id || data.cart_id || null,
            };

            if (options.session) {
                await AuditLog.create([payload], { session: options.session });
                return;
            }

            await AuditLog.create(payload);
        } catch (err) {
            console.error('[CartAuditLog]', err);

            if (options.throwOnError) {
                throw err;
            }
        }
    }
}

module.exports = CartAuditLogService;
