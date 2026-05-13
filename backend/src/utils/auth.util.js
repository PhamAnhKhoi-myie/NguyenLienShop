const AppError = require('./appError.util');

const assertAuthenticated = (user) => {
    if (!user) {
        throw new AppError(
            'Authentication required',
            401,
            'UNAUTHORIZED'
        );
    }
    return user;
};

const assertRole = (user, allowedRoles = []) => {
    assertAuthenticated(user);

    if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) {
        return user;
    }

    const normalizeRole = (role) =>
        typeof role === 'string' ? role.toUpperCase() : role;

    const userRoles = (user.roles || []).map(normalizeRole);
    const requiredRoles = allowedRoles.map(normalizeRole);

    const hasRole = requiredRoles.some((role) =>
        userRoles.includes(role)
    );

    if (!hasRole) {
        throw new AppError(
            'You do not have permission to access this resource',
            403,
            'FORBIDDEN'
        );
    }

    return user;
};

module.exports = {
    assertAuthenticated,
    assertRole,
};