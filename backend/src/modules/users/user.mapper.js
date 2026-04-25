/**
 * User DTO Mapper
 * Transform external request DTOs to internal database format
 */
class UserMapper {
    /**
     * Map update request DTO to MongoDB update payload
     * @param {Object} data - Raw request body data
     * @returns {Object} MongoDB update payload with dot notation
     */
    static toUpdatePayload(data) {
        const update = {};

        // Map API field names to schema field names
        if (data.name !== undefined) {
            update["profile.full_name"] = data.name;
        }

        if (data.avatar !== undefined) {
            update["profile.avatar_url"] = data.avatar;
        }

        if (data.email !== undefined) {
            update.email = data.email;
        }

        if (data.phone !== undefined) {
            update["profile.phone_number"] = data.phone;
        }

        return update;
    }

    /**
     * Map database User document to API response
     * @param {Object} user - MongoDB user document
     * @returns {Object} Clean user DTO
     */
    static toResponseDTO(user) {
        if (!user) return null;

        const doc = user.toObject ? user.toObject() : user;

        return {
            id: doc._id?.toString(),
            email: doc.email,
            profile: {
                full_name: doc.profile?.full_name || null,
                avatar_url: doc.profile?.avatar_url || null,
                phone_number: doc.profile?.phone_number || null,
            },
            roles: doc.roles || [],
            status: doc.status,
            is_email_verified: doc.is_email_verified,
            email_verified_at: doc.email_verified_at,
            last_login_at: doc.last_login_at,
            created_at: doc.created_at,
            updated_at: doc.updated_at,
        };
    }

    /**
     * Map User document to paginated list response
     * @param {Array} users - Array of MongoDB user documents
     * @returns {Array} Array of clean user DTOs
     */
    static toResponseDTOList(users) {
        return users.map((user) => this.toResponseDTO(user));
    }
}

module.exports = UserMapper;