const objectIdPattern = "^[a-fA-F0-9]{24}$";
const announcementTargetEnum = ["all", "user", "admin", "guest"];
const announcementTypeEnum = ["info", "warning", "promotion", "system", "urgent"];

const announcementIdParam = {
    name: "id",
    in: "path",
    required: true,
    schema: { type: "string", pattern: objectIdPattern },
    description: "Announcement ID.",
};

const targetQuery = {
    name: "target",
    in: "query",
    schema: { type: "string", enum: announcementTargetEnum },
    description: "Optional audience filter. Without this, only announcements for all visitors are returned.",
};

const typeQuery = {
    name: "type",
    in: "query",
    schema: { type: "string", enum: announcementTypeEnum },
    description: "Optional announcement type filter.",
};

const activeOnlyQuery = {
    name: "activeOnly",
    in: "query",
    schema: { type: "boolean", default: false },
    description: "When true, returns only announcements active at the current time.",
};

const jsonBody = (schemaRef) => ({
    required: true,
    content: {
        "application/json": {
            schema: { $ref: schemaRef },
        },
    },
});

const ok = (schemaRef) => ({
    description: "OK",
    content: {
        "application/json": {
            schema: { $ref: schemaRef },
        },
    },
});

module.exports = {
    "/announcements": {
        get: {
            tags: ["Announcements"],
            summary: "Get active announcements",
            security: [],
            description: "Returns active announcements sorted by priority descending and start_at descending. Authentication is optional for audience-specific results.",
            parameters: [targetQuery],
            responses: {
                200: ok("#/components/schemas/AnnouncementsListResponse"),
                403: { $ref: "#/components/responses/Forbidden" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
        post: {
            tags: ["Announcements"],
            summary: "Create announcement",
            security: [{ bearerAuth: [] }],
            requestBody: jsonBody("#/components/schemas/CreateAnnouncementInput"),
            responses: {
                201: {
                    description: "Created",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/AnnouncementResponse" },
                        },
                    },
                },
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/announcements/admin/all": {
        get: {
            tags: ["Announcements"],
            summary: "Get all announcements",
            security: [{ bearerAuth: [] }],
            parameters: [targetQuery, typeQuery, activeOnlyQuery],
            responses: {
                200: ok("#/components/schemas/AnnouncementsListResponse"),
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/announcements/admin/scheduled": {
        get: {
            tags: ["Announcements"],
            summary: "Get scheduled announcements",
            security: [{ bearerAuth: [] }],
            description: "Returns non-deleted announcements whose start_at is in the future.",
            responses: {
                200: ok("#/components/schemas/AnnouncementsListResponse"),
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/announcements/admin/expired": {
        get: {
            tags: ["Announcements"],
            summary: "Get expired announcements",
            security: [{ bearerAuth: [] }],
            description: "Returns non-deleted announcements whose end_at is in the past.",
            responses: {
                200: ok("#/components/schemas/AnnouncementsListResponse"),
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/announcements/admin/deleted": {
        get: {
            tags: ["Announcements"],
            summary: "Get deleted announcements",
            security: [{ bearerAuth: [] }],
            responses: {
                200: ok("#/components/schemas/AnnouncementsListResponse"),
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/announcements/{id}": {
        get: {
            tags: ["Announcements"],
            summary: "Get announcement by ID",
            security: [],
            description: "Returns the announcement when the optional authenticated user can view it.",
            parameters: [announcementIdParam],
            responses: {
                200: ok("#/components/schemas/AnnouncementResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
        put: {
            tags: ["Announcements"],
            summary: "Update announcement",
            security: [{ bearerAuth: [] }],
            parameters: [announcementIdParam],
            requestBody: jsonBody("#/components/schemas/UpdateAnnouncementInput"),
            responses: {
                200: ok("#/components/schemas/AnnouncementResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
        delete: {
            tags: ["Announcements"],
            summary: "Soft delete announcement",
            security: [{ bearerAuth: [] }],
            parameters: [announcementIdParam],
            responses: {
                200: ok("#/components/schemas/AnnouncementMessageResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/announcements/{id}/restore": {
        post: {
            tags: ["Announcements"],
            summary: "Restore deleted announcement",
            security: [{ bearerAuth: [] }],
            parameters: [announcementIdParam],
            responses: {
                200: ok("#/components/schemas/AnnouncementRestoreResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },
};
