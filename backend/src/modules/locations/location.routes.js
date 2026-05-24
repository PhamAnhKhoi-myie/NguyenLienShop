const express = require('express');
const validate = require('../../middlewares/validate.middleware');
const {
    getProvinces,
    getWardsByProvinceCode,
} = require('./location.controller');
const {
    getLocationsQuerySchema,
    provinceCodeParamSchema,
} = require('./location.validator');

const router = express.Router();

router.get(
    '/provinces',
    validate({ query: getLocationsQuerySchema }),
    getProvinces
);

router.get(
    '/provinces/:provinceCode/wards',
    validate({
        params: provinceCodeParamSchema,
        query: getLocationsQuerySchema,
    }),
    getWardsByProvinceCode
);

module.exports = router;
