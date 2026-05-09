const authService = require("./auth.service");
const { registerSchema, loginSchema } = require("./auth.validator");
const { verifyAccessToken } = require("../../utils/verify.util");
const AuthMapper = require('./auth.mapper');
const AppError = require('../../utils/appError.util');

const REFRESH_COOKIE_NAME = "refreshToken";

const getCookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
});

const getClientIp = (req) =>
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "";

class AuthController {
    async register(req, res, next) {
        try {
            const { email, password, full_name } = req.body;

            const result = await authService.register(
                email,
                password,
                full_name
            );

            return res.status(201).json({
                success: true,
                message: "Đăng ký thành công",
                data: result,
            });

        } catch (error) {
            next(error);
        }
    }

    async login(req, res, next) {
        try {
            const { email, password } = req.body;

            const userAgent = req.headers["user-agent"] || "";
            const ipAddress = getClientIp(req);

            const result = await authService.login(
                email,
                password,
                userAgent,
                ipAddress
            );

            res.cookie(
                REFRESH_COOKIE_NAME,
                result.tokens.refreshToken,
                getCookieOptions()
            );

            return res.status(200).json({
                success: true,
                message: "Đăng nhập thành công",
                data: AuthMapper.toLoginResponse(
                    result.user,
                    result.tokens
                ),
            });

        } catch (error) {
            next(error);
        }
    }

    async refresh(req, res, next) {
        try {
            const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

            if (!refreshToken) {
                throw new AppError('Refresh token không tồn tại', 401, 'REFRESH_TOKEN_REQUIRED');
            }

            const userAgent = req.headers["user-agent"] || "";
            const ipAddress = getClientIp(req);

            const result = await authService.refresh(refreshToken, userAgent, ipAddress);

            res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, getCookieOptions());

            return res.status(200).json({
                success: true,
                message: "Refresh token thành công",
                data: { accessToken: result.accessToken },
            });
        } catch (error) {
            // Xóa cookie nếu có lỗi liên quan đến token
            res.clearCookie(REFRESH_COOKIE_NAME, getCookieOptions());
            next(error);
        }
    }

    async logout(req, res, next) {
        try {
            const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

            if (refreshToken) {
                try {
                    const decoded = verifyRefreshToken(refreshToken);

                    await authService.logout(refreshToken);

                } catch (e) {
                    console.warn("[logout]", {
                        message: e.message,
                        code: e.code,
                    });
                }
            }

            res.clearCookie(
                REFRESH_COOKIE_NAME,
                getCookieOptions()
            );

            return res.status(200).json({
                success: true,
                message: "Đăng xuất thành công",
                data: null,
            });

        } catch (err) {
            next(err);
        }
    }
}

module.exports = new AuthController();