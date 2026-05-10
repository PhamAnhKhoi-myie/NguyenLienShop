const UserAuditLog = require('./user_audit_log/user_audit_log.model');
const AppError = require('../../utils/appError.util');

class AuditLogService {

    static async getAllLogs({ action, actor_id, page = 1, limit = 20 }) {
        const filter = {};

        if (action) filter.action = action;
        if (actor_id) filter.actor_id = actor_id;

        const skip = (page - 1) * limit;

        let allLogs = [];

        for (const domain of DOMAIN_MODELS) {
            const logs = await domain.model.find(filter).lean();

            allLogs.push(
                ...logs.map(l => ({
                    ...l,
                    domain: domain.name
                }))
            );
        }

        // sort
        allLogs.sort((a, b) =>
            new Date(b.created_at) - new Date(a.created_at)
        );

        const total = allLogs.length;

        const paginated = allLogs.slice(skip, skip + limit);

        return {
            data: paginated,
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