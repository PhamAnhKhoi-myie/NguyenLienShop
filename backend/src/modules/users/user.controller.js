const asyncHandler = require('../../utils/asyncHandler.util');
const UserService = require('./user.service');
const UserMapper = require('./user.mapper');
const { validateObjectId } = require('../../utils/validator.util');
const { assertAuthenticated, assertRole } = require('../../utils/auth.util');
const { checkOwnershipOrAdmin } = require('../../middlewares/authorize.middleware');

/**
 * GET /api/v1/users/me
 * Get current authenticated user profile
 */
const getMe = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    const result = await UserService.getMe(user.id);

    res.status(200).json({
        success: true,
        data: result,
    });
});

/**
 * GET /api/v1/users
 * Get all users (admin only)
 */
const getAllUsers = asyncHandler(async (req, res) => {
    assertAuthenticated(req.user);

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const search = req.query.search || null;
    const status = req.query.status || null;

    const result = await UserService.getAllUsers(
        page,
        limit,
        search,
        status
    );

    res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
    });
});

/**
 * PATCH /api/v1/users/:id
 * Update user profile (owner or admin)
 */
const updateUser = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    validateObjectId(req.params.id);
    checkOwnershipOrAdmin(user.id, req.params.id, user.roles);

    const updatePayload = UserMapper.toUpdatePayload(req.body);
    const updated = await UserService.updateUser(req.params.id, updatePayload);

    res.status(200).json({
        success: true,
        data: updated,
    });
});

/**
 * DELETE /api/v1/users/:id
 * Delete user (owner or admin, soft delete)
 */
const deleteUser = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    validateObjectId(req.params.id);
    checkOwnershipOrAdmin(user.id, req.params.id, user.roles);

    const result = await UserService.deleteUser(req.params.id);

    res.status(200).json({
        success: true,
        data: result,
    });
});

/**
 * PATCH /api/v1/users/:id/roles
 * Update user roles (admin only)
 */
const updateUserRoles = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    validateObjectId(req.params.id);

    // ✅ Authorization: Only ADMIN can update roles
    assertRole(user, ['ADMIN']);

    const { roles } = req.body;

    // ✅ Validate input using AppError
    const ALLOWED_ROLES = ['ADMIN', 'USER'];

    if (!Array.isArray(roles) || roles.length === 0) {
        throw new AppError(
            'Roles must be a non-empty array',
            400,
            'VALIDATION_ERROR'
        );
    }

    // ✅ Validate each role is in allowed list
    const invalidRoles = roles.filter((r) => !ALLOWED_ROLES.includes(r));
    if (invalidRoles.length > 0) {
        throw new AppError(
            `Invalid roles: ${invalidRoles.join(', ')}. Allowed roles: ${ALLOWED_ROLES.join(', ')}`,
            400,
            'INVALID_ROLE'
        );
    }

    // ✅ Prevent self-demotion
    if (user.id === req.params.id && !roles.includes('ADMIN')) {
        throw new AppError(
            'You cannot remove your own ADMIN role',
            403,
            'FORBIDDEN'
        );
    }

    const updated = await UserService.updateUserRoles(req.params.id, roles);

    res.status(200).json({
        success: true,
        data: updated,
    });
});

module.exports = {
    getMe,
    getAllUsers,
    updateUser,
    deleteUser,
    updateUserRoles,
};