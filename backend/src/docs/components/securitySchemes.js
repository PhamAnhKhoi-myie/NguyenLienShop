module.exports = {
    "bearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT",
        "description": "JWT access token. Header: `Authorization: Bearer <accessToken>`. Chỉ dùng cho các endpoint backend thực sự kiểm tra Bearer (vd. sau khi bạn gắn authMiddleware)."
    },
    "refreshTokenCookie": {
        "type": "apiKey",
        "in": "cookie",
        "name": "refreshToken",
        "description": "Refresh token cookie (httpOnly). Đăng nhập thành công sẽ được server Set-Cookie; Swagger UI → Authorize → nhập giá trị cookie nếu test tay."
    }
};
