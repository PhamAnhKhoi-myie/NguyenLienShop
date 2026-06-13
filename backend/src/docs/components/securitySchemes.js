module.exports = {
    "bearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT",
        "description": "JWT access token. Header: `Authorization: Bearer <accessToken>`. Only used for backend endpoints that actually test the Bearer (e.g. after you attach authMiddleware)."
    },
    "refreshTokenCookie": {
        "type": "apiKey",
        "in": "cookie",
        "name": "refreshToken",
        "description": "Refresh token cookie (httpOnly). Successful login will result in Set-Cookie server; Swagger UI → Authorize → enter cookie value if testing manually."
    }
};
