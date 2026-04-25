const express = require("express");
const { ZodError } = require("zod");
const authController = require("./auth.controller");
const { registerSchema, loginSchema } = require("./auth.validator");

const router = express.Router();

const validate = (schema) => (req, res, next) => {
    try {
        req.body = schema.parse(req.body || {});
        next();
    } catch (error) {
        if (error instanceof ZodError) {
            return res.status(400).json({
                success: false,
                code: "VALIDATION_ERROR",
                message: error.issues.map((e) => e.message).join("; "),
            });
        }
        return next(error);
    }
};

router.post("/register", validate(registerSchema), authController.register);
router.post("/login", validate(loginSchema), authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);

module.exports = router;