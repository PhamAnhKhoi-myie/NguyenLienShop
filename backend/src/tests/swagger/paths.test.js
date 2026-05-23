const pathsIndex = require("../../docs/paths");

const { listDocModules, swaggerSpec } = require("./helpers");

describe("swagger paths", () => {
    it("loads the split path index", () => {
        expect(swaggerSpec.paths).toBe(pathsIndex);
        expect(Object.keys(swaggerSpec.paths).length).toBeGreaterThan(0);
    });

    it("loads every path module through the path index", () => {
        const pathModules = listDocModules("paths", ".path.js");

        pathModules.forEach((pathModule) => {
            expect(Object.keys(pathModule.exports).length).toBeGreaterThan(0);

            Object.entries(pathModule.exports).forEach(([pathKey, pathItem]) => {
                expect(swaggerSpec.paths[pathKey]).toBe(pathItem);
            });
        });
    });

    it("does not duplicate path keys across path modules", () => {
        const pathModules = listDocModules("paths", ".path.js");
        const seen = new Map();
        const duplicates = [];

        pathModules.forEach((pathModule) => {
            Object.keys(pathModule.exports).forEach((pathKey) => {
                if (seen.has(pathKey)) {
                    duplicates.push(
                        `${pathKey}: ${seen.get(pathKey)} + ${pathModule.fileName}`
                    );
                    return;
                }

                seen.set(pathKey, pathModule.fileName);
            });
        });

        expect(duplicates).toEqual([]);
    });

    it("keeps path keys relative to the API server URL", () => {
        Object.keys(swaggerSpec.paths).forEach((pathKey) => {
            expect(pathKey.startsWith("/")).toBe(true);
            expect(pathKey.startsWith("/api/v1")).toBe(false);
        });
    });
});
