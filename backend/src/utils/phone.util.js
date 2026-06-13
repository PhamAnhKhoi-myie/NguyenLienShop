const VIETNAM_PHONE_REGEX = /^0[35789]\d{8}$/;

const normalizePhoneNumber = (value) => {
    const raw = String(value || '').replace(/[\s.-]/g, '');

    if (/^\+84\d{9}$/.test(raw)) {
        return `0${raw.slice(3)}`;
    }

    if (/^84\d{9}$/.test(raw)) {
        return `0${raw.slice(2)}`;
    }

    return raw;
};

const isValidVietnamPhoneNumber = (value) =>
    VIETNAM_PHONE_REGEX.test(normalizePhoneNumber(value));

const maskPhoneNumber = (value) => {
    const phoneNumber = normalizePhoneNumber(value);

    if (phoneNumber.length < 7) {
        return phoneNumber;
    }

    return `${phoneNumber.slice(0, 3)}****${phoneNumber.slice(-3)}`;
};

module.exports = {
    VIETNAM_PHONE_REGEX,
    normalizePhoneNumber,
    isValidVietnamPhoneNumber,
    maskPhoneNumber,
};
