const AppError = require('../utils/appError.util');

const requireInternal = (req, res, next) => {
    const internalKey = req.headers['x-internal-key'];

    if (!internalKey || internalKey !== process.env.INTERNAL_API_KEY) {
        console.warn('[INTERNAL_ACCESS_DENIED]', {
            ip: req.ip,
            path: req.originalUrl
        });

        throw new AppError(
            'Forbidden - Internal access only',
            403,
            'FORBIDDEN_INTERNAL'
        );
    }

    next();
};

const requireInternalOrAdmin = (req, res, next) => {
    const internalKey = req.headers['x-internal-key'];

    if (internalKey === process.env.INTERNAL_API_KEY) {
        return next();
    }

    if (req.user && req.user.roles?.includes('ADMIN')) {
        return next();
    }

    console.warn('[FORBIDDEN_INTERNAL_OR_ADMIN]', {
        ip: req.ip,
        path: req.originalUrl
    });

    throw new AppError(
        'Forbidden',
        403,
        'FORBIDDEN'
    );
};

module.exports = { requireInternal, requireInternalOrAdmin };