const AppError = require('../utils/appError.util');

const normalizeRole = (role) =>
    typeof role === 'string'
        ? role.toUpperCase()
        : role;

const hasAnyRole = (
    userRoles = [],
    requiredRoles = []
) => {

    if (!Array.isArray(userRoles)) {
        return false;
    }

    if (
        !Array.isArray(requiredRoles) ||
        requiredRoles.length === 0
    ) {
        return false;
    }

    const normalizedUserRoles =
        userRoles.map(normalizeRole);

    return requiredRoles.some((role) =>
        normalizedUserRoles.includes(
            normalizeRole(role)
        )
    );
};

const authorize = (allowedRoles = []) => {

    return (req, res, next) => {

        try {

            if (!req.user) {
                return next(
                    new AppError(
                        'Missing authentication',
                        401,
                        'UNAUTHORIZED'
                    )
                );
            }

            if (
                !Array.isArray(allowedRoles) ||
                allowedRoles.length === 0
            ) {
                return next();
            }

            const userRoles = req.user.roles || [];

            if (!hasAnyRole(userRoles, allowedRoles)) {

                if (
                    process.env.NODE_ENV ===
                    'development'
                ) {
                    console.warn(
                        'Forbidden access attempt:',
                        {
                            userId: req.user?.id,
                            userRoles,
                            requiredRoles:
                                allowedRoles,
                        }
                    );
                }

                return next(
                    new AppError(
                        'You do not have permission to access this resource',
                        403,
                        'FORBIDDEN'
                    )
                );
            }

            return next();

        } catch (error) {
            return next(error);
        }
    };
};

const checkOwnershipOrAdmin = (
    paramKey = 'id'
) => {

    return (req, res, next) => {

        try {

            if (!req.user) {
                return next(
                    new AppError(
                        'Missing authentication',
                        401,
                        'UNAUTHORIZED'
                    )
                );
            }

            const currentUserId =
                req.user.id;

            const targetUserId =
                req.params[paramKey];

            const userRoles =
                req.user.roles || [];

            const isOwner =
                String(currentUserId) ===
                String(targetUserId);

            const isAdmin =
                hasAnyRole(userRoles, ['ADMIN']);

            if (!isOwner && !isAdmin) {
                return next(
                    new AppError(
                        "You don't have permission",
                        403,
                        'FORBIDDEN'
                    )
                );
            }

            return next();

        } catch (error) {
            return next(error);
        }
    };
};

module.exports = {
    authorize,
    checkOwnershipOrAdmin,
};