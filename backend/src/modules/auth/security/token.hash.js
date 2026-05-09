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