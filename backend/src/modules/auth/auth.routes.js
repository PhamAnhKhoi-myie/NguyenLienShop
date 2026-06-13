const express = require("express");

const authController = require("./auth.controller");
const {
    requestRegistrationOtpSchema,
    registerSchema,
    loginSchema,
    changePasswordSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
} = require("./auth.validator");

const validate = require("../../middlewares/validate.middleware");
const { authenticate } = require("../../middlewares/auth.middleware");

const router = express.Router();


router.post(
    "/register/request-otp",
    validate({ body: requestRegistrationOtpSchema }),
    authController.requestRegistrationOtp
);

router.post(
    "/register",
    validate({ body: registerSchema }),
    authController.register
);

router.post(
    "/login",
    validate({ body: loginSchema }),
    authController.login
);

router.post(
    "/refresh",
    authController.refresh
);

router.post(
    "/change-password",
    authenticate,
    validate({ body: changePasswordSchema }),
    authController.changePassword
);

router.post(
    "/forgot-password",
    validate({ body: forgotPasswordSchema }),
    authController.forgotPassword
);

router.post(
    "/reset-password",
    validate({ body: resetPasswordSchema }),
    authController.resetPassword
);

router.post(
    "/logout",
    authController.logout
);

module.exports = router;
