const asyncHandler = require('../../utils/asyncHandler.util');
const { AuditLogService } = require('./audit_log.service');

const getAllLogs = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 20,
        actor_id,
        level,
        domain,
        action
    } = req.query;

    const filters = {
        domain,
        action,
        level,
        actor_id,
        page,
        limit
    };

    const result = await AuditLogService.getAllLogs(filters);

    return res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
    });
});

const getLogById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const log = await AuditLogService.getLogById(id);

    return res.status(200).json({
        success: true,
        data: log,
    });
});

const getUserLogs = asyncHandler(async (req, res) => {
    return getAllLogs(
        { ...req, query: { ...req.query, domain: 'USER' } },
        res
    );
});

const getUserAddressLogs = asyncHandler(async (req, res) => {
    return getAllLogs(
        { ...req, query: { ...req.query, domain: 'USER_ADDRESS' } },
        res
    );
});

const getCategoryLogs = asyncHandler(async (req, res) => {
    return getAllLogs(
        { ...req, query: { ...req.query, domain: 'CATEGORY' } },
        res
    );
});

const getAuthLogs = asyncHandler(async (req, res) => {
    return getAllLogs(
        { ...req, query: { ...req.query, domain: 'AUTH' } },
        res
    );
});

module.exports = {
    getAllLogs,
    getLogById,
    getUserLogs,
    getUserAddressLogs,
    getCategoryLogs,
    getAuthLogs
};