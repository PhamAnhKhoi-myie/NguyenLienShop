const DEFAULT_CURRENCY = 'VND';

const getNonNegativeInteger = (value, fallback = 0) => {
    if (value === undefined || value === null || value === '') {
        return fallback;
    }

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0) {
        throw new Error('DEFAULT_SHIPPING_FEE must be a non-negative integer');
    }

    return parsed;
};

const getDefaultShippingFee = () =>
    getNonNegativeInteger(process.env.DEFAULT_SHIPPING_FEE, 0);

module.exports = {
    DEFAULT_CURRENCY,
    getDefaultShippingFee,
};
