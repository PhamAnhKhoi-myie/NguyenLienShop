const parseBoolean = (value) =>
    ['true', '1', 'yes', 'on'].includes(
        String(value || '').trim().toLowerCase()
    );

export const ENV = {
    API_BASE_URL:
        import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1',
    VNPAY_CHECKOUT_ENABLED: parseBoolean(
        import.meta.env.VITE_VNPAY_CHECKOUT_ENABLED
    ),
    PAYOS_CHECKOUT_ENABLED:
        import.meta.env.VITE_PAYOS_CHECKOUT_ENABLED === undefined
            ? true
            : parseBoolean(import.meta.env.VITE_PAYOS_CHECKOUT_ENABLED),
};
