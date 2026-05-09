const express = require("express");

const authController = require("./auth.controller");
const { registerSchema, loginSchema } = require("./auth.validator");

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

// ===== AUTHENTICATED =====
router.post(
    "/logout",
    authenticate,
    authController.logout
);

module.exports = router;