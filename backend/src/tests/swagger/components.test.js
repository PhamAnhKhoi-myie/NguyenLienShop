const responses = require("../../docs/components/responses");
const schemasIndex = require("../../docs/components/schemas");
const securitySchemes = require("../../docs/components/securitySchemes");

const {
    collectRefs,
    listDocModules,
    resolveLocalRef,
    swaggerSpec,
} = require("./helpers");

describe("swagger components", () => {
    it("loads security schemes and reusable responses", () => {
        expect(swaggerSpec.components.securitySchemes).toBe(securitySchemes);
        expect(swaggerSpec.components.responses).toBe(responses);
        expect(swaggerSpec.components.securitySchemes.bearerAuth).toBeDefined();
        expect(swaggerSpec.components.responses.BadRequest).toBeDefined();
    });

    it("loads the split schema index", () => {
        expect(swaggerSpec.components.schemas).toBe(schemasIndex);
        expect(swaggerSpec.components.schemas.ErrorResponse).toBeDefined();
    });

    it("loads every schema module through the schema index", () => {
        const schemaModules = listDocModules("components/schemas", ".schema.js");

        schemaModules.forEach((schemaModule) => {
            expect(Object.keys(schemaModule.exports).length).toBeGreaterThan(0);

            Object.entries(schemaModule.exports).forEach(([schemaName, schema]) => {
                expect(swaggerSpec.components.schemas[schemaName]).toBe(schema);
            });
        });
    });

    it("does not duplicate schema names across schema modules", () => {
        const schemaModules = listDocModules("components/schemas", ".schema.js");
        const seen = new Map();
        const duplicates = [];

        schemaModules.forEach((schemaModule) => {
            Object.keys(schemaModule.exports).forEach((schemaName) => {
                if (seen.has(schemaName)) {
                    duplicates.push(
                        `${schemaName}: ${seen.get(schemaName)} + ${schemaModule.fileName}`
                    );
                    return;
                }

                seen.set(schemaName, schemaModule.fileName);
            });
        });

        expect(duplicates).toEqual([]);
    });

    it("resolves every local component reference", () => {
        const unresolvedRefs = [
            ...new Set(
                collectRefs(swaggerSpec)
                    .filter((ref) => ref.startsWith("#/"))
                    .filter((ref) => resolveLocalRef(swaggerSpec, ref) === undefined)
            ),
        ];

        expect(unresolvedRefs).toEqual([]);
    });
});
