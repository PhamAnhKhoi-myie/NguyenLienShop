const asyncHandler = require('../../utils/asyncHandler.util');
const UserService = require('./user.service');
const UserMapper = require('./user.mapper');
const { validateObjectId } = require('../../utils/validator.util');
const AppError = require('../../utils/appError.util');
const { ALL_ROLES } = require('../../constants/roles');
const { buildAuditMetadata } = require('../../utils/audit.util');

const getMe = asyncHandler(async (req, res) => {

    const result =
        await UserService.getMe(req.user.id);

    return res.status(200).json({
        success: true,
        data: result,
    });
});

const getAllUsers = asyncHandler(async (req, res) => {

    const page =
        parseInt(req.query.page, 10) || 1;

    const limit =
        parseInt(req.query.limit, 10) || 20;

    const search =
        req.query.search || null;

    const status =
        req.query.status || null;

    const result =
        await UserService.getAllUsers(
            page,
            limit,
            search,
            status
        );

    return res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
    });
});

const updateUser = asyncHandler(async (req, res) => {

    validateObjectId(req.params.id);

    const updatePayload =
        UserMapper.toUpdatePayload(req.body);

    const updated =
        await UserService.updateUserProfile(
            req.params.id,
            updatePayload,
            req.user.id,
            buildAuditMetadata(req)
        );

    return res.status(200).json({
        success: true,
        data: updated,
    });
});

const deleteUser = asyncHandler(async (req, res) => {

    validateObjectId(req.params.id);

    const result =
        await UserService.deleteUser(
            req.params.id,
            req.user.id,
            buildAuditMetadata(req)
        );

    return res.status(200).json({
        success: true,
        data: result,
    });
});

const updateUserRoles = asyncHandler(async (req, res) => {
    validateObjectId(req.params.id);

    const { roles } = req.body;

    if (!Array.isArray(roles) || roles.length === 0) {
        throw new AppError(
            'Roles must be a non-empty array',
            400,
            'VALIDATION_ERROR'
        );
    }

    const invalidRoles = roles.filter(
        (r) => !ALL_ROLES.includes(r)
    );

    if (invalidRoles.length > 0) {
        throw new AppError(
            `Invalid roles: ${invalidRoles.join(', ')}`,
            400,
            'INVALID_ROLE'
        );
    }

    // Prevent self-demotion
    if (
        req.user.id === req.params.id &&
        !roles.includes('ADMIN')
    ) {
        throw new AppError(
            'You cannot remove your own ADMIN role',
            403,
            'FORBIDDEN'
        );
    }

    const metadata = buildAuditMetadata(req);

    const updated = await UserService.updateUserRoles(
        req.params.id,
        roles,
        req.user.id,
        metadata
    );

    return res.status(200).json({
        success: true,
        data: updated,
    });
});

const updateUserStatus = asyncHandler(async (req, res) => {
    validateObjectId(req.params.id);

    const { status } = req.body;

    const updated = await UserService.updateUserStatus(
        req.params.id,
        status,
        req.user.id,
        buildAuditMetadata(req)
    );

    return res.status(200).json({
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
    updateUserStatus
};