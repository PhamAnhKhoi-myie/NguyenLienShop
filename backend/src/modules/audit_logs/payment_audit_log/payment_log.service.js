const PaymentAuditLog = require('./payment_log.model');
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
    [AUDIT_ACTIONS.PAYMENT_WEBHOOK_AMOUNT_MISMATCH]: 'SECURITY',
    [AUDIT_ACTIONS.PAYMENT_WEBHOOK_REJECTED]: 'SECURITY',
};

class PaymentAuditLogService {
    static async createLog(data) {
        try {
            const level = ACTION_LEVEL_MAP[data.action] || 'INFO';

            await PaymentAuditLog.create({
                ...data,
                level,
            });
        } catch (err) {
            console.error('[PaymentAuditLog]', err);
        }
    }
}

module.exports = PaymentAuditLogService;
