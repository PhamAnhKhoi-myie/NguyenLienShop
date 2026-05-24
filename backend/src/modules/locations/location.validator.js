const { z } = require('zod');

const booleanQuerySchema = z.preprocess((value) => {
    if (value === undefined) {
        return false;
    }

    if (value === true || value === 'true') {
        return true;
    }

    if (value === false || value === 'false') {
        return false;
    }

    return value;
}, z.boolean());

const getLocationsQuerySchema = z.object({
    include_inactive: booleanQuerySchema.default(false),
}).strict();

const provinceCodeParamSchema = z.object({
    provinceCode: z.string().regex(/^\d{2}$/, 'Invalid province code'),
}).strict();

module.exports = {
    getLocationsQuerySchema,
    provinceCodeParamSchema,
};
