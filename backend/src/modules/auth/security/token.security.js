// filepath: e:\MyEffort\NguyenLien\backend\src\modules\auth\security\token.security.js
const TokenService = require('../security/token.service');
const TokenHash = require('./token.hash');
const AppError = require('../../../utils/appError.util');

class TokenSecurity {
    static async checkReuse(decodedJti) {
        const tokenRecord = await TokenService.findByJti(decodedJti);
        if (tokenRecord?.replaced_by_jti) {
            throw new AppError('TOKEN_REUSE_DETECTED', 'Phát hiện token bị tái sử dụng');
        }
    }

    static async verifyOwnership(decodedJti, userId) {
        const tokenRecord = await TokenService.findByJti(decodedJti);
        if (!tokenRecord || tokenRecord.user_id.toString() !== userId) {
            throw new AppError('INVALID_TOKEN', 'Token không thuộc về người dùng');
        }
        return tokenRecord;
    }

    static async checkVersion(decodedTokenVersion, userTokenVersion) {
        if (decodedTokenVersion !== userTokenVersion) {
            throw new AppError('TOKEN_REVOKED', 'Token version không khớp');
        }
    }

    static async validateAndHashToken(refreshToken, decodedJti, userId) {
        const tokenRecord = await this.verifyOwnership(decodedJti, userId);
        if (!TokenHash.verify(refreshToken, tokenRecord.token_hash)) {
            throw new AppError('INVALID_TOKEN', 'Token hash không khớp');
        }
    }
}

module.exports = TokenSecurity;