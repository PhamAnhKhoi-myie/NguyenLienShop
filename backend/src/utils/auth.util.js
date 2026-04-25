const AppError = require('./appError.util');

/**
 * Assert that user is authenticated
 * Throws AppError if not authenticated
 * 
 * @param {Object} user - User object from req.user
 * @returns {Object} Validated user object
 * @throws {AppError} If user is not authenticated
 */
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

/**
 * Assert that user has required role
 * Throws AppError if user doesn't have role
 * 
 * @param {Object} user - User object from req.user
 * @param {Array<string>} allowedRoles - Required roles (e.g., ['ADMIN'])
 * @returns {Object} Validated user object
 * @throws {AppError} If user doesn't have required role
 */
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