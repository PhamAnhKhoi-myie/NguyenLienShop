const REVIEW_WINDOW_DAYS = 3;
const REVIEW_WINDOW_MS = REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;

function toValidDate(value) {
    if (!value) {
        return null;
    }

    const date = value instanceof Date ? value : new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
}

function getReviewExpiresAt(order) {
    const confirmedAt = toValidDate(order?.customer_receipt?.confirmed_at);

    if (!confirmedAt) {
        return null;
    }

    return new Date(confirmedAt.getTime() + REVIEW_WINDOW_MS);
}

function isReviewWindowOpen(order, now = new Date()) {
    const expiresAt = getReviewExpiresAt(order);
    const currentTime = toValidDate(now);

    return Boolean(expiresAt && currentTime && currentTime.getTime() <= expiresAt.getTime());
}

function toReviewWindowDTO(order, now = new Date()) {
    const expiresAt = getReviewExpiresAt(order);

    return {
        days: REVIEW_WINDOW_DAYS,
        expires_at: expiresAt,
        open: isReviewWindowOpen(order, now),
        expired: Boolean(expiresAt && toValidDate(now)?.getTime() > expiresAt.getTime()),
    };
}

module.exports = {
    REVIEW_WINDOW_DAYS,
    REVIEW_WINDOW_MS,
    getReviewExpiresAt,
    isReviewWindowOpen,
    toReviewWindowDTO,
};
