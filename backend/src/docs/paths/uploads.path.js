const jsonBody = (schemaRef) => ({
    required: true,
    content: {
        "application/json": {
            schema: { $ref: schemaRef },
        },
    },
});

module.exports = {
    "/uploads/cloudinary/signature": {
        post: {
            tags: ["Uploads"],
            summary: "Create Cloudinary upload signature",
            security: [{ bearerAuth: [] }],
            description: "Admin/Manager only. Returns signed parameters for direct client-side image upload to Cloudinary.",
            requestBody: jsonBody("#/components/schemas/CloudinarySignatureInput"),
            responses: {
                201: {
                    description: "Created",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/CloudinarySignatureResponse" },
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
};
