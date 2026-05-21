const { AUDIT_ACTIONS, AUDIT_LEVELS, ENTITY_TYPES } = require("../../../constants/audit");

const objectIdPattern = "^[a-fA-F0-9]{24}$";
const auditDomainEnum = Object.values(ENTITY_TYPES);
const auditActionEnum = Object.values(AUDIT_ACTIONS);
const auditActorTypeEnum = ["USER", "ADMIN", "MANAGER", "SYSTEM", "GUEST", "INTERNAL"];

const objectId = (example) => ({
    type: "string",
    pattern: objectIdPattern,
    nullable: true,
    example: example || null,
});

module.exports = {
    AuditLog: {
        type: "object",
        required: ["_id", "domain", "action", "level", "changes", "created_at"],
        properties: {
            _id: {
                type: "string",
                pattern: objectIdPattern,
                example: "507f1f77bcf86cd799439011",
            },
            domain: {
                type: "string",
                enum: auditDomainEnum,
                example: "ORDER",
            },
            actor_id: objectId("507f1f77bcf86cd799439012"),
            actor_type: {
                type: "string",
                enum: auditActorTypeEnum,
                nullable: true,
                example: "ADMIN",
            },
            action: {
                type: "string",
                enum: auditActionEnum,
                example: "ADMIN_UPDATE_ORDER_STATUS",
            },
            level: {
                type: "string",
                enum: AUDIT_LEVELS,
                example: "IMPORTANT",
            },
            target_type: {
                type: "string",
                nullable: true,
                example: "ORDER",
            },
            target_id: objectId("507f1f77bcf86cd799439013"),
            user_id: objectId("507f1f77bcf86cd799439014"),
            order_id: objectId("507f1f77bcf86cd799439015"),
            payment_id: objectId(),
            shipment_id: objectId(),
            product_id: objectId(),
            variant_id: objectId(),
            unit_id: objectId(),
            cart_id: objectId(),
            category_id: objectId(),
            discount_id: objectId(),
            review_id: objectId(),
            notification_id: objectId(),
            notification_ids: {
                type: "array",
                items: { type: "string", pattern: objectIdPattern },
            },
            email_job_id: objectId(),
            address_id: objectId(),
            banner_id: objectId(),
            announcement_id: objectId(),
            shop_info_id: objectId(),
            source_cart_id: objectId(),
            source_discount_id: objectId(),
            order_code: { type: "string", nullable: true, example: "ORD-20260601-001" },
            status: { type: "string", nullable: true, example: "PROCESSING" },
            provider: { type: "string", nullable: true, example: "vnpay" },
            carrier: { type: "string", nullable: true, example: "GHN" },
            tracking_code: { type: "string", nullable: true, example: "GHN123456" },
            sku: { type: "string", nullable: true, example: "BAG-001" },
            discount_code: { type: "string", nullable: true, example: "SUMMER10" },
            session_key: { type: "string", nullable: true },
            source_session_key: { type: "string", nullable: true },
            template: { type: "string", nullable: true, example: "order_paid" },
            recipient_count: { type: "integer", minimum: 0, example: 1 },
            recipients: {
                type: "array",
                items: { type: "string" },
                example: ["user@example.com"],
            },
            notification_type: { type: "string", nullable: true, example: "order" },
            priority: { type: "string", nullable: true, example: "high" },
            moderation_status: { type: "string", nullable: true, example: "APPROVED" },
            display_name: { type: "string", nullable: true, example: "Order ORD-20260601-001" },
            public_status: { type: "string", nullable: true, example: "ACTIVE" },
            changes: {
                type: "object",
                additionalProperties: true,
                example: {
                    before: { status: "PENDING" },
                    after: { status: "PROCESSING" },
                },
            },
            metadata: {
                type: "object",
                additionalProperties: true,
                example: {},
            },
            ip_address: { type: "string", nullable: true, example: "127.0.0.1" },
            user_agent: { type: "string", nullable: true, example: "Mozilla/5.0" },
            created_at: {
                type: "string",
                format: "date-time",
            },
        },
    },

    AuditLogsPagination: {
        type: "object",
        required: ["current_page", "total_pages", "total_items", "per_page"],
        properties: {
            current_page: { type: "integer", minimum: 1, example: 1 },
            total_pages: { type: "integer", minimum: 0, example: 5 },
            total_items: { type: "integer", minimum: 0, example: 100 },
            per_page: { type: "integer", minimum: 1, maximum: 100, example: 20 },
        },
    },

    AuditLogsListResponse: {
        type: "object",
        required: ["success", "data", "pagination"],
        properties: {
            success: { type: "boolean", example: true },
            data: {
                type: "array",
                items: { $ref: "#/components/schemas/AuditLog" },
            },
            pagination: { $ref: "#/components/schemas/AuditLogsPagination" },
        },
    },

    AuditLogResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/AuditLog" },
        },
    },
};
