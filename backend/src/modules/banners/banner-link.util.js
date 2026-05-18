const idPattern = /^[a-zA-Z0-9_-]+$/;
const routePattern = /^\/(?!\/)[^\s]*$/;

const isSafeBannerLink = (value) => {
    if (typeof value !== 'string' || value.trim() !== value) {
        return false;
    }

    if (/^https?:\/\//i.test(value)) {
        try {
            const url = new URL(value);
            return ['http:', 'https:'].includes(url.protocol);
        } catch {
            return false;
        }
    }

    if (routePattern.test(value)) {
        return true;
    }

    return idPattern.test(value);
};

module.exports = {
    isSafeBannerLink
};
