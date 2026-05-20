const CartAuditLog = require('./cart_log.model');
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
                level,
            };

            if (options.session) {
                await CartAuditLog.create([payload], { session: options.session });
                return;
            }

            await CartAuditLog.create(payload);
        } catch (err) {
            console.error('[CartAuditLog]', err);

            if (options.throwOnError) {
                throw err;
            }
        }
    }
}

module.exports = CartAuditLogService;
