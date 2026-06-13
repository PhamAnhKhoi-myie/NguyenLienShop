const AuditLog = require('../audit_log.model');
const { AUDIT_ACTIONS } = require('../../../constants/audit');

const ACTION_LEVEL_MAP = {
    [AUDIT_ACTIONS.CREATE_PAYMENT]: 'INFO',
    [AUDIT_ACTIONS.RETRY_PAYMENT]: 'IMPORTANT',
    [AUDIT_ACTIONS.CANCEL_PAYMENT]: 'IMPORTANT',
    [AUDIT_ACTIONS.ADMIN_VERIFY_PAYMENT]: 'IMPORTANT',
    [AUDIT_ACTIONS.DELETE_PAYMENT_SOFT]: 'SECURITY',
    [AUDIT_ACTIONS.VNPAY_WEBHOOK_PAYMENT]: 'IMPORTANT',
    [AUDIT_ACTIONS.STRIPE_WEBHOOK_PAYMENT]: 'IMPORTANT',
    [AUDIT_ACTIONS.PAYPAL_WEBHOOK_PAYMENT]: 'IMPORTANT',
    [AUDIT_ACTIONS.PAYOS_WEBHOOK_PAYMENT]: 'IMPORTANT',
    [AUDIT_ACTIONS.PAYMENT_WEBHOOK_AMOUNT_MISMATCH]: 'SECURITY',
    [AUDIT_ACTIONS.PAYMENT_WEBHOOK_REJECTED]: 'SECURITY',
};

class PaymentAuditLogService {
    static async createLog(data, options = {}) {
        try {
            const payload = {
                ...data,
                domain: 'PAYMENT',
                level: ACTION_LEVEL_MAP[data.action] || 'INFO',
                target_type: data.target_type || 'PAYMENT',
                target_id: data.target_id || data.payment_id || null,
            };

            if (options.session) {
                await AuditLog.create([payload], { session: options.session });
                return;
            }

            await AuditLog.create(payload);
        } catch (err) {
            console.error('[PaymentAuditLog]', err);

            if (options.throwOnError) {
                throw err;
            }
        }
    }
}

module.exports = PaymentAuditLogService;
