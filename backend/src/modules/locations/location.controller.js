const asyncHandler = require('../../utils/asyncHandler.util');
const LocationService = require('./location.service');

const getProvinces = asyncHandler(async (req, res) => {
    const provinces = await LocationService.getProvinces(req.query);

    res.status(200).json({
        success: true,
        data: provinces,
    });
});

const getWardsByProvinceCode = asyncHandler(async (req, res) => {
    const wards = await LocationService.getWardsByProvinceCode(
        req.params.provinceCode,
        req.query
    );

    res.status(200).json({
        success: true,
        data: wards,
    });
});

module.exports = {
    getProvinces,
    getWardsByProvinceCode,
};
