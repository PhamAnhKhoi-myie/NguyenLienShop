const LocationProvince = require('./location_province.model');
const LocationWard = require('./location_ward.model');
const LocationMapper = require('./location.mapper');
const AppError = require('../../utils/appError.util');

class LocationService {
    static getActiveFilter(includeInactive = false) {
        return includeInactive ? {} : { is_active: true };
    }

    static async getProvinces(filters = {}) {
        const provinces = await LocationProvince.find(
            this.getActiveFilter(filters.include_inactive)
        )
            .sort({ display_order: 1, name: 1 })
            .select('code name type')
            .lean();

        return provinces.map(LocationMapper.toProvinceDTO);
    }

    static async getWardsByProvinceCode(provinceCode, filters = {}) {
        const province = await LocationProvince.findOne({
            code: provinceCode,
            ...this.getActiveFilter(filters.include_inactive),
        })
            .select('code')
            .lean();

        if (!province) {
            throw new AppError(
                'Province not found',
                404,
                'PROVINCE_NOT_FOUND'
            );
        }

        const wards = await LocationWard.find({
            province_code: provinceCode,
            ...this.getActiveFilter(filters.include_inactive),
        })
            .sort({ display_order: 1, name: 1 })
            .select('code name type province_code province_name')
            .lean();

        return wards.map(LocationMapper.toWardDTO);
    }
}

module.exports = LocationService;
