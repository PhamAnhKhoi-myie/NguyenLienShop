class UserAddressMapper {
    static toResponseDTO(address) {
        return {
            id: address._id.toString(),
            user_id: address.user_id.toString(),
            receiver_name: address.receiver_name,
            phone: address.phone,
            province_code: address.province_code,
            province_name: address.province_name,
            ward_code: address.ward_code,
            ward_name: address.ward_name,
            detail: address.detail,
            full_address: address.full_address,
            note: address.note || null,
            is_default: address.is_default,
            created_at: address.created_at,
            updated_at: address.updated_at,
        };
    }
}

module.exports = UserAddressMapper;
