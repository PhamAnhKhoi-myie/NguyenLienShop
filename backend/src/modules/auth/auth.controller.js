const asyncHandler = require('../../utils/asyncHandler.util');
const authService = require("./auth.service");
const AuthMapper = require('./auth.mapper');
const AppError = require('../../utils/appError.util');
const { buildAuditMetadata } = require('../../utils/audit.util');

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

const register = asyncHandler(async (req, res) => {
    const metadata = buildAuditMetadata(req);
    const { email, password, full_name } = req.body;

    const result = await authService.register(
        email,
        password,
        full_name,
        metadata
    );

    return res.status(201).json({
        success: true,
        message: "Đăng ký thành công",
        data: result,
    });
});

const login = asyncHandler(async (req, res) => {
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
});

const refresh = asyncHandler(async (req, res) => {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

    if (!refreshToken) {
        throw new AppError(
            'Refresh token không tồn tại',
            401,
            'REFRESH_TOKEN_REQUIRED'
        );
    }

    const userAgent = req.headers["user-agent"] || "";
    const ipAddress = getClientIp(req);

    const result = await authService.refresh(
        refreshToken,
        userAgent,
        ipAddress
    );

    res.cookie(
        REFRESH_COOKIE_NAME,
        result.refreshToken,
        getCookieOptions()
    );

    return res.status(200).json({
        success: true,
        message: "Refresh token thành công",
        data: { accessToken: result.accessToken },
    });
});

const logout = asyncHandler(async (req, res) => {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

    if (refreshToken) {
        try {
            await authService.logout(refreshToken);
        } catch (error) {
            console.warn('[auth.logout] Refresh token revoke skipped', {
                code: error.code,
                name: error.name,
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
});

const changePassword = asyncHandler(async (req, res) => {
    const metadata = buildAuditMetadata(req);
    const { currentPassword, newPassword } = req.body;

    const result = await authService.changePassword(
        req.user.id,
        currentPassword,
        newPassword,
        metadata
    );

    return res.status(200).json({
        success: true,
        message: result.message,
    });
});

const forgotPassword = asyncHandler(async (req, res) => {
    const metadata = buildAuditMetadata(req);
    const { email } = req.body;

    const result = await authService.forgotPassword(
        email,
        metadata
    );

    return res.status(200).json({
        success: true,
        message: result.message
    });
});

const resetPassword = asyncHandler(async (req, res) => {
    const metadata = buildAuditMetadata(req);
    const { email, otp, newPassword } = req.body;

    const result = await authService.resetPassword(
        email,
        otp,
        newPassword,
        metadata
    );

    return res.status(200).json({
        success: true,
        message: result.message
    });
});

module.exports = {
    register,
    login,
    refresh,
    logout,
    changePassword,
    forgotPassword,
    resetPassword
};
