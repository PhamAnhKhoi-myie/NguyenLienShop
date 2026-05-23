const fs = require("fs");
const path = require("path");

const swaggerSpec = require("../../docs/swagger");

const docsRoot = path.resolve(__dirname, "../../docs");

const httpMethods = new Set([
    "get",
    "put",
    "post",
    "delete",
    "options",
    "head",
    "patch",
    "trace",
]);

const listDocModules = (relativeDir, suffix) =>
    fs
        .readdirSync(path.join(docsRoot, relativeDir))
        .filter((fileName) => fileName.endsWith(suffix))
        .sort()
        .map((fileName) => ({
            fileName,
            name: fileName.slice(0, -suffix.length),
            absolutePath: path.join(docsRoot, relativeDir, fileName),
            exports: require(path.join(docsRoot, relativeDir, fileName)),
        }));

const getOperations = () =>
    Object.entries(swaggerSpec.paths).flatMap(([pathKey, pathItem]) =>
        Object.entries(pathItem)
            .filter(([method]) => httpMethods.has(method))
            .map(([method, operation]) => ({
                method,
                pathKey,
                pathItem,
                operation,
            }))
    );

const collectRefs = (value, refs = []) => {
    if (Array.isArray(value)) {
        value.forEach((item) => collectRefs(item, refs));
        return refs;
    }

    if (value && typeof value === "object") {
        if (typeof value.$ref === "string") {
            refs.push(value.$ref);
        }

        Object.values(value).forEach((item) => collectRefs(item, refs));
    }

    return refs;
};

const resolveLocalRef = (root, ref) =>
    ref
        .slice(2)
        .split("/")
        .reduce(
            (target, part) =>
                target?.[part.replace(/~1/g, "/").replace(/~0/g, "~")],
            root
        );

module.exports = {
    collectRefs,
    getOperations,
    listDocModules,
    resolveLocalRef,
    swaggerSpec,
};
