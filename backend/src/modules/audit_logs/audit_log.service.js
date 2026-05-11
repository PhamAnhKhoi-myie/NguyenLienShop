const UserAuditLog = require('./user_audit_log/user_audit_log.model');
const UserAddressAuditLog = require('./user_address_audit_log/user_address_log.model');
const CategoryAuditLog = require('./category_audit_log/category_log.model');
const AuthAuditLog = require('./auth_audit_log/auth_log.model');

const AppError = require('../../utils/appError.util');

const DOMAIN_MODELS = [
    { name: 'USER', model: UserAuditLog },
    { name: 'USER_ADDRESS', model: UserAddressAuditLog },
    { name: 'AUTH', model: AuthAuditLog },
    { name: 'CATEGORY', model: CategoryAuditLog }
];

const DOMAIN_ACTION_MAP = {
    USER: [
        'UPDATE_USER_PROFILE',
        'UPDATE_USER_ROLES',
        'UPDATE_USER_STATUS',
        'DELETE_USER_SOFT'
    ],
    USER_ADDRESS: [
        'CREATE_USER_ADDRESS',
        'UPDATE_USER_ADDRESS',
        'DELETE_USER_ADDRESS',
        'SET_DEFAULT_USER_ADDRESS'
    ],
    AUTH: [
        'AUTH_LOGIN',
        'AUTH_CHANGE_PASSWORD',
        'AUTH_FORGOT_PASSWORD',
        'AUTH_RESET_PASSWORD',
        'AUTH_REGISTER'
    ],
    CATEGORY: [
        'CREATE_CATEGORY',
        'UPDATE_CATEGORY',
        'DELETE_CATEGORY_SOFT',
        'DELETE_CATEGORY_HARD',
        'RESTORE_CATEGORY'
    ]
};

class AuditLogService {
    static async getAllLogs({ domain, action, level, actor_id, page = 1, limit = 20 }) {

        const skip = (page - 1) * limit;

        const MAX_FETCH = 5000;

        let allLogs = [];
        let total = 0;

        const domains = domain
            ? DOMAIN_MODELS.filter(d => d.name === domain)
            : DOMAIN_MODELS;

        const fetchLimit = Math.min(skip + limit, MAX_FETCH);

        for (const d of domains) {
            const filter = {};

            if (action) {
                filter.action = action;
            }
            if (actor_id) filter.actor_id = actor_id;
            if (level) filter.level = level;

            const [logs, count] = await Promise.all([
                d.model.find(filter)
                    .sort({ created_at: -1 })
                    .limit(fetchLimit)
                    .lean(),
                d.model.countDocuments(filter)
            ]);

            total += count;

            allLogs.push(
                ...logs.map(l => ({
                    ...l,
                    domain: d.name
                }))
            );
        }

        if (skip >= MAX_FETCH) {
            return {
                data: [],
                pagination: {
                    current_page: page,
                    total_pages: Math.ceil(total / limit),
                    total_items: total,
                    per_page: limit,
                },
            };
        }

        // sort global (1 lần duy nhất)
        allLogs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        const paginatedLogs = allLogs.slice(skip, skip + limit);

        return {
            data: paginatedLogs,
            pagination: {
                current_page: page,
                total_pages: Math.ceil(total / limit),
                total_items: total,
                per_page: limit,
            },
        };
    }

    static async getLogById(id) {
        const results = await Promise.all(
            DOMAIN_MODELS.map(d =>
                d.model.findById(id).lean().then(log => log && { ...log, domain: d.name })
            )
        );

        const found = results.find(Boolean);
        if (found) return found;

        throw new AppError('Log not found', 404, 'LOG_NOT_FOUND');
    }
}

module.exports = {
    AuditLogService,
    DOMAIN_MODELS,
    DOMAIN_ACTION_MAP
};