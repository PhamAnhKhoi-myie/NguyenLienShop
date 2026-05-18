const { z } = require('zod');
const { AUDIT_LEVELS, AUDIT_ACTIONS } = require('../../constants/audit');
const { DOMAIN_MODELS, DOMAIN_ACTION_MAP } = require('./audit_log.service');

const objectIdSchema = z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');

const idParamSchema = z.object({
    id: objectIdSchema,
});

const ALLOWED_DOMAINS = DOMAIN_MODELS.map(d => d.name);
const ALLOWED_ACTIONS = Object.values(AUDIT_ACTIONS);

const baseQuerySchema = {
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    actor_id: objectIdSchema.optional(),
    level: z.enum(AUDIT_LEVELS).optional(),
    domain: z.enum(ALLOWED_DOMAINS).optional(),
    action: z.enum(ALLOWED_ACTIONS).optional(),
};

const getAllLogsQuerySchema = z
    .object({
        ...baseQuerySchema,
        domain: z.enum(ALLOWED_DOMAINS),
    })
    .refine(
        (data) => {
            if (data.domain && data.action) {
                return DOMAIN_ACTION_MAP[data.domain]?.includes(data.action);
            }
            return true;
        },
        {
            message: 'INVALID_ACTION_FOR_DOMAIN',
            path: ['action'],
        }
    );

const createDomainLogsQuerySchema = (domain) => z
    .object({
        ...baseQuerySchema,
        domain: z.undefined().optional(),
    })
    .refine(
        (data) => {
            if (data.action) {
                return DOMAIN_ACTION_MAP[domain]?.includes(data.action);
            }
            return true;
        },
        {
            message: 'INVALID_ACTION_FOR_DOMAIN',
            path: ['action'],
        }
    );

const getUserLogsQuerySchema = createDomainLogsQuerySchema('USER');
const getUserAddressLogsQuerySchema = createDomainLogsQuerySchema('USER_ADDRESS');
const getCategoryLogsQuerySchema = createDomainLogsQuerySchema('CATEGORY');
const getAuthLogsQuerySchema = createDomainLogsQuerySchema('AUTH');
const getPaymentLogsQuerySchema = createDomainLogsQuerySchema('PAYMENT');

module.exports = {
    objectIdSchema,
    idParamSchema,
    getAllLogsQuerySchema,
    getUserLogsQuerySchema,
    getUserAddressLogsQuerySchema,
    getCategoryLogsQuerySchema,
    getAuthLogsQuerySchema,
    getPaymentLogsQuerySchema,
};
