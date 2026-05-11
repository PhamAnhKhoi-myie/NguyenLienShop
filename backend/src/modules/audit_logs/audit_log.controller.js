const asyncHandler = require('../../utils/asyncHandler.util');
const { AuditLogService, DOMAIN_MODELS, DOMAIN_ACTION_MAP } = require('./audit_log.service');
const { validateObjectId } = require('../../utils/validator.util');
const AppError = require('../../utils/appError.util');
const { AUDIT_LEVELS, AUDIT_ACTIONS } = require('../../constants/audit');

const ALLOWED_DOMAINS = DOMAIN_MODELS.map(d => d.name);

const getAllLogs = asyncHandler(async (req, res) => {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limitRaw = parseInt(req.query.limit, 10) || 20;
    const limit = Math.min(Math.max(limitRaw, 1), 100);
    const actor_id = req.query.actor_id?.trim() || undefined;
    const level = req.query.level?.trim() || undefined;
    const domain = req.query.domain?.trim() || undefined;
    const action = req.query.action?.trim() || undefined;

    if (actor_id && !validateObjectId(actor_id)) {
        throw new AppError('Invalid actor_id', 400, 'INVALID_ID');
    }

    if (level && !AUDIT_LEVELS.includes(level)) {
        throw new AppError('Invalid level', 400, 'INVALID_LEVEL');
    }

    if (domain && !ALLOWED_DOMAINS.includes(domain)) {
        throw new AppError('Invalid domain', 400, 'INVALID_DOMAIN');
    }

    if (action && !Object.values(AUDIT_ACTIONS).includes(action)) {
        throw new AppError('Invalid action', 400, 'INVALID_ACTION');
    }

    if (domain && action && !DOMAIN_ACTION_MAP[domain]?.includes(action)) {
        throw new AppError('Action not valid for this domain', 400, 'INVALID_ACTION_FOR_DOMAIN');
    }

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
    validateObjectId(req.params.id);

    const log = await AuditLogService.getLogById(req.params.id);

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