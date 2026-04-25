/**
 * Payment DTO Mapper
 * Transform between MongoDB documents and API responses
 * 
 * ✅ Hide: internal fields (_id, __v, is_deleted, deleted_at, raw_ipn, raw_return)
 * ✅ Hide: sensitive data (stripe_client_secret, webhook signatures)
 * ✅ Expose: id, order_id, status, amount, payment method
 * ✅ Nest: provider_data (filtered), verification_status, failure_reason
 * ✅ Security: Never expose raw webhook data in API responses
 */

class PaymentMapper {
    /**
     * ✅ Convert Mongoose document → API Response DTO (basic)
     * 
     * Dùng cho: Payment listing, create/update returns
     * Include: payment summary + status + amounts
     * Hide: raw webhook data, secrets
     */
    static toResponseDTO(payment) {
        if (!payment) {
            return null;
        }

        const doc = payment.toObject ? payment.toObject() : payment;

        return {
            id: doc._id?.toString(),

            // ✅ References
            order_id: doc.order_id?.toString(),
            user_id: doc.user_id?.toString(),

            // ✅ Provider info
            provider: doc.provider,

            // ✅ Financial data (immutable snapshot)
            amount: doc.amount,
            currency: doc.currency || 'VND',

            // ✅ Payment status (state machine)
            status: doc.status,

            // ✅ Verification state
            verification_status: doc.verification_status,

            // ✅ Provider transaction reference (for customer tracking)
            transaction_ref: this.getTransactionRef(doc.provider_data),

            // ✅ Failure info (customer-facing)
            failure_reason: doc.failure_reason,
            failure_message: doc.failure_message,

            // ✅ Timestamps
            paid_at: doc.paid_at,
            created_at: doc.created_at,
            updated_at: doc.updated_at,
        };
    }

    /**
     * ✅ Convert to Detail DTO (full information for status check)
     * 
     * Dùng cho: GET /payments/:id (payment detail page)
     * Include: full payment info + provider details (filtered)
     */
    static toDetailDTO(payment) {
        if (!payment) {
            return null;
        }

        const doc = payment.toObject ? payment.toObject() : payment;

        return {
            id: doc._id?.toString(),

            // ✅ References
            order_id: doc.order_id?.toString(),
            user_id: doc.user_id?.toString(),

            // ✅ Provider info
            provider: doc.provider,

            // ✅ Financial snapshot
            amount: doc.amount,
            currency: doc.currency || 'VND',

            // ✅ Status tracking
            status: doc.status,
            status_label: this.getStatusLabel(doc.status),

            // ✅ Verification details
            verification_status: doc.verification_status,
            verification_status_label: this.getVerificationStatusLabel(
                doc.verification_status
            ),
            webhook_verified_at: doc.webhook_verified_at,

            // ✅ Provider-specific details (filtered for security)
            provider_data: this.filterProviderData(doc.provider, doc.provider_data),

            // ✅ Failure tracking (if any)
            failure: doc.status === 'failed'
                ? {
                    reason: doc.failure_reason,
                    code: doc.failure_code,
                    message: doc.failure_message,
                }
                : null,

            // ✅ Retry info
            retry_count: doc.retry_count || 0,
            last_retry_at: doc.last_retry_at,

            // ✅ Expiry info (if pending)
            expires_at: doc.expires_at,
            is_expired: doc.status === 'pending' && doc.expires_at
                ? new Date() > new Date(doc.expires_at)
                : false,

            // ✅ Timestamps
            paid_at: doc.paid_at,
            created_at: doc.created_at,
            updated_at: doc.updated_at,
        };
    }

