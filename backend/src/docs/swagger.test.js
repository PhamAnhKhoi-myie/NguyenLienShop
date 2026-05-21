const swaggerSpec = require("./swagger");

describe("swaggerSpec", () => {
    it("defines OpenAPI metadata", () => {
        expect(swaggerSpec.openapi).toBe("3.0.0");
        expect(swaggerSpec.info.title).toBe("NguyenLien API");
        expect(swaggerSpec.servers).toEqual([
            {
                url: "http://localhost:5000/api/v1",
                description: "Local API",
            },
        ]);
    });

    it("loads components and paths from split files", () => {
        expect(swaggerSpec.components.securitySchemes.bearerAuth).toBeDefined();
        expect(swaggerSpec.components.responses.BadRequest).toBeDefined();
        expect(swaggerSpec.components.schemas.ErrorResponse).toBeDefined();
        expect(Object.keys(swaggerSpec.paths).length).toBeGreaterThan(0);
    });

    it("does not duplicate /api/v1 inside path keys", () => {
        const invalidPath = Object.keys(swaggerSpec.paths).find((path) =>
            path.startsWith("/api/v1")
        );

        expect(invalidPath).toBeUndefined();
    });
});
