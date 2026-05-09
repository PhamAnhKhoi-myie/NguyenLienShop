const express = require("express");

const userController =
    require("./user.controller");

const {
    updateUserSchema
} = require("./user.validator");

const {
    authorize,
    checkOwnershipOrAdmin
} = require("../../middlewares/authorize.middleware");

const {
    authenticate
} = require("../../middlewares/auth.middleware");

const validate =
    require("../../middlewares/validate.middleware");

const router = express.Router();

// ===== CURRENT USER =====
router.get(
    "/me",
    authenticate,
    userController.getMe
);

// ===== ADMIN ONLY =====
router.get(
    "/",
    authenticate,
    authorize(["ADMIN"]),
    userController.getAllUsers
);

// ===== UPDATE USER =====
router.patch(
    "/:id",
    authenticate,
    checkOwnershipOrAdmin(),
    validate(updateUserSchema),
    userController.updateUser
);

// ===== DELETE USER =====
router.delete(
    "/:id",
    authenticate,
    checkOwnershipOrAdmin(),
    userController.deleteUser
);

// ===== UPDATE ROLE =====
router.patch(
    "/:id/roles",
    authenticate,
    authorize(["ADMIN"]),
    userController.updateUserRoles
);

module.exports = router;