    /**
     * ✅ Convert for Customer View (minimal sensitive data)
     * 
     * Dùng cho: Order payment status in customer dashboard
     * Hide: webhook details, internal IDs
     */
    static toCustomerDTO(payment) {
        if (!payment) {
            return null;
        }

        const doc = payment.toObject ? payment.toObject() : payment;

        return {
            id: doc._id?.toString(),
            order_id: doc.order_id?.toString(),

            // ✅ Payment method (customer-visible)
            provider: doc.provider,
            provider_label: this.getProviderLabel(doc.provider),

            // ✅ Amount (for reference)
            amount: doc.amount,
            currency: doc.currency || 'VND',

            // ✅ Simple status for customer
            status: doc.status,
            status_label: this.getStatusLabel(doc.status),

            // ✅ Customer-friendly message
            message: this.getCustomerMessage(doc.status, doc.failure_message),

            // ✅ Actions (for UI/UX)
            can_retry: doc.status === 'failed' && !doc.is_expired,
            can_cancel: doc.status === 'pending',

            // ✅ Key dates
            created_at: doc.created_at,
            paid_at: doc.paid_at,
        };
    }

    /**
     * ✅ Convert for Admin Dashboard (full transparency)
     * 
     * Dùng cho: Admin panel, payment reconciliation, debugging
     * Include: all data including webhook info (redacted secrets)
     */
    static toAdminDTO(payment) {
        if (!payment) {
            return null;
        }

        const doc = payment.toObject ? payment.toObject() : payment;

        return {
            id: doc._id?.toString(),

            // ✅ References
            order_id: doc.order_id?.toString(),
            user_id: doc.user_id?.toString(),

            // ✅ Provider
            provider: doc.provider,

            // ✅ Financial
            amount: doc.amount,
            currency: doc.currency || 'VND',

            // ✅ Status tracking
            status: doc.status,
            status_label: this.getStatusLabel(doc.status),

            // ✅ Verification (for debugging webhooks)
            verification_status: doc.verification_status,
            webhook_verified_at: doc.webhook_verified_at,

            // ✅ Full provider data (redacted secrets)
            provider_data: this.filterProviderDataAdmin(
                doc.provider,
                doc.provider_data
            ),

            // ✅ Idempotency tracking
            idempotency_key: doc.idempotency_key,

            // ✅ Failure details
            failure: doc.status === 'failed' || doc.verification_status === 'failed'
                ? {
                    reason: doc.failure_reason,
                    code: doc.failure_code,
                    message: doc.failure_message,
                }
                : null,

            // ✅ Retry tracking
            retry_count: doc.retry_count || 0,
            last_retry_at: doc.last_retry_at,

            // ✅ Expiry
            expires_at: doc.expires_at,
            is_expired: doc.expires_at
                ? new Date() > new Date(doc.expires_at)
                : false,

            // ✅ Raw webhook data (for debugging - optional toggle)
            webhook_data: {
                raw_ipn_present: !!doc.raw_ipn,
                raw_return_present: !!doc.raw_return,
                // Full data available via separate endpoint if needed
            },

            // ✅ Timestamps
            paid_at: doc.paid_at,
            created_at: doc.created_at,
            updated_at: doc.updated_at,

            // ✅ Soft delete info
            is_deleted: doc.is_deleted || false,
            deleted_at: doc.deleted_at || null,
        };
    }

    /**
     * ✅ Convert for Payment Webhook Response
     * 
     * Dùng cho: Webhook handler response (minimal, fast)
     * Include: confirmation of receipt + next steps
     */
    static toWebhookResponseDTO(payment) {
        if (!payment) {
            return null;
        }

        const doc = payment.toObject ? payment.toObject() : payment;

        return {
            id: doc._id?.toString(),
            status: doc.status,
            verification_status: doc.verification_status,

            // ✅ Provider reference for reconciliation
            transaction_ref: this.getTransactionRef(doc.provider_data),

            // ✅ Timestamp for logging
            processed_at: new Date(),
        };
    }

    /**
     * ✅ Convert for Payment List (admin/reporting)
     * 
     * Dùng cho: Payment history listing, admin dashboard
     * Include: lightweight info for table view
     */
    static toListDTO(payment) {
        if (!payment) {
            return null;
        }

        const doc = payment.toObject ? payment.toObject() : payment;

        return {
            id: doc._id?.toString(),
            order_id: doc.order_id?.toString(),
            user_id: doc.user_id?.toString(),

            // ✅ Quick identification
            provider: doc.provider,
            transaction_ref: this.getTransactionRef(doc.provider_data),

            // ✅ Amount
            amount: doc.amount,
            currency: doc.currency || 'VND',

            // ✅ Status (for filtering/sorting)
            status: doc.status,
            status_label: this.getStatusLabel(doc.status),
            verification_status: doc.verification_status,

            // ✅ Dates (for sorting/filtering)
            created_at: doc.created_at,
            paid_at: doc.paid_at,
        };
    }

