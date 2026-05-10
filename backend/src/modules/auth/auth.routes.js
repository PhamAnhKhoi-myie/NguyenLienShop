const express = require("express");

const authController = require("./auth.controller");
const { registerSchema, loginSchema, changePasswordSchema } = require("./auth.validator");

const validate = require("../../middlewares/validate.middleware");
const { authenticate } = require("../../middlewares/auth.middleware");

const router = express.Router();

// ===== PUBLIC =====
router.post(
    "/register",
    validate(registerSchema),
    authController.register
);

router.post(
    "/login",
    validate(loginSchema),
    authController.login
);

router.post(
    "/refresh",
    authController.refresh
);

router.post(
    "/change-password",
    authenticate,
    validate(changePasswordSchema),
    authController.changePassword
);

// ===== AUTHENTICATED =====
router.post(
    "/logout",
    authenticate,
    authController.logout
);

module.exports = router;