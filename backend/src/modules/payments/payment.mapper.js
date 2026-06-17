class PaymentMapper {
    static toResponseDTO(payment) {
        if (!payment) {
            return null;
        }

        const doc = payment.toObject ? payment.toObject() : payment;

        return {
            id: doc._id?.toString(),

            order_id: doc.order_id?.toString(),
            user_id: doc.user_id?.toString(),

            provider: doc.provider,

            amount: doc.amount,
            currency: doc.currency || 'VND',

            status: doc.status,

            verification_status: doc.verification_status,

            transaction_ref: this.getTransactionRef(doc.provider_data),

            failure_reason: doc.failure_reason,
            failure_message: doc.failure_message,

            paid_at: doc.paid_at,
            refund_requested_at: doc.refund_requested_at,
            refund_completed_at: doc.refund_completed_at,
            refund_reference: doc.refund_reference,
            created_at: doc.created_at,
            updated_at: doc.updated_at,
        };
    }

    static toDetailDTO(payment) {
        if (!payment) {
            return null;
        }

        const doc = payment.toObject ? payment.toObject() : payment;

        return {
            id: doc._id?.toString(),

            order_id: doc.order_id?.toString(),
            user_id: doc.user_id?.toString(),

            provider: doc.provider,

            amount: doc.amount,
            currency: doc.currency || 'VND',

            status: doc.status,
            status_label: this.getStatusLabel(doc.status),

            verification_status: doc.verification_status,
            verification_status_label: this.getVerificationStatusLabel(
                doc.verification_status
            ),
            webhook_verified_at: doc.webhook_verified_at,

            provider_data: this.filterProviderData(doc.provider, doc.provider_data),

            failure: doc.status === 'failed'
                ? {
                    reason: doc.failure_reason,
                    code: doc.failure_code,
                    message: doc.failure_message,
                }
                : null,

            retry_count: doc.retry_count || 0,
            last_retry_at: doc.last_retry_at,

            expires_at: doc.expires_at,
            is_expired: doc.status === 'pending' && this.isExpired(doc),

            paid_at: doc.paid_at,
            refund_requested_at: doc.refund_requested_at,
            refund_completed_at: doc.refund_completed_at,
            refund_reference: doc.refund_reference,
            refund_note: doc.refund_note,
            refund_reason: doc.refund_reason,
            created_at: doc.created_at,
            updated_at: doc.updated_at,
        };
    }

    static toCustomerDTO(payment) {
        if (!payment) {
            return null;
        }

        const doc = payment.toObject ? payment.toObject() : payment;
        const isExpired = this.isExpired(doc);

        return {
            id: doc._id?.toString(),
            order_id: doc.order_id?.toString(),

            provider: doc.provider,
            provider_label: this.getProviderLabel(doc.provider),

            amount: doc.amount,
            currency: doc.currency || 'VND',

            status: doc.status,
            status_label: this.getStatusLabel(doc.status),

            message: this.getCustomerMessage(doc.status, doc.failure_message),

            can_retry: doc.status === 'failed' && !isExpired,
            can_cancel: doc.status === 'pending',

            created_at: doc.created_at,
            paid_at: doc.paid_at,
            refund_requested_at: doc.refund_requested_at,
            refund_completed_at: doc.refund_completed_at,
        };
    }

    static toAdminDTO(payment) {
        if (!payment) {
            return null;
        }

        const doc = payment.toObject ? payment.toObject() : payment;

        return {
            id: doc._id?.toString(),

            order_id: doc.order_id?.toString(),
            user_id: doc.user_id?.toString(),

            provider: doc.provider,

            amount: doc.amount,
            currency: doc.currency || 'VND',

            status: doc.status,
            status_label: this.getStatusLabel(doc.status),

            verification_status: doc.verification_status,
            webhook_verified_at: doc.webhook_verified_at,

            provider_data: this.filterProviderDataAdmin(
                doc.provider,
                doc.provider_data
            ),

            idempotency_key: doc.idempotency_key,

            failure: doc.status === 'failed' || doc.verification_status === 'failed'
                ? {
                    reason: doc.failure_reason,
                    code: doc.failure_code,
                    message: doc.failure_message,
                }
                : null,

            retry_count: doc.retry_count || 0,
            last_retry_at: doc.last_retry_at,

            expires_at: doc.expires_at,
            is_expired: this.isExpired(doc),

            webhook_data: {
                raw_ipn_present: !!doc.raw_ipn,
                raw_return_present: !!doc.raw_return,
            },

            paid_at: doc.paid_at,
            refund_requested_at: doc.refund_requested_at,
            refund_completed_at: doc.refund_completed_at,
            refund_reference: doc.refund_reference,
            refund_note: doc.refund_note,
            refund_reason: doc.refund_reason,
            refund_completed_by:
                doc.refund_completed_by?.toString?.() ||
                doc.refund_completed_by ||
                null,
            created_at: doc.created_at,
            updated_at: doc.updated_at,

            is_deleted: doc.is_deleted || false,
            deleted_at: doc.deleted_at || null,
        };
    }

    static toWebhookResponseDTO(payment) {
        if (!payment) {
            return null;
        }

        const doc = payment.toObject ? payment.toObject() : payment;

        return {
            id: doc._id?.toString(),
            status: doc.status,
            verification_status: doc.verification_status,

            transaction_ref: this.getTransactionRef(doc.provider_data),

            processed_at: new Date(),
        };
    }

    static toListDTO(payment) {
        if (!payment) {
            return null;
        }

        const doc = payment.toObject ? payment.toObject() : payment;

        return {
            id: doc._id?.toString(),
            order_id: doc.order_id?.toString(),
            user_id: doc.user_id?.toString(),

            provider: doc.provider,
            transaction_ref: this.getTransactionRef(doc.provider_data),

            amount: doc.amount,
            currency: doc.currency || 'VND',

            status: doc.status,
            status_label: this.getStatusLabel(doc.status),
            verification_status: doc.verification_status,

            created_at: doc.created_at,
            paid_at: doc.paid_at,
            refund_requested_at: doc.refund_requested_at,
            refund_completed_at: doc.refund_completed_at,
            refund_reference: doc.refund_reference,
        };
    }

    static toResponseDTOList(payments, mapperFn = null) {
        if (!Array.isArray(payments)) {
            return [];
        }

        const mapper = mapperFn || ((p) => this.toResponseDTO(p));
        return payments.map(mapper);
    }

    static toExportDTO(payment) {
        if (!payment) {
            return null;
        }

        const doc = payment.toObject ? payment.toObject() : payment;

        return {
            payment_id: doc._id?.toString(),
            order_id: doc.order_id?.toString(),
            user_id: doc.user_id?.toString(),

            provider: doc.provider,
            transaction_ref: this.getTransactionRef(doc.provider_data),

            amount: doc.amount,
            currency: doc.currency || 'VND',

            status: doc.status,
            verification_status: doc.verification_status,

            failure_reason: doc.failure_reason || '',
            failure_code: doc.failure_code || '',

            retry_count: doc.retry_count || 0,
            is_expired: this.isExpired(doc),

            paid_at: doc.paid_at
                ? new Date(doc.paid_at).toISOString()
                : '',
            refund_requested_at: doc.refund_requested_at
                ? new Date(doc.refund_requested_at).toISOString()
                : '',
            refund_completed_at: doc.refund_completed_at
                ? new Date(doc.refund_completed_at).toISOString()
                : '',
            created_at: new Date(doc.created_at).toISOString(),
            updated_at: new Date(doc.updated_at).toISOString(),
        };
    }

    static toReceiptDTO(payment, order = null) {
        if (!payment) {
            return null;
        }

        const doc = payment.toObject ? payment.toObject() : payment;

        return {
            document_type: 'Payment Receipt',
            payment_id: doc._id?.toString(),
            order_id: doc.order_id?.toString(),

            payment_method: this.getProviderLabel(doc.provider),
            transaction_ref: this.getTransactionRef(doc.provider_data),

            amount_display: this.formatPrice(doc.amount, doc.currency),
            amount_raw: doc.amount,
            currency: doc.currency || 'VND',

            status: doc.status,
            status_label: this.getStatusLabel(doc.status),

            payment_date: doc.paid_at
                ? this.formatDate(doc.paid_at)
                : 'Pending',
            created_date: this.formatDate(doc.created_at),

            bank_code: doc.provider_data?.vnp_bank_code || null,
            bank_label: doc.provider_data?.vnp_bank_code
                ? this.getBankLabel(doc.provider_data.vnp_bank_code)
                : null,

            support_message:
                doc.status === 'paid'
                    ? 'Payment successful. Thank you for your purchase!'
                    : doc.status === 'failed'
                        ? `Payment failed: ${doc.failure_message}. Please try again or contact support.`
                        : doc.status === 'refund_pending'
                            ? 'Payment refund is waiting for confirmation.'
                            : doc.status === 'refunded'
                                ? 'Payment has been refunded.'
                                : 'Payment pending. Please complete the payment process.',
        };
    }



    static getTransactionRef(providerData) {
        if (!providerData) {
            return null;
        }

        return (
            providerData.vnp_txn_ref ||
            providerData.stripe_pi_id ||
            providerData.paypal_capture_id ||
            providerData.paypal_order_id ||
            providerData.payos_reference ||
            providerData.payos_payment_link_id ||
            providerData.payos_order_code ||
            null
        );
    }

    static isExpired(doc) {
        if (!doc?.expires_at) {
            return false;
        }

        return new Date() > new Date(doc.expires_at);
    }

    static filterProviderData(provider, providerData) {
        if (!providerData) {
            return null;
        }

        const filtered = {};

        if (provider === 'vnpay') {
            filtered.vnp_txn_ref = providerData.vnp_txn_ref;
            filtered.vnp_bank_code = providerData.vnp_bank_code;
            filtered.vnp_pay_date = providerData.vnp_pay_date;
        }

        if (provider === 'stripe') {
            filtered.stripe_pi_id = providerData.stripe_pi_id;
            filtered.stripe_status = providerData.stripe_status;
        }

        if (provider === 'paypal') {
            filtered.paypal_order_id = providerData.paypal_order_id;
            filtered.paypal_capture_id = providerData.paypal_capture_id;
            filtered.paypal_status = providerData.paypal_status;
            filtered.paypal_amount_value = providerData.paypal_amount_value;
            filtered.paypal_currency = providerData.paypal_currency;
        }

        if (provider === 'payos') {
            filtered.payos_order_code = providerData.payos_order_code;
            filtered.payos_payment_link_id = providerData.payos_payment_link_id;
            filtered.payos_status = providerData.payos_status;
            filtered.payos_reference = providerData.payos_reference;
        }

        return Object.keys(filtered).length > 0 ? filtered : null;
    }

    static filterProviderDataAdmin(provider, providerData) {
        if (!providerData) {
            return null;
        }

        const filtered = {};

        if (provider === 'vnpay') {
            filtered.vnp_txn_ref = providerData.vnp_txn_ref;
            filtered.vnp_transaction_no = providerData.vnp_transaction_no;
            filtered.vnp_response_code = providerData.vnp_response_code;
            filtered.vnp_bank_code = providerData.vnp_bank_code;
            filtered.vnp_pay_date = providerData.vnp_pay_date;
        }

        if (provider === 'stripe') {
            filtered.stripe_pi_id = providerData.stripe_pi_id;
            filtered.stripe_status = providerData.stripe_status;
            filtered.stripe_client_secret = '***';
        }

        if (provider === 'paypal') {
            filtered.paypal_order_id = providerData.paypal_order_id;
            filtered.paypal_capture_id = providerData.paypal_capture_id;
            filtered.paypal_checkout_url = providerData.paypal_checkout_url;
            filtered.paypal_payer_id = providerData.paypal_payer_id;
            filtered.paypal_status = providerData.paypal_status;
            filtered.paypal_amount_value = providerData.paypal_amount_value;
            filtered.paypal_currency = providerData.paypal_currency;
            filtered.paypal_exchange_rate = providerData.paypal_exchange_rate;
        }

        if (provider === 'payos') {
            filtered.payos_order_code = providerData.payos_order_code;
            filtered.payos_payment_link_id = providerData.payos_payment_link_id;
            filtered.payos_checkout_url = providerData.payos_checkout_url;
            filtered.payos_qr_code = providerData.payos_qr_code;
            filtered.payos_status = providerData.payos_status;
            filtered.payos_reference = providerData.payos_reference;
            filtered.payos_transaction_date_time =
                providerData.payos_transaction_date_time;
        }

        return Object.keys(filtered).length > 0 ? filtered : null;
    }

    static getStatusLabel(status) {
        const labels = {
            pending: 'Pending',
            paid: 'Paid',
            failed: 'Failed',
            refund_pending: 'Refund pending',
            refunded: 'Refunded',
        };

        return labels[status] || status;
    }

    static getVerificationStatusLabel(status) {
        const labels = {
            pending: 'Awaiting verification',
            verified: 'Verified',
            failed: 'Verification failed',
        };

        return labels[status] || status;
    }

    static getProviderLabel(provider) {
        const labels = {
            vnpay: 'VNPay',
            stripe: 'Stripe',
            paypal: 'PayPal',
            payos: 'PayOS',
        };

        return labels[provider] || provider;
    }

    static getBankLabel(bankCode) {
        const banks = {
            VCB: 'Vietcombank',
            TCB: 'Techcombank',
            ACB: 'ACB',
            VIB: 'VIB',
            STB: 'Sacombank',
            HDB: 'HDBank',
            BIDV: 'BIDV',
            MB: 'MB Bank',
            TPB: 'TPBank',
            MSB: 'MSB',
            IVB: 'Iron Velocity Bank',
        };

        return banks[bankCode] || bankCode;
    }

    static getCustomerMessage(status, failureMessage) {
        const messages = {
            pending:
                'Your payment is pending. Please complete the payment process to continue.',
            paid: 'Payment successful! Your order is being processed.',
            failed:
                failureMessage ||
                'Payment failed. Please check your payment details and try again.',
            refund_pending:
                'Your order was cancelled and the refund is waiting for shop confirmation.',
            refunded: 'Your payment has been refunded.',
        };

        return messages[status] || 'Payment status unknown. Please contact support.';
    }

    static formatPrice(amount, currency = 'VND') {
        if (currency === 'VND') {
            return `${amount.toLocaleString('en-US')} ₫`;
        }

        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
        }).format(amount / 100);
    }

    static formatDate(date) {
        if (!date) {
            return null;
        }

        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    }

    static getTimeRemaining(expiresAt) {
        if (!expiresAt) {
            return null;
        }

        const now = new Date();
        const expires = new Date(expiresAt);

        if (now >= expires) {
            return 'Expired';
        }

        const diffMs = expires - now;
        const diffMinutes = Math.ceil(diffMs / (1000 * 60));

        if (diffMinutes >= 60) {
            const hours = Math.floor(diffMinutes / 60);
            return `${hours}h ${diffMinutes % 60}m remaining`;
        }

        return `${diffMinutes}m remaining`;
    }

    static validateDTO(payment) {
        const errors = [];

        if (!payment.id) errors.push('Payment ID is required');
        if (!payment.order_id) errors.push('Order ID is required');
        if (!payment.amount || payment.amount <= 0)
            errors.push('Amount must be greater than 0');
        if (!payment.status) errors.push('Payment status is required');

        return {
            isValid: errors.length === 0,
            errors,
        };
    }
}

module.exports = PaymentMapper;
