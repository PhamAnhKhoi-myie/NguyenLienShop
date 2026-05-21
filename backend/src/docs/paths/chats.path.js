const jsonBody = (schemaRef, required = true) => ({
    required,
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
    "/chats/sessions": {
        post: {
            tags: ["Chats"],
            summary: "Create chat session",
            security: [{ bearerAuth: [] }],
            requestBody: jsonBody("#/components/schemas/CreateChatSessionInput", false),
            responses: {
                201: {
                    description: "Created",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/ChatSessionResponse" },
                        },
                    },
                },
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/chats/message": {
        post: {
            tags: ["Chats"],
            summary: "Send message to AI assistant",
            security: [{ bearerAuth: [] }],
            description: "Rate limited to 20 messages per authenticated user per minute.",
            requestBody: jsonBody("#/components/schemas/SendChatMessageInput"),
            responses: {
                200: ok("#/components/schemas/ChatMessageResponse"),
                400: { $ref: "#/components/responses/BadRequest" },
                401: { $ref: "#/components/responses/Unauthorized" },
                404: { $ref: "#/components/responses/NotFound" },
                429: { $ref: "#/components/responses/TooManyRequests" },
                503: {
                    description: "AI service unavailable or timed out.",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/ErrorResponse" },
                        },
                    },
                },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },
};
