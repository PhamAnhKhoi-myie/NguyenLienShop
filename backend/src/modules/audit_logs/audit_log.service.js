const UserAuditLog = require('./user_audit_log/user_audit_log.model');
const AppError = require('../../utils/appError.util');

const DOMAIN_MODELS = [
    { name: 'USER', model: UserAuditLog },
];

class AuditLogService {

    static async getAllLogs({ domain, action, level, actor_id, page = 1, limit = 20 }) {

        const ALLOWED_LEVELS = ['INFO', 'IMPORTANT', 'SECURITY'];

        if (level && !ALLOWED_LEVELS.includes(level)) {
            throw new AppError('Invalid level', 400, 'INVALID_LEVEL');
        }

        const skip = (page - 1) * limit;

        let allLogs = [];
        let total = 0;

        const domains = domain
            ? DOMAIN_MODELS.filter(d => d.name === domain)
            : DOMAIN_MODELS;

        for (const d of domains) {
            const filter = {};

            if (action) filter.action = action;
            if (actor_id) filter.actor_id = actor_id;
            if (level) filter.level = level;

            const logs = await d.model
                .find(filter)
                .sort({ created_at: -1 })
                .skip(skip)
                .limit(limit)
                .lean();

            const count = await d.model.countDocuments(filter);

            total += count;

            allLogs.push(
                ...logs.map(l => ({
                    ...l,
                    domain: d.name
                }))
            );
        }

        return {
            data: allLogs, // ❗ KHÔNG slice nữa
            pagination: {
                current_page: page,
                total_pages: Math.ceil(total / limit),
                total_items: total,
                per_page: limit,
            },
        };
    }

    static async getLogById(id) {
        const log = await UserAuditLog.findById(id);
        if (!log) {
            throw new AppError('Log not found', 404, 'LOG_NOT_FOUND');
        }

        return { ...log.toObject(), domain: 'USER' };
    }
}

module.exports = AuditLogService;