



class AuthMapper {






    static toLoginResponse(user, tokens) {
        return {
            accessToken: tokens.accessToken,
            user: {
                id: user.id,
                email: user.email,
                profile: user.profile,
                roles: user.roles,
                status: user.status,
                is_phone_verified: user.is_phone_verified,
                phone_verified_at: user.phone_verified_at,
            },
        };
    }






    static toTokenPayload(user) {
        return {
            userId: user._id.toString(),
            roles: user.roles,
            tokenVersion: user.token_version,
        };
    }
}

module.exports = AuthMapper;
