const isEmptyValue = (value) =>
    value === undefined || value === null || value === '';

const isHttpUrl = (value) => {
    if (typeof value !== 'string' || value.trim() !== value) {
        return false;
    }

    try {
        const url = new URL(value);
        return ['http:', 'https:'].includes(url.protocol);
    } catch {
        return false;
    }
};

const isOptionalHttpUrl = (value) =>
    isEmptyValue(value) || isHttpUrl(value);

const isSafeZaloLink = (value) => {
    if (isEmptyValue(value)) {
        return true;
    }

    if (isHttpUrl(value)) {
        return true;
    }

    return /^(\+?\d[\d\s().-]{5,20}|[a-zA-Z0-9_.-]{3,64})$/.test(value);
};

module.exports = {
    isHttpUrl,
    isOptionalHttpUrl,
    isSafeZaloLink
};
