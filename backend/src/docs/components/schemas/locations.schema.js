module.exports = {
    LocationProvince: {
        type: "object",
        required: ["code", "name", "type"],
        properties: {
            code: { type: "string", pattern: "^\\d{2}$", example: "79" },
            name: { type: "string", example: "Ho Chi Minh City" },
            type: { type: "string", enum: ["TINH", "THANH_PHO"], example: "THANH_PHO" },
        },
    },

    LocationWard: {
        type: "object",
        required: ["code", "name", "type", "province_code", "province_name"],
        properties: {
            code: { type: "string", pattern: "^\\d{5}$", example: "26734" },
            name: { type: "string", example: "Ben Thanh Ward" },
            type: { type: "string", enum: ["PHUONG", "XA", "DAC_KHU"], example: "PHUONG" },
            province_code: { type: "string", pattern: "^\\d{2}$", example: "79" },
            province_name: { type: "string", example: "Ho Chi Minh City" },
        },
    },

    LocationProvinceListResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: {
                type: "array",
                items: { $ref: "#/components/schemas/LocationProvince" },
            },
        },
    },

    LocationWardListResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            data: {
                type: "array",
                items: { $ref: "#/components/schemas/LocationWard" },
            },
        },
    },
};
