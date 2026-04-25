const normalizeRole = (role) =>
    typeof role === "string" ? role.toUpperCase() : role;

const hasAnyRole = (userRoles = [], requiredRoles = []) => {
    if (!Array.isArray(userRoles)) return false;
    if (!Array.isArray(requiredRoles) || requiredRoles.length === 0) return false;

    const normalizedUserRoles = userRoles.map(normalizeRole);
    return requiredRoles.some((role) =>
        normalizedUserRoles.includes(normalizeRole(role))
    );
};

const checkAuthenticated = (user) => {
    if (!user) {
        const error = new Error("Missing authentication");
        error.statusCode = 401;
        error.code = "UNAUTHORIZED";
        throw error;
    }
    return true;
};

const checkOwnershipOrAdmin = (currentUserId, targetUserId, userRoles = []) => {
    if (!currentUserId || !targetUserId) {
        const error = new Error("Missing user identity information");
        error.statusCode = 400;
        error.code = "BAD_REQUEST";
        throw error;
    }

    if (String(currentUserId) === String(targetUserId)) {
        return true;
    }

    if (hasAnyRole(userRoles, ["ADMIN"])) {
        return true;
    }

    const error = new Error("You don't have permission");
    error.statusCode = 403;
    error.code = "FORBIDDEN";
    throw error;
};

const authorize = (allowedRoles = []) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                code: "UNAUTHORIZED",
                message: "Missing authentication",
            });
        }
        if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) {
            return next();
        }
        const userRoles = req.user.roles || [];
        if (!hasAnyRole(userRoles, allowedRoles)) {
            if (process.env.NODE_ENV === "development") {
                console.warn("Forbidden access attempt:", {
                    userId: req.user?.id,
                    userRoles,
                    requiredRoles: allowedRoles,
                });
            }
            return res.status(403).json({
                success: false,
                code: "FORBIDDEN",
                message: "You do not have permission to access this resource",
            });
        }
        next();
    };
};

module.exports = { authorize, checkAuthenticated, checkOwnershipOrAdmin };