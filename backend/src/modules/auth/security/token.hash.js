// filepath: e:\MyEffort\NguyenLien\backend\src\modules\auth\security\token.hash.js
const { hashToken } = require('../../../utils/crypto.util');

class TokenHash {
    static hash(refreshToken) {
        return hashToken(refreshToken);
    }

    static verify(incomingToken, storedHash) {
        return hashToken(incomingToken) === storedHash;
    }
}

module.exports = TokenHash;