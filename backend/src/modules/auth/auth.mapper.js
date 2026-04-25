/**
 * Auth DTO Mapper
 * Transform auth-related data for API responses
 */
class AuthMapper {
    /**
     * Map login response
     * @param {Object} user - Mapped user DTO from UserMapper
     * @param {Object} tokens - Tokens object
     * @returns {Object} Clean login response DTO
     */
    static toLoginResponse(user, tokens) {
        return {
            accessToken: tokens.accessToken,
            user: {
                id: user.id,
                email: user.email,
                profile: user.profile, // Include profile if needed, or customize further
                roles: user.roles,
                status: user.status,
            },
        };
    }

    /**
     * Map token payload from user (for JWT)
     * @param {Object} user - User document
     * @returns {Object} Token payload
     */
    static toTokenPayload(user) {
        return {
            userId: user._id.toString(),
            roles: user.roles,
            tokenVersion: user.token_version,
        };
    }
}

module.exports = AuthMapper;