class LocationMapper {
    static toProvinceDTO(province) {
        if (!province) {
            return null;
        }

        return {
            code: province.code,
            name: province.name,
            type: province.type,
        };
    }

    static toWardDTO(ward) {
        if (!ward) {
            return null;
        }

        return {
            code: ward.code,
            name: ward.name,
            type: ward.type,
            province_code: ward.province_code,
            province_name: ward.province_name,
        };
    }
}

module.exports = LocationMapper;
