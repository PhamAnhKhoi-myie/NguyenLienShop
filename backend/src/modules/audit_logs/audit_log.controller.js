const asyncHandler = require('../../utils/asyncHandler.util');
const AuditLogService = require('./audit_log.service');
const { validateObjectId } = require('../../utils/validator.util');

/**
 * @desc    Lấy danh sách Audit Logs (Phân trang & Lọc)
 * @route   GET /api/v1/audit-logs
 * @access  Private/Admin
 */
const getAllLogs = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;

    const filters = {
        entity_type: req.query.entity_type || undefined,
        action: req.query.action || undefined,
        actor_id: req.query.actor_id && validateObjectId(req.query.actor_id)
            ? req.query.actor_id
            : undefined,
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

/**
 * @desc    Lấy chi tiết 1 Audit Log
 * @route   GET /api/v1/audit-logs/:id
 * @access  Private/Admin
 */
const getLogById = asyncHandler(async (req, res) => {
    validateObjectId(req.params.id);

    const log = await AuditLogService.getLogById(req.params.id);

    return res.status(200).json({
        success: true,
        data: log,
    });
});

module.exports = {
    getAllLogs,
    getLogById
};