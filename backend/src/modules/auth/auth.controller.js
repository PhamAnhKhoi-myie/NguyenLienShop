const authService = require("./auth.service");
const { registerSchema, loginSchema } = require("./auth.validator");
const { verifyAccessToken } = require("../../utils/verify.util");
const AuthMapper = require('./auth.mapper');

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
    async register(req, res) {
        try {
            const { email, password, full_name } = registerSchema.parse(req.body);
            const result = await authService.register(email, password, full_name);

            return res.status(201).json({
                success: true,
                message: "Đăng ký thành công",
                data: result,
            });
        } catch (error) {
            const code = error.code || "BAD_REQUEST";
            const map = {
                EMAIL_ALREADY_EXISTS: { status: 409, message: "Email đã tồn tại" },
                BAD_REQUEST: { status: 400, message: error.message || "Dữ liệu không hợp lệ" },
            };
            const normalized = map[code] || { status: 500, message: "Lỗi hệ thống" };

            return res.status(normalized.status).json({
                success: false,
                code,
                message: normalized.message,
            });
        }
    }

    async login(req, res) {
        try {
            const { email, password } = loginSchema.parse(req.body);

            // ✅ FIX #1: Pass individual parameters, not object
            const userAgent = req.headers["user-agent"] || "";
            const ipAddress = getClientIp(req);

            const result = await authService.login(email, password, userAgent, ipAddress);

            res.cookie(REFRESH_COOKIE_NAME, result.tokens.refreshToken, getCookieOptions());

            return res.status(200).json({
                success: true,
                message: "Đăng nhập thành công",
                data: AuthMapper.toLoginResponse(result.user, result.tokens), // Sử dụng mapper
            });

        } catch (error) {
            const code = error.code || "BAD_REQUEST";
            const map = {
                INVALID_CREDENTIALS: { status: 401, message: "Email hoặc mật khẩu không đúng" },
                ACCOUNT_SUSPENDED: { status: 403, message: "Tài khoản bị khóa" },
                ACCOUNT_INACTIVE: { status: 403, message: "Tài khoản không hoạt động" },
                WEAK_PASSWORD: { status: 400, message: error.message },
                DUPLICATE_FIELD: { status: 409, message: error.message },
                BAD_REQUEST: { status: 400, message: error.message || "Dữ liệu không hợp lệ" },
            };
            const normalized = map[code] || { status: 500, message: "Lỗi hệ thống" };

            return res.status(normalized.status).json({
                success: false,
                code,
                message: normalized.message,
            });
        }
    }

    async refresh(req, res) {
        try {
            const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

            if (!refreshToken) {
                return res.status(401).json({
                    success: false,
                    code: "REFRESH_TOKEN_REQUIRED",
                    message: "Thiếu refresh token",
                });
            }

            // ✅ FIX #2: Extract userId from access token in Authorization header
            // OR use a state management for userId. For now, decode from header.
            const authHeader = req.headers.authorization;
            let userId;

            if (authHeader?.startsWith("Bearer ")) {
                try {
                    const token = authHeader.slice(7);
                    const decoded = verifyAccessToken(token);
                    userId = decoded.userId;
                } catch (e) {
                    // If access token invalid, can't refresh (user should login again)
                    return res.status(401).json({
                        success: false,
                        code: "INVALID_ACCESS_TOKEN",
                        message: "Access token invalid - please login again",
                    });
                }
            } else {
                return res.status(401).json({
                    success: false,
                    code: "BEARER_REQUIRED",
                    message: "Access token required in Authorization header",
                });
            }

            const userAgent = req.headers["user-agent"] || "";
            const ipAddress = getClientIp(req);

            const result = await authService.refresh(userId, refreshToken, userAgent, ipAddress);

            res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, getCookieOptions());

            return res.status(200).json({
                success: true,
                message: "Refresh token thành công",
                data: { accessToken: result.accessToken },
            });
        } catch (error) {
            const code = error.code || "INTERNAL_ERROR";
            const map = {
                TOKEN_EXPIRED: { status: 401, message: "Refresh token đã hết hạn" },
                INVALID_TOKEN: { status: 401, message: "Refresh token không hợp lệ" },
                INVALID_REFRESH_TOKEN: { status: 401, message: "Refresh token không hợp lệ" },
                TOKEN_REVOKED: { status: 401, message: "Token bị thu hồi" },
                TOKEN_REUSE_DETECTED: {
                    status: 401,
                    message: "Phát hiện token bị tái sử dụng, vui lòng đăng nhập lại",
                },
                USER_NOT_FOUND: { status: 404, message: "Không tìm thấy người dùng" },
                ACCOUNT_SUSPENDED: { status: 403, message: "Tài khoản bị khóa" },
                ACCOUNT_INACTIVE: { status: 403, message: "Tài khoản không hoạt động" },
                INTERNAL_ERROR: { status: 500, message: "Lỗi hệ thống" },
            };
            const normalized = map[code] || map.INTERNAL_ERROR;

            res.clearCookie(REFRESH_COOKIE_NAME, getCookieOptions());

            return res.status(normalized.status).json({
                success: false,
                code,
                message: normalized.message,
            });
        }
    }

    async logout(req, res) {
        try {
            const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

            // ✅ FIX #3: Extract userId from Authorization header
            const authHeader = req.headers.authorization;
            let userId;

            if (authHeader?.startsWith("Bearer ")) {
                try {
                    const token = authHeader.slice(7);
                    const decoded = verifyAccessToken(token);
                    userId = decoded.userId;
                } catch (e) {
                    // Token invalid but still clear cookie (idempotent)
                    res.clearCookie(REFRESH_COOKIE_NAME, getCookieOptions());
                    return res.status(200).json({
                        success: true,
                        message: "Đăng xuất thành công",
                        data: null,
                    });
                }
            }

            if (refreshToken && userId) {
                // Extract JTI from refresh token (requires decoding without verification)
                // For now, best-effort revoke by userId
                try {
                    const jti = JSON.parse(Buffer.from(refreshToken.split('.')[1], 'base64')).jti;
                    await authService.logout(userId, jti);
                } catch (e) {
                    console.warn("[auth.controller.logout] Could not extract JTI", e.message);
                }
            }

            res.clearCookie(REFRESH_COOKIE_NAME, getCookieOptions());

            return res.status(200).json({
                success: true,
                message: "Đăng xuất thành công",
                data: null,
            });
        } catch (err) {
            console.error("[auth.logout]", err);
            res.clearCookie(REFRESH_COOKIE_NAME, getCookieOptions());

            return res.status(200).json({
                success: true,
                message: "Đăng xuất thành công",
                data: null,
            });
        }
    }
}

module.exports = new AuthController();