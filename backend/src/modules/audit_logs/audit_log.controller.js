const asyncHandler = require('../../utils/asyncHandler.util');
const { AuditLogService } = require('./audit_log.service');

const sendLogsResponse = async (req, res, domainOverride = null) => {
    const {
        page = 1,
        limit = 20,
        actor_id,
        level,
        domain,
        action
    } = req.query;

    const filters = {
        domain: domainOverride || domain,
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
};

const getAllLogs = asyncHandler(async (req, res) => {
    return sendLogsResponse(req, res);
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
    return sendLogsResponse(req, res, 'USER');
});

const getUserAddressLogs = asyncHandler(async (req, res) => {
    return sendLogsResponse(req, res, 'USER_ADDRESS');
});

const getCategoryLogs = asyncHandler(async (req, res) => {
    return sendLogsResponse(req, res, 'CATEGORY');
});

const getAuthLogs = asyncHandler(async (req, res) => {
    return sendLogsResponse(req, res, 'AUTH');
});

const getPaymentLogs = asyncHandler(async (req, res) => {
    return sendLogsResponse(req, res, 'PAYMENT');
});

module.exports = {
    getAllLogs,
    getLogById,
    getUserLogs,
    getUserAddressLogs,
    getCategoryLogs,
    getAuthLogs,
    getPaymentLogs
};
