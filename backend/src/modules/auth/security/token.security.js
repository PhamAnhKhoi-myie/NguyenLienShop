const TokenService = require('../security/token.service');
const TokenHash = require('./token.hash');
const AppError = require('../../../utils/appError.util');

class TokenSecurity {
    static async checkReuse(tokenRecord) {
        if (tokenRecord?.replaced_by_jti) {
            throw new AppError('Token reuse detected', 403);
        }
    }

    static async verifyOwnership(decodedJti, userId) {
        const tokenRecord = await TokenService.findByJti(decodedJti);
        if (!tokenRecord || tokenRecord.user_id.toString() !== userId) {
            throw new AppError('Token không thuộc về người dùng', 401, 'INVALID_TOKEN');
        }
        return tokenRecord;
    }

    static async checkVersion(decodedTokenVersion, userTokenVersion) {
        if (decodedTokenVersion !== userTokenVersion) {
            throw new AppError('Token version không khớp', 401, 'TOKEN_VERSION_MISMATCH');
        }
    }

    static async validateAndHashToken(refreshToken, decodedJti, userId) {
        const tokenRecord = await this.verifyOwnership(decodedJti, userId);
        if (!TokenHash.verify(refreshToken, tokenRecord.token_hash)) {
            throw new AppError('Token hash không khớp', 401, 'INVALID_TOKEN');
        }
    }
}

module.exports = TokenSecurity;