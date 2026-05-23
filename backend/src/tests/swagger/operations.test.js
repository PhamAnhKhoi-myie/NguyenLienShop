const { getOperations } = require("./helpers");

describe("swagger operations", () => {
    const operations = getOperations();

    it("defines at least one operation", () => {
        expect(operations.length).toBeGreaterThan(0);
    });

    it.each(
        operations.map(({ method, pathKey, operation }) => [
            method.toUpperCase(),
            pathKey,
            operation,
        ])
    )("%s %s has tags and responses", (method, pathKey, operation) => {
        expect(Array.isArray(operation.tags)).toBe(true);
        expect(operation.tags.length).toBeGreaterThan(0);
        expect(operation.responses).toEqual(expect.any(Object));
        expect(Object.keys(operation.responses).length).toBeGreaterThan(0);
    });

    it.each(
        operations.map(({ method, pathKey, pathItem, operation }) => [
            method.toUpperCase(),
            pathKey,
            pathItem,
            operation,
        ])
    )("%s %s documents path parameters", (method, pathKey, pathItem, operation) => {
        const templateParams = [...pathKey.matchAll(/\{([^}]+)\}/g)].map(
            (match) => match[1]
        );

        const documentedParams = [
            ...(Array.isArray(pathItem.parameters) ? pathItem.parameters : []),
            ...(Array.isArray(operation.parameters) ? operation.parameters : []),
        ]
            .filter((parameter) => parameter.in === "path")
            .map((parameter) => parameter.name);

        expect(documentedParams).toEqual(expect.arrayContaining(templateParams));
    });
});