    /**
     * ✅ Convert array of payments → array of DTOs
     * 
     * Dùng cho: Payment listing endpoints
     */
    static toResponseDTOList(payments, mapperFn = null) {
        if (!Array.isArray(payments)) {
            return [];
        }

        const mapper = mapperFn || ((p) => this.toResponseDTO(p));
        return payments.map(mapper);
    }

    /**
     * ✅ Convert for Payment History Export (CSV/Report)
     * 
     * Dùng cho: Export, reports, analytics
     * Include: flattened structure for tabular format
     */
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
            is_expired: doc.expires_at && new Date() > new Date(doc.expires_at),

            paid_at: doc.paid_at
                ? new Date(doc.paid_at).toISOString()
                : '',
            created_at: new Date(doc.created_at).toISOString(),
            updated_at: new Date(doc.updated_at).toISOString(),
        };
    }

    /**
     * ✅ Convert for Invoice/Receipt (customer document)
     * 
     * Dùng cho: Invoice, receipt email, PDF generation
     * Include: human-readable format
     */
    static toReceiptDTO(payment, order = null) {
        if (!payment) {
            return null;
        }

        const doc = payment.toObject ? payment.toObject() : payment;

        return {
            // ✅ Document headers
            document_type: 'Payment Receipt',
            payment_id: doc._id?.toString(),
            order_id: doc.order_id?.toString(),

            // ✅ Payment method
            payment_method: this.getProviderLabel(doc.provider),
            transaction_ref: this.getTransactionRef(doc.provider_data),

            // ✅ Amount (formatted for display)
            amount_display: this.formatPrice(doc.amount, doc.currency),
            amount_raw: doc.amount,
            currency: doc.currency || 'VND',

            // ✅ Status (human-readable)
            status: doc.status,
            status_label: this.getStatusLabel(doc.status),

            // ✅ Dates (formatted for display)
            payment_date: doc.paid_at
                ? this.formatDate(doc.paid_at)
                : 'Pending',
            created_date: this.formatDate(doc.created_at),

            // ✅ Bank details (if applicable)
            bank_code: doc.provider_data?.vnp_bank_code || null,
            bank_label: doc.provider_data?.vnp_bank_code
                ? this.getBankLabel(doc.provider_data.vnp_bank_code)
                : null,

            // ✅ Additional info for support
            support_message:
                doc.status === 'paid'
                    ? 'Payment successful. Thank you for your purchase!'
                    : doc.status === 'failed'
                        ? `Payment failed: ${doc.failure_message}. Please try again or contact support.`
                        : 'Payment pending. Please complete the payment process.',
        };
    }

    // ===== HELPERS =====

    /**
     * ✅ Helper: Get transaction reference from provider_data
     * 
     * Returns: VNPay txn_ref, Stripe PI ID, PayPal order ID, or null
     */
    static getTransactionRef(providerData) {
        if (!providerData) {
            return null;
        }

        return (
            providerData.vnp_txn_ref ||
            providerData.stripe_pi_id ||
            providerData.paypal_order_id ||
            null
        );
    }

    /**
     * ✅ Helper: Filter provider data (remove secrets)
     * 
     * Dùng cho: Customer/basic response (no secrets exposed)
     */
    static filterProviderData(provider, providerData) {
        if (!providerData) {
            return null;
        }

        const filtered = {};

        // ✅ VNPay: Expose only non-sensitive fields
        if (provider === 'vnpay') {
            filtered.vnp_txn_ref = providerData.vnp_txn_ref;
            filtered.vnp_bank_code = providerData.vnp_bank_code;
            filtered.vnp_pay_date = providerData.vnp_pay_date;
            // ❌ Don't expose: vnp_response_code (internal)
        }

        // ✅ Stripe: Expose only non-sensitive fields
        if (provider === 'stripe') {
            filtered.stripe_pi_id = providerData.stripe_pi_id;
            filtered.stripe_status = providerData.stripe_status;
            // ❌ Don't expose: stripe_client_secret
        }

        // ✅ PayPal: Expose only non-sensitive fields
        if (provider === 'paypal') {
            filtered.paypal_order_id = providerData.paypal_order_id;
            // ❌ Don't expose: paypal_payer_id
        }

        return Object.keys(filtered).length > 0 ? filtered : null;
    }

    /**
     * ✅ Helper: Filter provider data (admin version - more details)
     * 
     * Dùng cho: Admin response (all non-secret fields)
     */
    static filterProviderDataAdmin(provider, providerData) {
        if (!providerData) {
            return null;
        }

        const filtered = {};

        // ✅ VNPay: All fields except secrets
        if (provider === 'vnpay') {
            filtered.vnp_txn_ref = providerData.vnp_txn_ref;
            filtered.vnp_transaction_no = providerData.vnp_transaction_no;
            filtered.vnp_response_code = providerData.vnp_response_code;
            filtered.vnp_bank_code = providerData.vnp_bank_code;
            filtered.vnp_pay_date = providerData.vnp_pay_date;
        }

        // ✅ Stripe: All fields except secrets
        if (provider === 'stripe') {
            filtered.stripe_pi_id = providerData.stripe_pi_id;
            filtered.stripe_status = providerData.stripe_status;
            filtered.stripe_client_secret = '***'; // Redacted
        }

        // ✅ PayPal: All fields
        if (provider === 'paypal') {
            filtered.paypal_order_id = providerData.paypal_order_id;
            filtered.paypal_payer_id = providerData.paypal_payer_id;
        }

        return Object.keys(filtered).length > 0 ? filtered : null;
    }

    /**
     * ✅ Helper: Get status label (human-readable)
     */
    static getStatusLabel(status) {
        const labels = {
            pending: 'Pending',
            paid: 'Paid',
            failed: 'Failed',
        };

        return labels[status] || status;
    }

    /**
     * ✅ Helper: Get status label in Vietnamese
     */
    static getStatusLabelVi(status) {
        const labels = {
            pending: 'Đang chờ thanh toán',
            paid: 'Đã thanh toán',
            failed: 'Thanh toán thất bại',
        };

        return labels[status] || status;
    }

    /**
     * ✅ Helper: Get verification status label
     */
    static getVerificationStatusLabel(status) {
        const labels = {
            pending: 'Awaiting verification',
            verified: 'Verified',
            failed: 'Verification failed',
        };

        return labels[status] || status;
    }

    /**
     * ✅ Helper: Get provider label
     */
    static getProviderLabel(provider) {
        const labels = {
            vnpay: 'VNPay',
            stripe: 'Stripe',
            paypal: 'PayPal',
        };

        return labels[provider] || provider;
    }

    /**
     * ✅ Helper: Get bank label (VNPay bank codes)
     */
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

    /**
     * ✅ Helper: Get customer-facing message
     * 
     * Used for UI messaging (status page, email, etc.)
     */
    static getCustomerMessage(status, failureMessage) {
        const messages = {
            pending:
                'Your payment is pending. Please complete the payment process to continue.',
            paid: 'Payment successful! Your order is being processed.',
            failed:
                failureMessage ||
                'Payment failed. Please check your payment details and try again.',
        };

        return messages[status] || 'Payment status unknown. Please contact support.';
    }

    /**
     * ✅ Helper: Format price for display
     * 
     * Example: 180000 VND → "180,000 ₫"
     */
    static formatPrice(amount, currency = 'VND') {
        if (currency === 'VND') {
            return `${amount.toLocaleString('vi-VN')} ₫`;
        }

        // USD format
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
        }).format(amount / 100); // USD in cents
    }

    /**
     * ✅ Helper: Format date for display
     * 
     * Example: Date object → "12/25/2024 14:30:00"
     */
    static formatDate(date) {
        if (!date) {
            return null;
        }

        return new Date(date).toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    }

    /**
     * ✅ Helper: Calculate time remaining for payment window
     * 
     * Returns: "28 minutes remaining" or "Expired"
     */
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

    /**
     * ✅ Helper: Validate payment DTO before response
     * 
     * Returns: { isValid: boolean, errors: [] }
     */
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