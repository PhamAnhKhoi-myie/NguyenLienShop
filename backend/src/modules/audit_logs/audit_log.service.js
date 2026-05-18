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
        const domainConfig = DOMAIN_MODELS.find(d => d.name === domain);

        if (!domainConfig) {
            throw new AppError(
                'Audit log domain is required',
                400,
                'AUDIT_DOMAIN_REQUIRED'
            );
        }

        const filter = {};

        if (action) {
            filter.action = action;
        }
        if (actor_id) filter.actor_id = actor_id;
        if (level) filter.level = level;

        const [logs, total] = await Promise.all([
            domainConfig.model.find(filter)
                .sort({ created_at: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            domainConfig.model.countDocuments(filter)
        ]);

        const data = logs.map(log => ({
            ...log,
            domain: domainConfig.name
        }));

        return {
            data,
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
