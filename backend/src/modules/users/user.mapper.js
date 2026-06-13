class UserMapper {

    static toUpdatePayload(data) {
        const update = {};

        if (data.name !== undefined) {
            update["profile.full_name"] = data.name;
        }

        if (data.avatar !== undefined) {
            update["profile.avatar_url"] = data.avatar;
        }

        if (data.email !== undefined) {
            update.email = data.email || null;
        }

        if (data.gender !== undefined) {
            update["profile.gender"] = data.gender;
        }

        return update;
    }

    static toResponseDTO(user) {
        if (!user) return null;

        const doc = user.toObject ? user.toObject() : user;

        return {
            id: doc._id?.toString(),
            email: doc.email || null,
            profile: {
                full_name: doc.profile?.full_name || null,
                avatar_url: doc.profile?.avatar_url || null,
                phone_number: doc.profile?.phone_number || null,
                gender: doc.profile?.gender || 'UNSPECIFIED',
            },
            roles: doc.roles || [],
            tier: doc.tier || null,
            status: doc.status,
            is_email_verified: doc.is_email_verified,
            email_verified_at: doc.email_verified_at,
            is_phone_verified: doc.is_phone_verified,
            phone_verified_at: doc.phone_verified_at,
            last_login_at: doc.last_login_at,
            created_at: doc.created_at,
            updated_at: doc.updated_at,
        };
    }

    static toResponseDTOList(users) {
        return users.map((user) => this.toResponseDTO(user));
    }
}

module.exports = UserMapper;
