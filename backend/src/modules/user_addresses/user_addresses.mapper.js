// filepath: c:\MyEffort\NguyenLien\backend\src\modules\user_addresses\user_addresses.mapper.js
class UserAddressMapper {
    static toResponseDTO(address) {
        return {
            id: address._id.toString(),
            user_id: address.user_id.toString(),
            receiver_name: address.receiver_name,
            phone: address.phone,
            address_line_1: address.address_line_1,
            address_line_2: address.address_line_2,
            city: address.city,
            district: address.district,
            ward: address.ward,
            is_default: address.is_default,
            created_at: address.created_at,
            updated_at: address.updated_at,
        };
    }
}

module.exports = UserAddressMapper;