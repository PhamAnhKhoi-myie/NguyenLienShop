const AppError = require('../../utils/appError.util');

const truthyValues = new Set(['true', '1', 'yes', 'on']);

const isTruthy = (value) =>
    truthyValues.has(String(value || '').trim().toLowerCase());

const isVNPayCheckoutEnabled = () =>
    isTruthy(process.env.VNPAY_CHECKOUT_ENABLED);

const assertPaymentProviderEnabled = (provider) => {
    const normalizedProvider = String(provider || '').trim().toLowerCase();

    if (normalizedProvider === 'vnpay') {
        if (isVNPayCheckoutEnabled()) {
            return;
        }

        throw new AppError(
            'VNPAY checkout is temporarily disabled',
            503,
            'VNPAY_CHECKOUT_DISABLED'
        );
    }

    throw new AppError(
        'Payment provider is not enabled',
        400,
        'PAYMENT_PROVIDER_NOT_ENABLED'
    );
};

module.exports = {
    assertPaymentProviderEnabled,
    isVNPayCheckoutEnabled,
};
