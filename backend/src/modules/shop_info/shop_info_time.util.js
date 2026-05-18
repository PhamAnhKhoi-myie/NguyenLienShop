const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

const isValidTime = (value) =>
    typeof value === 'string' && timePattern.test(value);

const toMinutes = (value) => {
    const [hours, minutes] = value.split(':').map(Number);
    return hours * 60 + minutes;
};

const isOpeningRange = (open, close) =>
    isValidTime(open) &&
    isValidTime(close) &&
    toMinutes(open) < toMinutes(close);

module.exports = {
    timePattern,
    isValidTime,
    isOpeningRange
};
