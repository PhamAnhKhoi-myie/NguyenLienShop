const {
    normalizePhoneNumber,
    isValidVietnamPhoneNumber,
    maskPhoneNumber,
} = require('../../utils/phone.util');

describe('phone utilities', () => {
    test.each([
        ['0901234567', '0901234567'],
        ['+84901234567', '0901234567'],
        ['84901234567', '0901234567'],
        ['090 123 4567', '0901234567'],
        ['090-123-4567', '0901234567'],
    ])('normalizes %s', (input, expected) => {
        expect(normalizePhoneNumber(input)).toBe(expected);
    });

    test.each([
        '0901234567',
        '0351234567',
        '0571234567',
        '0781234567',
        '0891234567',
    ])('accepts valid Vietnamese mobile number %s', (phoneNumber) => {
        expect(isValidVietnamPhoneNumber(phoneNumber)).toBe(true);
    });

    test.each([
        '0201234567',
        '090123456',
        '09012345678',
        'abc',
        '',
    ])('rejects invalid phone number %s', (phoneNumber) => {
        expect(isValidVietnamPhoneNumber(phoneNumber)).toBe(false);
    });

    test('masks a phone number', () => {
        expect(maskPhoneNumber('0901234567')).toBe('090****567');
    });
});
