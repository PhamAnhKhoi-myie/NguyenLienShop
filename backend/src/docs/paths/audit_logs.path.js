const { AUDIT_ACTIONS, AUDIT_LEVELS, ENTITY_TYPES } = require("../../constants/audit");

const objectIdPattern = "^[a-fA-F0-9]{24}$";
const auditDomainEnum = Object.values(ENTITY_TYPES);
const auditActionEnum = Object.values(AUDIT_ACTIONS);

const auditLogIdParam = {
    name: "id",
    in: "path",
    required: true,
    schema: { type: "string", pattern: objectIdPattern },
    description: "Audit log ID.",
};

const baseQueryParams = [
    {
        name: "page",
        in: "query",
        schema: { type: "integer", minimum: 1, default: 1 },
    },
    {
        name: "limit",
        in: "query",
        schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
    },
    {
        name: "action",
        in: "query",
        schema: { type: "string", enum: auditActionEnum },
        description: "Must be valid for the selected or fixed domain.",
    },
    {
        name: "level",
        in: "query",
        schema: { type: "string", enum: AUDIT_LEVELS },
    },
    {
        name: "actor_id",
        in: "query",
        schema: { type: "string", pattern: objectIdPattern },
    },
    {
        name: "user_id",
        in: "query",
        schema: { type: "string", pattern: objectIdPattern },
    },
    {
        name: "order_id",
        in: "query",
        schema: { type: "string", pattern: objectIdPattern },
    },
    {
        name: "target_type",
        in: "query",
        schema: { type: "string" },
    },
    {
        name: "target_id",
        in: "query",
        schema: { type: "string", pattern: objectIdPattern },
    },
];

const allLogsQueryParams = [
    ...baseQueryParams,
    {
        name: "domain",
        in: "query",
        schema: { type: "string", enum: auditDomainEnum },
    },
];

const ok = (schemaRef) => ({
    description: "OK",
    content: {
        "application/json": {
            schema: { $ref: schemaRef },
        },
    },
});

const listResponses = {
    200: ok("#/components/schemas/AuditLogsListResponse"),
    400: { $ref: "#/components/responses/BadRequest" },
    401: { $ref: "#/components/responses/Unauthorized" },
    403: { $ref: "#/components/responses/Forbidden" },
    500: { $ref: "#/components/responses/InternalError" },
};

const domainPath = (summary, domain) => ({
    get: {
        tags: ["Audit Logs"],
        summary,
        security: [{ bearerAuth: [] }],
        description: `Admin only. Returns audit logs for the ${domain} domain.`,
        parameters: baseQueryParams,
        responses: listResponses,
    },
});

module.exports = {
    "/audit-logs/users": domainPath("Get user audit logs", "USER"),
    "/audit-logs/user-addresses": domainPath("Get user address audit logs", "USER_ADDRESS"),
    "/audit-logs/categories": domainPath("Get category audit logs", "CATEGORY"),
    "/audit-logs/auth": domainPath("Get auth audit logs", "AUTH"),
    "/audit-logs/payments": domainPath("Get payment audit logs", "PAYMENT"),
    "/audit-logs/orders": domainPath("Get order audit logs", "ORDER"),
    "/audit-logs/shipments": domainPath("Get shipment audit logs", "SHIPMENT"),
    "/audit-logs/products": domainPath("Get product audit logs", "PRODUCT"),
    "/audit-logs/discounts": domainPath("Get discount audit logs", "DISCOUNT"),
    "/audit-logs/reviews": domainPath("Get review audit logs", "REVIEW"),
    "/audit-logs/shop-content": domainPath("Get shop content audit logs", "SHOP_CONTENT"),
    "/audit-logs/carts": domainPath("Get cart audit logs", "CART"),
    "/audit-logs/notifications": domainPath("Get notification audit logs", "NOTIFICATION"),
    "/audit-logs/emails": domainPath("Get email audit logs", "EMAIL"),

    "/audit-logs": {
        get: {
            tags: ["Audit Logs"],
            summary: "Get all audit logs",
            security: [{ bearerAuth: [] }],
            description: "Admin only. Supports optional domain and action filters.",
            parameters: allLogsQueryParams,
            responses: listResponses,
        },
    },

    "/audit-logs/{id}": {
        get: {
            tags: ["Audit Logs"],
            summary: "Get audit log by ID",
            security: [{ bearerAuth: [] }],
            parameters: [auditLogIdParam],
            responses: {
                200: ok("#/components/schemas/AuditLogResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },
};
