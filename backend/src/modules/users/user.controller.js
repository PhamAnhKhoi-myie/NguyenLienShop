const asyncHandler = require('../../utils/asyncHandler.util');
const UserService = require('./user.service');
const UserMapper = require('./user.mapper');
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

    const {
        page = 1,
        limit = 20,
        search = null,
        status = null
    } = req.query;

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

    const { id } = req.params;

    const updatePayload =
        UserMapper.toUpdatePayload(req.body);

    const updated =
        await UserService.updateUserProfile(
            id,
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

    const { id } = req.params;

    const result =
        await UserService.deleteUser(
            id,
            req.user.id,
            buildAuditMetadata(req)
        );

    return res.status(200).json({
        success: true,
        data: result,
    });
});

const updateUserRoles = asyncHandler(async (req, res) => {

    const { id } = req.params;
    const { roles } = req.body;

    const metadata = buildAuditMetadata(req);

    const updated = await UserService.updateUserRoles(
        id,
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

    const { id } = req.params;
    const { status } = req.body;

    const updated = await UserService.updateUserStatus(
        id,
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