export const normalizePhoneNumber = (value) => {
    const raw = String(value || '').replace(/[\s.-]/g, '');

    if (/^\+84\d{9}$/.test(raw)) {
        return `0${raw.slice(3)}`;
    }

    if (/^84\d{9}$/.test(raw)) {
        return `0${raw.slice(2)}`;
    }

    return raw;
};

export const isValidVietnamPhoneNumber = (value) =>
    /^0[35789]\d{8}$/.test(normalizePhoneNumber(value));
