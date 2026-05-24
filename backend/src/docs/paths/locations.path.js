const includeInactiveQuery = {
    in: "query",
    name: "include_inactive",
    schema: {
        type: "boolean",
        default: false,
    },
};

const provinceCodeParam = {
    in: "path",
    name: "provinceCode",
    required: true,
    schema: {
        type: "string",
        pattern: "^\\d{2}$",
    },
    example: "79",
};

module.exports = {
    "/locations/provinces": {
        get: {
            tags: ["Locations"],
            summary: "Get Vietnam provinces and centrally governed cities",
            security: [],
            parameters: [includeInactiveQuery],
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/LocationProvinceListResponse" },
                        },
                    },
                },
                400: { $ref: "#/components/responses/BadRequest" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },

    "/locations/provinces/{provinceCode}/wards": {
        get: {
            tags: ["Locations"],
            summary: "Get wards, communes, and special zones by province code",
            security: [],
            parameters: [provinceCodeParam, includeInactiveQuery],
            responses: {
                200: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/LocationWardListResponse" },
                        },
                    },
                },
                400: { $ref: "#/components/responses/BadRequest" },
                404: { $ref: "#/components/responses/NotFound" },
                500: { $ref: "#/components/responses/InternalError" },
            },
        },
    },
};
