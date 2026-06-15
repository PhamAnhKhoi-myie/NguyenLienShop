const AppError = require('../../utils/appError.util');

const truthyValues = new Set(['true', '1', 'yes', 'on']);

const isTruthy = (value) =>
    truthyValues.has(String(value || '').trim().toLowerCase());

const isVNPayCheckoutEnabled = () =>
    isTruthy(process.env.VNPAY_CHECKOUT_ENABLED);

const hasPayOSConfig = () =>
    Boolean(
        process.env.PAYOS_CLIENT_ID &&
        process.env.PAYOS_API_KEY &&
        process.env.PAYOS_CHECKSUM_KEY
    );

const hasPayPalConfig = () =>
    Boolean(
        process.env.PAYPAL_CLIENT_ID &&
        process.env.PAYPAL_CLIENT_SECRET
    );

const isPayOSCheckoutEnabled = () => {
    if (process.env.PAYOS_CHECKOUT_ENABLED !== undefined) {
        return isTruthy(process.env.PAYOS_CHECKOUT_ENABLED) && hasPayOSConfig();
    }

    return hasPayOSConfig();
};

const isPayPalCheckoutEnabled = () => {
    if (process.env.PAYPAL_CHECKOUT_ENABLED !== undefined) {
        return isTruthy(process.env.PAYPAL_CHECKOUT_ENABLED) && hasPayPalConfig();
    }

    return hasPayPalConfig();
};

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

    if (normalizedProvider === 'payos') {
        if (!hasPayOSConfig()) {
            throw new AppError(
                'PayOS config is missing',
                500,
                'PAYOS_CONFIG_MISSING'
            );
        }

        if (isPayOSCheckoutEnabled()) {
            return;
        }

        throw new AppError(
            'PayOS checkout is temporarily disabled',
            503,
            'PAYOS_CHECKOUT_DISABLED'
        );
    }

    if (normalizedProvider === 'paypal') {
        if (!hasPayPalConfig()) {
            throw new AppError(
                'PayPal config is missing',
                500,
                'PAYPAL_CONFIG_MISSING'
            );
        }

        if (isPayPalCheckoutEnabled()) {
            return;
        }

        throw new AppError(
            'PayPal checkout is temporarily disabled',
            503,
            'PAYPAL_CHECKOUT_DISABLED'
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
    hasPayPalConfig,
    hasPayOSConfig,
    isPayPalCheckoutEnabled,
    isPayOSCheckoutEnabled,
    isVNPayCheckoutEnabled,
};
