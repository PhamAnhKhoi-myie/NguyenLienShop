const asyncHandler = require('../../utils/asyncHandler.util');
const AuditLogService = require('./audit_log.service');
const { validateObjectId } = require('../../utils/validator.util');
const AppError = require('../../utils/appError.util');

const getAllLogs = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;

    const actor_id = req.query.actor_id;
    const level = req.query.level;
    const domain = req.query.domain;

    // validate actor_id
    if (actor_id && !validateObjectId(actor_id)) {
        throw new AppError('Invalid actor_id', 400, 'INVALID_ID');
    }

    // validate level
    const ALLOWED_LEVELS = ['INFO', 'IMPORTANT', 'SECURITY'];
    if (level && !ALLOWED_LEVELS.includes(level)) {
        throw new AppError('Invalid level', 400, 'INVALID_LEVEL');
    }

    // validate domain
    const ALLOWED_DOMAINS = ['USER'];
    if (domain && !ALLOWED_DOMAINS.includes(domain)) {
        throw new AppError('Invalid domain', 400, 'INVALID_DOMAIN');
    }

    const filters = {
        domain,
        action: req.query.action || undefined,
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
    validateObjectId(req.params.id);

    const log = await AuditLogService.getLogById(req.params.id);

    return res.status(200).json({
        success: true,
        data: log,
    });
});

const getUserLogs = asyncHandler(async (req, res) => {
    req.query.domain = 'USER';

    return getAllLogs(req, res);
});

module.exports = {
    getAllLogs,
    getLogById,
    getUserLogs
};